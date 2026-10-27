import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { renderAuthenticationMethod } from "../_11ty/authentication.js";

const siteUrl = "https://emp.test/blog/";
const userKey = "sveltia-cms.user";
const metadataKey = "emp.cms.session";
const contextSource = await readFile(new URL("../extensions/plugins/sveltia-cms/context.js", import.meta.url), "utf8");
const adapterSource = await readFile(new URL("../extensions/plugins/sveltia-cms/browser.js", import.meta.url), "utf8");
const plain = value => JSON.parse(JSON.stringify(value));
const ok = value => ({ ok: true, status: 200, json: async () => value });
const fail = status => ({ ok: false, status, json: async () => ({}) });
const user = { id: "42", name: "Author" };
const profile = { id: 42, name: "Author", username: "author", login: "author" };

function storage() {
    const values = new Map();
    return {
        getItem: key => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, String(value)),
        removeItem: key => values.delete(key),
    };
}

function sharedBrowser() {
    const states = new Map();
    const names = [];
    const drain = state => {
        while (state.queue.length) {
            const next = state.queue[0];
            if (state.holders.some(mode => mode === "exclusive") ||
                (next.mode === "exclusive" && state.holders.length)) return;
            state.queue.shift();
            state.holders.push(next.mode);
            const release = () => {
                state.holders.splice(state.holders.indexOf(next.mode), 1);
                drain(state);
            };
            Promise.resolve().then(() => next.callback({ name: next.name, mode: next.mode }))
                .then(value => { release(); next.resolve(value); }, error => { release(); next.reject(error); });
            if (next.mode === "exclusive") return;
        }
    };
    return {
        localStorage: storage(), names,
        navigator: { locks: { request(name, options, callback) {
            if (typeof options === "function") { callback = options; options = {}; }
            names.push(name);
            const state = states.get(name) ?? { holders: [], queue: [] };
            states.set(name, state);
            const mode = options.mode ?? "exclusive";
            const unavailable = state.queue.length || state.holders.some(held => held === "exclusive") ||
                (mode === "exclusive" && state.holders.length);
            if (options.ifAvailable && unavailable) return Promise.resolve().then(() => callback(null));
            return new Promise((resolve, reject) => {
                state.queue.push({ name, mode, callback, resolve, reject });
                drain(state);
            });
        } } },
    };
}

async function browser(method = "gitlab", { shared = sharedBrowser(), respond = () => ok(profile), changes = {} } = {}) {
    const options = method === "gitlab"
        ? { clientId: "public-client", origin: "https://gitlab.com", ...changes.options }
        : { clientId: "public-client", ...changes.options };
    const source = await renderAuthenticationMethod({ method, options }, siteUrl);
    const calls = [];
    const listeners = new Map();
    const location = {
        href: siteUrl, origin: new URL(siteUrl).origin,
        assign() { throw new Error("A restored EMP session must not start another OAuth login"); },
        replace() {},
    };
    const context = {
        localStorage: shared.localStorage, sessionStorage: storage(), location,
        navigator: shared.navigator, crypto: webcrypto, URL, URLSearchParams, Uint8Array, TextEncoder, btoa, AbortSignal,
        history: { replaceState() {} }, window: { addEventListener(name, callback) {
            listeners.set(name, [...(listeners.get(name) ?? []), callback]);
        } },
        fetch: async (url, init) => { calls.push({ url, init }); return respond(url, init); },
        cmsOptions: {
            backendName: method, origin: method === "gitlab" ? options.origin : "https://github.com",
            clientId: options.clientId, siteUrl, repo: "publisher/site", branch: "content", ...changes.cms,
        },
    };
    vm.runInNewContext(`${source}\ncmsOptions.scopes = authenticationOptions.scopes;\n${contextSource}\n${adapterSource}\nauthentication.useSessionStorage(cmsSession);\nglobalThis.selected = { authentication, cmsSession, authenticationOptions };`, context);
    const rendered = context.selected.authenticationOptions;
    const scope = Array.isArray(rendered.scopes) ? rendered.scopes.join(" ") : rendered.scopes;
    const config = JSON.stringify(method === "gitlab"
        ? [rendered.origin, rendered.clientId, rendered.redirectUri, scope]
        : [rendered.clientId, rendered.redirectUri, rendered.exchangeUrl, scope]);
    return {
        auth: context.selected.authentication, store: context.selected.cmsSession, calls, shared,
        async callback() {
            location.assign = () => {};
            await this.auth.signIn();
            const pending = JSON.parse(context.sessionStorage.getItem(`emp.${method}.pending`));
            location.href = `${siteUrl}?code=code&state=${pending.state}`;
            return this.auth.restore();
        },
        observe: callback => context.selected.cmsSession.onChange(callback),
        storageEvent: key => listeners.get("storage")?.forEach(callback => callback({ key })),
        pagehide: () => listeners.get("pagehide")?.forEach(callback => callback({})),
        seed({ accessToken = "old-access", refreshToken = "old-refresh", expiresAt = Date.now() + 3600000, ...extra } = {}) {
            const session = { accessToken, expiresAt, config, ...extra };
            if (method === "gitlab") session.refreshToken = refreshToken;
            shared.localStorage.setItem(`emp.${method}.session`, JSON.stringify(session));
        },
        cached: () => JSON.parse(shared.localStorage.getItem(userKey)),
        metadata: () => JSON.parse(shared.localStorage.getItem(metadataKey)),
    };
}

// Exercise the real rendered provider and adapter together. Only browser storage,
// its origin-wide lock, and provider HTTP transport are simulated: these protect
// the single-session credential ownership and one-use refresh-token requirements.
for (const method of ["gitlab", "github"]) {
    test(`${method}: a validated existing EMP login migrates to the only credential cache`, async () => {
        const h = await browser(method);
        h.seed({ user });
        h.shared.localStorage.setItem("unrelated", "preserve");
        assert.deepEqual(plain(await h.auth.restore()), user);
        assert.equal(h.shared.localStorage.getItem(`emp.${method}.session`), null);
        assert.equal(h.cached().token, "old-access");
        assert.equal(h.cached().id, 42, "stock CMS compares numeric provider IDs");
        assert.equal(h.cached().backendName, method);
        const metadata = h.metadata();
        assert(!JSON.stringify(metadata).includes("old-access"));
        assert(!JSON.stringify(metadata).includes("old-refresh"));
        for (const binding of [method, method === "gitlab" ? "https://gitlab.com" : "https://github.com", "public-client", siteUrl, "publisher/site", "content"]) {
            assert(metadata.context.includes(binding), `missing session binding: ${binding}`);
        }
        assert.deepEqual(metadata.session.user, user);
        assert.equal(h.shared.localStorage.getItem("unrelated"), "preserve");
        assert(h.calls.every(({ url }) => url.endsWith("/user")), "migration verifies identity without another OAuth exchange");
    });

    test(`${method}: migration cannot publish a token before the provider validates it`, async () => {
        let release;
        let started;
        const requested = new Promise(resolve => { started = resolve; });
        const h = await browser(method, { respond: () => { started(); return new Promise(resolve => { release = resolve; }); } });
        h.seed();
        const restoring = h.auth.restore();
        await requested;
        assert.equal(h.cached(), null);
        assert.equal(h.metadata(), null);
        release(fail(403));
        await assert.rejects(restoring);
        assert.equal(h.cached(), null);
        assert.notEqual(h.shared.localStorage.getItem(`emp.${method}.session`), null);
    });

    test(`${method}: a profile lookup denial preserves the shared login for retry`, async () => {
        let denied = false;
        const h = await browser(method, { respond: () => denied ? fail(403) : ok(profile) });
        h.seed();
        await h.auth.restore();
        const cached = h.shared.localStorage.getItem(userKey);
        const account = h.metadata().accountId;
        denied = true;
        await assert.rejects(h.auth.restore());
        assert.equal(h.shared.localStorage.getItem(userKey), cached);
        assert.equal(h.metadata().accountId, account);
        assert.equal(h.auth.cached(), null, "failed lookup clears only the EMP display cache");
        assert.equal(h.store.isCurrent(user.id), true, "the editor retains its verified account binding");
        denied = false;
        assert.deepEqual(plain(await h.auth.restore()), user, "retry restores the display without another login");
        assert(h.calls.every(({ url }) => url.endsWith("/user")), "403 is not a reason to rotate credentials");
    });

    test(`${method}: CMS logout or EMP signout cannot resurrect an old provider session`, async () => {
        for (const logout of ["cms", "emp"]) {
            const h = await browser(method);
            h.seed();
            await h.auth.restore();
            // An old writer must not turn the migration fallback into a second
            // credential source after the binding has been established.
            h.seed({ accessToken: "stale-copy" });
            if (logout === "cms") h.shared.localStorage.setItem(userKey, "{}");
            else await h.auth.signOut();
            assert.equal(await h.auth.restore(), null);
            assert.equal(h.cached()?.token, undefined);
            assert(h.metadata(), "the binding must remain a non-secret migration tombstone");
        }
    });
}

test("GitLab consumes a CMS-first rotation without spending the new refresh token again", async () => {
    const h = await browser();
    h.seed({ expiresAt: Date.now() - 1 });
    await h.auth.restore();
    h.shared.localStorage.setItem(userKey, JSON.stringify({ ...h.cached(), token: "cms-access", refreshToken: "cms-refresh" }));
    assert.deepEqual(plain(await h.auth.restore()), user);
    assert.equal(h.calls.at(-1).init.headers.Authorization, "Bearer cms-access");
    assert(h.calls.every(({ url }) => url.endsWith("/user")), "unknown CMS expiry must not cause a duplicate rotation");
    assert.equal(h.cached().refreshToken, "cms-refresh");
});

test("two EMP tabs coordinate with the stock CMS lock and rotate GitLab credentials once", async () => {
    const shared = sharedBrowser();
    let expired = false;
    let rotations = 0;
    const respond = async (url, init) => {
        if (url.endsWith("/oauth/token")) {
            rotations++;
            assert.equal(init.body.get("refresh_token"), "old-refresh");
            return ok({ access_token: "new-access", refresh_token: "new-refresh", token_type: "bearer", expires_in: 3600 });
        }
        return expired && init.headers.Authorization === "Bearer old-access" ? fail(401) : ok(profile);
    };
    const a = await browser("gitlab", { shared, respond });
    const b = await browser("gitlab", { shared, respond });
    a.seed();
    await a.auth.restore();
    expired = true;
    const users = await Promise.all([a.auth.restore(), b.auth.restore()]);
    assert.deepEqual(plain(users), [user, user]);
    assert.equal(rotations, 1, "single-use refresh token is spent only once across tabs");
    assert(shared.names.includes("sveltia-cms.token-refresh"));
    assert(shared.names.every(name => ["sveltia-cms.token-refresh", "emp.cms.active"].includes(name)));
    assert.equal(a.cached().token, "new-access");
    assert.equal(a.cached().refreshToken, "new-refresh");
    assert.equal(shared.localStorage.getItem("emp.gitlab.session"), null);
});

test("GitLab rejected refresh invalidates the canonical cache without retaining another token copy", async () => {
    let revoked = false;
    const h = await browser("gitlab", { respond: url => revoked ? fail(url.endsWith("/oauth/token") ? 400 : 401) : ok(profile) });
    h.seed();
    await h.auth.restore();
    revoked = true;
    assert.equal(await h.auth.restore(), null);
    assert.equal(h.cached()?.token, undefined);
    assert.equal(h.shared.localStorage.getItem("emp.gitlab.session"), null);
    assert(h.metadata());
});

test("GitHub expired or revoked credentials require login, never an invented refresh flow", async () => {
    for (const reason of ["expired", "revoked"]) {
        let revoked = false;
        const h = await browser("github", { respond: () => revoked ? fail(401) : ok(profile) });
        h.seed();
        await h.auth.restore();
        if (reason === "expired") {
            const metadata = h.metadata();
            metadata.session.expiresAt = Date.now() - 1;
            h.shared.localStorage.setItem(metadataKey, JSON.stringify(metadata));
        } else revoked = true;
        assert.equal(await h.auth.restore(), null);
        assert.equal(h.cached()?.token, undefined);
        assert(h.calls.every(({ url }) => url === "https://api.github.com/user"));
    }
});

test("shared CMS sessions bind omitted provider defaults and reject changed explicit scopes before transport", async () => {
    for (const method of ["github", "gitlab"]) {
        const initial = await browser(method);
        initial.seed();
        await initial.auth.restore();
        const scopes = method === "github" ? ["read:user"] : "read_user";
        const changed = await browser(method, {
            shared: initial.shared, changes: { options: { scopes } },
            respond: () => { throw new Error("A differently scoped token must not leave storage"); },
        });
        assert.equal(await changed.auth.restore(), null);
        assert.equal(changed.calls.length, 0);
    }
});

test("shared cache is rejected before transport when provider, instance, client, repository or user binding differs", async () => {
    for (const changes of [
        { cms: { origin: "https://gitlab.other.test" }, options: { origin: "https://gitlab.other.test" } },
        { cms: { clientId: "other-client" }, options: { clientId: "other-client" } },
        { cms: { repo: "publisher/other" } },
        { cms: { branch: "other" } },
        { cached: { backendName: "github" } },
        { cached: { id: 99 } },
    ]) {
        const initial = await browser();
        initial.seed();
        await initial.auth.restore();
        if (changes.cached) initial.shared.localStorage.setItem(userKey, JSON.stringify({ ...initial.cached(), ...changes.cached }));
        const h = await browser("gitlab", { shared: initial.shared, changes, respond: () => { throw new Error("Mismatched token must never leave storage"); } });
        assert.equal(await h.auth.restore(), null);
        assert.equal(h.calls.length, 0);
    }
});

test("a signout during the first migration or a later refresh prevents credential resurrection", async () => {
    for (const phase of ["migration", "refresh"]) {
        let held = false;
        let release;
        let started;
        const requested = new Promise(resolve => { started = resolve; });
        const shared = sharedBrowser();
        const a = await browser("gitlab", { shared, respond: (url, init) => {
            if (!held) return ok(profile);
            if (phase === "refresh" && !url.endsWith("/oauth/token")) return fail(401);
            started();
            return new Promise(resolve => { release = resolve; });
        } });
        const b = await browser("gitlab", { shared });
        a.seed();
        if (phase === "refresh") await a.auth.restore();
        held = true;
        const restoring = a.auth.restore();
        await requested;
        await b.auth.signOut();
        release(phase === "migration" ? ok(profile) : ok({ access_token: "late-access", refresh_token: "late-refresh", token_type: "bearer", expires_in: 3600 }));
        assert.equal(await restoring, null);
        assert.equal(a.cached()?.token, undefined);
        assert.equal(shared.localStorage.getItem("emp.gitlab.session"), null);
    }
});


test("CMS logout invalidates the binding before a late CMS refresh can rewrite its cache", async () => {
    const h = await browser();
    h.seed();
    await h.auth.restore();
    const previous = h.cached();
    let changes = 0;
    h.observe(() => { changes++; });
    h.shared.localStorage.setItem(userKey, "{}");
    h.storageEvent(userKey);
    h.shared.localStorage.setItem(userKey, JSON.stringify({ ...previous, token: "late-access", refreshToken: "late-refresh" }));
    h.storageEvent(userKey);
    assert.equal(await h.auth.restore(), null);
    assert.equal(h.metadata().session, null, "cache writes cannot revive an invalidated account binding");
    assert(changes > 0, "the UI must be notified so a live CMS can be unloaded");
});

test("a transient profile failure after GitLab refresh preserves the only usable rotated pair", async () => {
    let stage = "valid";
    const h = await browser("gitlab", { respond: (url, init) => {
        if (stage === "valid") return ok(profile);
        if (url.endsWith("/oauth/token")) return ok({ access_token: "rotated-access", refresh_token: "rotated-refresh", token_type: "bearer", expires_in: 3600 });
        return init.headers.Authorization === "Bearer old-access" ? fail(401) : fail(503);
    } });
    h.seed();
    await h.auth.restore();
    stage = "offline-after-refresh";
    await assert.rejects(h.auth.restore());
    assert.equal(h.cached().token, "rotated-access");
    assert.equal(h.cached().refreshToken, "rotated-refresh");
    assert.equal(h.shared.localStorage.getItem("emp.gitlab.session"), null);
    assert(!JSON.stringify(h.metadata()).includes("rotated-access"));
    stage = "valid";
    assert.deepEqual(plain(await h.auth.restore()), user);
    assert.equal(h.calls.at(-1).init.headers.Authorization, "Bearer rotated-access");
});


test("an active editor excludes incompatible contexts but permits same-context token rotation", async () => {
    const a = await browser();
    a.seed();
    await a.auth.restore();
    let entered;
    const mounted = new Promise(resolve => { entered = resolve; });
    const holding = a.store.hold(() => { entered(); });
    await mounted;
    // The lifetime listener is installed after the mount callback completes.
    await new Promise(setImmediate);
    try {
        const session = JSON.parse(a.store.getItem());
        await a.store.setItem("ignored", JSON.stringify({ ...session, accessToken: "same-context-rotation" }));
        const cached = a.shared.localStorage.getItem(userKey);
        const metadata = a.shared.localStorage.getItem(metadataKey);
        const b = await browser("gitlab", { shared: a.shared, changes: {
            options: { origin: "https://other.gitlab.test" }, cms: { origin: "https://other.gitlab.test" },
        } });
        await assert.rejects(b.store.setItem("ignored", JSON.stringify({ ...session, accessToken: "other-issuer" }), true),
            error => error.code === "CMS_CONTEXT_BUSY");
        assert.equal(a.shared.localStorage.getItem(userKey), cached, "busy refusal must not replace live editor credentials");
        assert.equal(a.shared.localStorage.getItem(metadataKey), metadata);
    } finally {
        a.pagehide();
        assert.equal(await holding, true);
    }
});

test("a context-switch write rejects a changed cache snapshot instead of overwriting newer state", async () => {
    const h = await browser();
    h.seed();
    const original = h.shared.localStorage.getItem("emp.gitlab.session");
    const saving = h.store.setItem("ignored", JSON.stringify({ ...JSON.parse(original), user }), true);
    // Real lock callbacks run asynchronously. A concurrent cache mutation after
    // the request but before its grant must invalidate the captured snapshot.
    h.shared.localStorage.setItem(userKey, JSON.stringify({ token: "newer-context-token" }));
    await assert.rejects(saving, /session changed/);
    assert.equal(h.cached().token, "newer-context-token");
    assert.equal(h.metadata(), null);
    assert.equal(h.shared.localStorage.getItem("emp.gitlab.session"), original);
});

test("expected-account guard rejects an account switch even under the same provider and configuration", async () => {
    const h = await browser();
    h.seed();
    await h.auth.restore();
    assert.equal(h.store.isCurrent(user.id), true);
    const session = JSON.parse(h.store.getItem());
    await h.store.setItem("ignored", JSON.stringify({ ...session, user: { id: "99", name: "Other author" }, accessToken: "other-account" }));
    assert.equal(h.store.isCurrent(user.id), false, "the old editor must unload instead of silently changing author");
    assert.equal(h.store.isCurrent("99"), true);
});

test("unbound stock cache cannot authorize migration from a stale EMP credential copy", async () => {
    const h = await browser("gitlab", { respond: () => { throw new Error("Unbound token must not leave storage"); } });
    h.seed();
    h.shared.localStorage.setItem(userKey, JSON.stringify({ backendName: "gitlab", id: 42, token: "unbound", refreshToken: "unbound-refresh" }));
    assert.equal(await h.auth.restore(), null);
    assert.equal(h.calls.length, 0);
    assert.equal(h.metadata(), null);
    assert.equal(h.cached().token, "unbound");
});

test("pending first-login writes cannot commit after logout or a superseding sign-in", async () => {
    for (const method of ["github", "gitlab"]) for (const action of ["signOut", "signIn"]) {
        const shared = sharedBrowser();
        const request = shared.navigator.locks.request.bind(shared.navigator.locks);
        let entered, release;
        const waiting = new Promise(resolve => { entered = resolve; });
        const grant = new Promise(resolve => { release = resolve; });
        shared.navigator.locks.request = (name, options, callback) => {
            if (name !== "emp.cms.active") return request(name, options, callback);
            entered();
            return grant.then(() => request(name, options, callback));
        };
        const h = await browser(method, { shared, respond: url => ok(url.endsWith("/user") ? profile : {
            access_token: "fresh-access", refresh_token: "fresh-refresh", token_type: "bearer", expires_in: 3600,
        }) });
        const login = h.callback();
        await waiting;
        await h.auth[action]();
        release();
        assert.equal(await login, null);
        assert.equal(h.auth.cached(), null);
        assert.equal(h.cached(), null);
        assert.equal(h.metadata(), null);
    }
});

test("same-context writes tolerate display updates but reject replaced credentials", async () => {
    for (const change of ["display", "token"]) {
        const h = await browser("github");
        h.seed();
        await h.auth.restore();
        const session = JSON.parse(h.store.getItem());
        const saving = h.store.setItem("ignored", JSON.stringify({ ...session, user: { ...user, name: "Fresh name" } }), true);
        h.shared.localStorage.setItem(userKey, JSON.stringify({ ...h.cached(),
            ...(change === "display" ? { name: "Concurrent display" } : { token: "replacement" }),
        }));
        if (change === "token") {
            await assert.rejects(saving, /session changed/);
            assert.equal(h.cached().token, "replacement");
        } else {
            await saving;
            assert.equal(h.auth.cached().name, "Fresh name");
            assert.equal(h.cached().token, "old-access");
        }
    }
});

test("first GitLab rotation stays in the EMP-only session until fresh identity succeeds", async () => {
    let recovered = false;
    const h = await browser("gitlab", { respond: (url, init) => {
        if (url.endsWith("/oauth/token")) return ok({ access_token: "rotated-access", refresh_token: "rotated-refresh", token_type: "bearer", expires_in: 3600 });
        if (init.headers.Authorization === "Bearer old-access") return fail(401);
        return recovered ? ok(profile) : fail(503);
    } });
    h.seed({ user });
    await assert.rejects(h.auth.restore());
    assert.equal(h.cached(), null);
    assert.equal(h.metadata(), null);
    const existing = JSON.parse(h.shared.localStorage.getItem("emp.gitlab.session"));
    assert.equal(existing.accessToken, "rotated-access");
    assert.equal(existing.refreshToken, "rotated-refresh");
    assert.equal(existing.user, undefined);
    recovered = true;
    assert.deepEqual(plain(await h.auth.restore()), user);
    assert.equal(h.cached().token, "rotated-access");
    assert.equal(h.shared.localStorage.getItem("emp.gitlab.session"), null);
});

test("logout supersedes a pending failed-identity display write without stale errors", async () => {
    for (const method of ["github", "gitlab"]) {
        let failed = false;
        const h = await browser(method, { respond: () => failed ? fail(503) : ok(profile) });
        h.seed();
        await h.auth.restore();
        const request = h.shared.navigator.locks.request.bind(h.shared.navigator.locks);
        let entered, release;
        const waiting = new Promise(resolve => { entered = resolve; });
        const grant = new Promise(resolve => { release = resolve; });
        h.shared.navigator.locks.request = (name, options, callback) => {
            if (name !== "emp.cms.active") return request(name, options, callback);
            entered();
            return grant.then(() => request(name, options, callback));
        };
        failed = true;
        const restoring = h.auth.restore();
        await waiting;
        await h.auth.signOut();
        release();
        assert.equal(await restoring, null);
        assert.equal(h.auth.cached(), null);
        assert.equal(h.cached()?.token, undefined);
    }
});
