import assert from "node:assert/strict";
import { createHash, webcrypto } from "node:crypto";
import test from "node:test";
import vm from "node:vm";
import { renderAuthenticationMethod } from "../_11ty/authentication.js";

const siteUrl = "https://emp.test/blog/";
const options = {
    clientId: "public-client",
    scopes: ["read_user"],
    origin: "https://gitlab.com",
};
const pendingKey = "emp.gitlab.pending";
const sessionKey = "emp.gitlab.session";
const config = JSON.stringify([options.origin, options.clientId, siteUrl, "read_user"]);
const plain = value => JSON.parse(JSON.stringify(value));

function storage() {
    const values = new Map();
    return {
        getItem: key => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, String(value)),
        removeItem: key => values.delete(key),
    };
}

async function harness(fetchHandler = () => { throw new Error("Unexpected network request"); }, shared = {}, methodOptions = options) {
    const localStorage = shared.localStorage ?? storage();
    const sessionStorage = shared.sessionStorage ?? storage();
    const location = {
        href: "https://emp.test/blog/",
        origin: "https://emp.test",
        pathname: "/blog/",
        navigated: null,
        assign(url) { this.navigated = url; },
        replace(url) { this.navigated = url; },
    };
    const history = {
        replaceState(_state, _title, path) {
            location.href = new URL(path, location.origin).href;
            location.pathname = new URL(location.href).pathname;
        },
    };
    const context = {
        localStorage, sessionStorage, location, history, fetch: fetchHandler,
        crypto: webcrypto, URL, URLSearchParams, Uint8Array, TextEncoder, btoa,
        navigator: shared.navigator ?? { locks: { request: (_name, callback) => callback() } },
    };
    const source = await renderAuthenticationMethod({ method: "gitlab", options: methodOptions }, siteUrl);
    vm.runInNewContext(`${source}\nglobalThis.selectedAuthentication = authentication;`, context);
    return {
        authentication: context.selectedAuthentication,
        localStorage, sessionStorage, location,
        callback(search) {
            location.href = `${siteUrl}${search}`;
            location.pathname = "/blog/";
        },
    };
}

const ok = body => ({ ok: true, status: 200, json: async () => body });
const fail = status => ({ ok: false, status, json: async () => ({}) });

async function start(h) {
    await h.authentication.signIn();
    const authorize = new URL(h.location.navigated);
    const pending = JSON.parse(h.sessionStorage.getItem(pendingKey));
    return { authorize, pending };
}

test("GitLab sign-in binds state and S256 PKCE, then exchanges directly and returns the provider identity", async () => {
    const calls = [];
    const h = await harness(async (url, init) => {
        calls.push({ url, init, callbackUrl: h.location.href });
        if (url.endsWith("/oauth/token")) return ok({ access_token: "access-1", refresh_token: "refresh-1", token_type: "bearer", expires_in: 3600 });
        if (url.endsWith("/api/v4/user")) return ok({ id: 42, username: "beru", name: "Beru Example" });
        throw new Error("Unexpected URL");
    });
    h.localStorage.setItem("unrelated", "preserve");
    const { authorize, pending } = await start(h);
    assert.equal(authorize.origin, "https://gitlab.com");
    assert.equal(authorize.pathname, "/oauth/authorize");
    assert.equal(authorize.searchParams.get("client_id"), options.clientId);
    assert.equal(authorize.searchParams.get("redirect_uri"), siteUrl);
    assert.equal(authorize.searchParams.get("response_type"), "code");
    assert.equal(authorize.searchParams.get("scope"), "read_user");
    assert.equal(authorize.searchParams.get("code_challenge_method"), "S256");
    assert.equal(authorize.searchParams.has("client_secret"), false);
    assert.equal(pending.state, authorize.searchParams.get("state"));
    assert.match(pending.verifier, /^[A-Za-z0-9._~-]{43,128}$/);
    assert.notEqual(pending.state, pending.verifier);
    const challenge = createHash("sha256").update(pending.verifier).digest("base64url");
    assert.equal(authorize.searchParams.get("code_challenge"), challenge);

    h.callback(`?code=authorization-code&state=${pending.state}`);
    assert.deepEqual(plain(await h.authentication.restore()), { id: "42", name: "Beru Example" });
    assert.equal(calls[0].callbackUrl, siteUrl);
    assert.equal(calls[0].url, "https://gitlab.com/oauth/token");
    assert.equal(calls[0].init.method, "POST");
    assert.equal(calls[0].init.cache, "no-store");
    assert.equal(calls[0].init.body.get("grant_type"), "authorization_code");
    assert.equal(calls[0].init.body.get("code"), "authorization-code");
    assert.equal(calls[0].init.body.get("code_verifier"), pending.verifier);
    assert.equal(calls[0].init.body.get("redirect_uri"), siteUrl);
    assert.equal(calls[0].init.body.has("client_secret"), false);
    assert.equal(calls[1].url, "https://gitlab.com/api/v4/user");
    assert.equal(calls[1].init.headers.Authorization, "Bearer access-1");
    const session = JSON.parse(h.localStorage.getItem(sessionKey));
    assert.equal(session.refreshToken, "refresh-1");
    assert.ok(session.expiresAt > Date.now());
    assert.equal(h.localStorage.getItem("unrelated"), "preserve");
});

test("GitLab rejects mismatched or expired state before exchange and returns to the starting page", async () => {
    const returnTo = "https://emp.test/blog/post/?view=full#content";
    for (const state of ["mismatch", "expired"]) {
        let calls = 0;
        const h = await harness(() => { calls++; throw new Error("No exchange allowed"); });
        h.location.href = returnTo;
        const { pending } = await start(h);
        if (state === "expired") {
            pending.createdAt -= 11 * 60 * 1000;
            h.sessionStorage.setItem(pendingKey, JSON.stringify(pending));
        }
        const query = `?code=code&state=${state === "mismatch" ? "other" : pending.state}`;
        h.callback(query);
        await assert.rejects(h.authentication.restore());
        assert.equal(calls, 0);
        assert.equal(h.location.navigated, returnTo);
    }
});

test("Cancellation and request failures return to the starting page with a one-use error", async () => {
    const returnTo = "https://emp.test/blog/advanced-setup/?x=a%2Bb#gitlab-sign-in";
    for (const failure of ["cancelled", "exchange", "profile"]) {
        let calls = 0;
        const h = await harness(async url => {
            calls++;
            if (failure === "exchange") throw new TypeError("Network unavailable");
            return url.endsWith("/oauth/token")
                ? ok({ access_token: "access", refresh_token: "refresh", token_type: "bearer", expires_in: 3600 })
                : fail(503);
        });
        h.location.href = returnTo;
        const { pending } = await start(h);
        h.callback(`?${failure === "cancelled" ? "error=access_denied" : "code=code"}&state=${pending.state}`);
        await assert.rejects(h.authentication.restore());
        if (failure === "cancelled") assert.equal(calls, 0);
        assert.equal(h.location.navigated, returnTo);
        assert.equal(h.localStorage.getItem(sessionKey), null);

        const destination = await harness(undefined, { sessionStorage: h.sessionStorage });
        destination.location.href = returnTo;
        assert.equal(await destination.authentication.restore(), null);
        assert.equal(destination.authentication.error, true);
        assert.equal(await destination.authentication.restore(), null);
        assert.equal(destination.authentication.error, false);
        assert.equal(destination.location.navigated, null);
    }
});

test("GitLab restore validates profile, persists rotated tokens and local sign-out clears only its own state", async () => {
    const calls = [];
    const h = await harness(async (url, init) => {
        calls.push({ url, init });
        if (url.endsWith("/oauth/token")) return ok({ access_token: "access-2", refresh_token: "refresh-2", token_type: "bearer", expires_in: 7200 });
        return ok({ id: 43, username: "newname" });
    });
    h.localStorage.setItem(sessionKey, JSON.stringify({
        accessToken: "access-1", refreshToken: "refresh-1", expiresAt: Date.now() - 1,
        config,
    }));
    h.localStorage.setItem("unrelated", "preserve");
    assert.deepEqual(plain(await h.authentication.restore()), { id: "43", name: "newname" });
    assert.equal(calls[0].url, "https://gitlab.com/oauth/token");
    assert.equal(calls[0].init.body.get("grant_type"), "refresh_token");
    assert.equal(calls[0].init.body.get("refresh_token"), "refresh-1");
    assert.equal(calls[0].init.body.get("redirect_uri"), siteUrl);
    assert.equal(calls[1].init.headers.Authorization, "Bearer access-2");
    const session = JSON.parse(h.localStorage.getItem(sessionKey));
    assert.equal(session.accessToken, "access-2");
    assert.equal(session.refreshToken, "refresh-2");
    assert.deepEqual(plain(await h.authentication.restore()), { id: "43", name: "newname" });
    await h.authentication.signOut();
    assert.equal(h.localStorage.getItem(sessionKey), null);
    assert.equal(h.localStorage.getItem("unrelated"), "preserve");
    assert.equal(await h.authentication.restore(), null);
});

test("GitLab rejected refresh clears invalid session, while transport failure retains rotated tokens for retry", async () => {
    const makeSession = () => ({
        accessToken: "expired", refreshToken: "old-refresh", expiresAt: Date.now() - 1,
        config,
    });
    const invalid = await harness(async () => fail(400));
    invalid.localStorage.setItem(sessionKey, JSON.stringify(makeSession()));
    assert.equal(await invalid.authentication.restore(), null);
    assert.equal(invalid.localStorage.getItem(sessionKey), null);

    const offline = await harness(async url => {
        if (url.endsWith("/oauth/token")) return ok({ access_token: "new-access", refresh_token: "new-refresh", token_type: "bearer", expires_in: 3600 });
        throw new TypeError("Network unavailable");
    });
    offline.localStorage.setItem(sessionKey, JSON.stringify(makeSession()));
    await assert.rejects(offline.authentication.restore());
    const rotated = JSON.parse(offline.localStorage.getItem(sessionKey));
    assert.equal(rotated.refreshToken, "new-refresh");
    assert.equal(rotated.accessToken, "new-access");
});

test("Web Locks prevents two tabs from spending the same one-use refresh token", async () => {
    const localStorage = storage();
    const tails = new Map();
    const navigator = { locks: { request(name, callback) {
        const current = (tails.get(name) ?? Promise.resolve()).then(callback);
        tails.set(name, current.catch(() => {}));
        return current;
    } } };
    let exchanges = 0;
    const fetchHandler = async url => {
        if (url.endsWith("/oauth/token")) {
            exchanges++;
            if (exchanges > 1) return fail(400);
            return ok({ access_token: "new", refresh_token: "new-refresh", token_type: "bearer", expires_in: 3600 });
        }
        return ok({ id: 1, name: "Current" });
    };
    const a = await harness(fetchHandler, { localStorage, navigator });
    const b = await harness(fetchHandler, { localStorage, navigator });
    localStorage.setItem(sessionKey, JSON.stringify({
        accessToken: "old", refreshToken: "old-refresh", expiresAt: Date.now() - 1,
        config,
    }));
    const [aUser, bUser] = await Promise.all([a.authentication.restore(), b.authentication.restore()]);
    assert.deepEqual(plain(aUser), { id: "1", name: "Current" });
    assert.deepEqual(plain(bUser), { id: "1", name: "Current" });
    assert.equal(exchanges, 1);
    assert.equal(JSON.parse(localStorage.getItem(sessionKey)).refreshToken, "new-refresh");
});

test("A cross-tab sign-out during refresh does not resurrect the session", async () => {
    const localStorage = storage();
    let release;
    let started;
    const requested = new Promise(resolve => { started = resolve; });
    const response = new Promise(resolve => { release = resolve; });
    const fetchHandler = async url => {
        if (url.endsWith("/oauth/token")) {
            started();
            await response;
            return ok({ access_token: "new", refresh_token: "new-refresh", token_type: "bearer", expires_in: 3600 });
        }
        return ok({ id: 1, name: "Current" });
    };
    const a = await harness(fetchHandler, { localStorage });
    const b = await harness(fetchHandler, { localStorage });
    localStorage.setItem(sessionKey, JSON.stringify({
        accessToken: "old", refreshToken: "old-refresh", expiresAt: Date.now() - 1,
        config,
    }));
    const restoring = a.authentication.restore();
    await requested;
    await b.authentication.signOut();
    release();
    assert.equal(await restoring, null);
    assert.equal(localStorage.getItem(sessionKey), null);
});

test("A later sign-out prevents an in-flight callback from restoring the old login", async () => {
    const localStorage = storage();
    let release;
    let started;
    const requested = new Promise(resolve => { started = resolve; });
    const response = new Promise(resolve => { release = resolve; });
    const callback = await harness(async url => {
        if (url.endsWith("/oauth/token")) {
            started();
            await response;
            return ok({ access_token: "new", refresh_token: "new-refresh", token_type: "bearer", expires_in: 3600 });
        }
        return ok({ id: 2, name: "New user" });
    }, { localStorage });
    const otherTab = await harness(undefined, { localStorage });
    const { pending } = await start(callback);
    localStorage.setItem(sessionKey, JSON.stringify({ accessToken: "old", refreshToken: "old-refresh", expiresAt: Date.now() + 3600000, config }));
    callback.callback(`?code=code&state=${pending.state}`);
    const restoring = callback.authentication.restore();
    await requested;
    await otherTab.authentication.signOut();
    release();
    assert.equal(await restoring, null);
    assert.equal(localStorage.getItem(sessionKey), null);
});

test("A replacement login survives an older in-flight callback", async () => {
    const localStorage = storage();
    let release;
    let started;
    const requested = new Promise(resolve => { started = resolve; });
    const response = new Promise(resolve => { release = resolve; });
    const callback = await harness(async url => {
        if (url.endsWith("/oauth/token")) return ok({ access_token: "callback", refresh_token: "callback-refresh", token_type: "bearer", expires_in: 3600 });
        started();
        await response;
        return ok({ id: 2, name: "Callback user" });
    }, { localStorage });
    const { pending } = await start(callback);
    localStorage.setItem(sessionKey, JSON.stringify({ accessToken: "old", refreshToken: "old-refresh", expiresAt: Date.now() + 3600000, config }));
    callback.callback(`?code=code&state=${pending.state}`);
    const restoring = callback.authentication.restore();
    await requested;
    const replacement = JSON.stringify({ accessToken: "replacement", refreshToken: "replacement-refresh", expiresAt: Date.now() + 3600000, config });
    localStorage.setItem(sessionKey, replacement);
    release();
    assert.equal(await restoring, null);
    assert.equal(localStorage.getItem(sessionKey), replacement);
});

test("An unusable GitLab profile cannot restore a stale identity", async () => {
    const h = await harness(async () => ok({}));
    h.localStorage.setItem(sessionKey, JSON.stringify({
        accessToken: "access", refreshToken: "refresh", expiresAt: Date.now() + 3600000,
        config,
    }));
    assert.equal(await h.authentication.restore(), null);
    assert.equal(h.localStorage.getItem(sessionKey), null);
});

test("Changing requested scopes discards tokens granted only the old scopes", async () => {
    const localStorage = storage();
    const { pending } = await start(await harness());
    localStorage.setItem(sessionKey, JSON.stringify({
        accessToken: "read-user-only", refreshToken: "old-refresh", expiresAt: Date.now() + 3600000,
        config: pending.config,
    }));
    let requests = 0;
    const updated = await harness(() => { requests++; throw new Error("Old token must not be used"); },
        { localStorage }, { ...options, scopes: ["read_user", "api"] });
    assert.equal(await updated.authentication.restore(), null);
    assert.equal(localStorage.getItem(sessionKey), null);
    assert.equal(requests, 0);
    const { authorize } = await start(updated);
    assert.equal(authorize.searchParams.get("scope"), "read_user api");
});

test("Rejected credentials end the session, while permission denials and outages retain it", async () => {
    for (const status of [401, 403, 503]) {
        let requests = 0;
        const h = await harness(async url => {
            assert.equal(url, "https://gitlab.com/api/v4/user");
            requests++;
            return fail(status);
        });
        const stored = JSON.stringify({ accessToken: "token", refreshToken: "refresh", expiresAt: Date.now() + 3600000, config });
        h.localStorage.setItem(sessionKey, stored);
        if (status === 403 || status === 503) {
            await assert.rejects(h.authentication.restore(), /GitLab request failed/);
            assert.equal(h.localStorage.getItem(sessionKey), stored);
        } else {
            assert.equal(await h.authentication.restore(), null);
            assert.equal(h.localStorage.getItem(sessionKey), null);
        }
        assert.equal(requests, 1);
    }
});

test("A sign-out while fetching a profile cannot restore the displayed identity", async () => {
    let release;
    const response = new Promise(resolve => { release = resolve; });
    const h = await harness(async () => response);
    h.localStorage.setItem(sessionKey, JSON.stringify({ accessToken: "token", refreshToken: "refresh", expiresAt: Date.now() + 3600000, config }));
    const restoring = h.authentication.restore();
    await h.authentication.signOut();
    release(ok({ id: 1, name: "Old identity" }));
    assert.equal(await restoring, null);
    assert.equal(h.localStorage.getItem(sessionKey), null);
});

test("Sign-in restores the exact originating URL, including ordinary code/state queries", async () => {
    for (const returnTo of [
        "https://emp.test/blog/advanced-setup/?mode=edit&x=%2F#gitlab-sign-in",
        "https://emp.test/blog/?code=sample&state=example#posts",
        "https://emp.test/blog/?error=example&state=example#posts",
    ]) {
        const h = await harness(async url => url.endsWith("/oauth/token")
            ? ok({ access_token: "access", refresh_token: "refresh", token_type: "bearer", expires_in: 3600 })
            : ok({ id: 1, name: "Signed in" }));
        h.location.href = returnTo;
        h.location.pathname = new URL(returnTo).pathname;
        const { pending } = await start(h);
        assert.equal(await h.authentication.restore(), null);
        assert.equal(h.location.href, returnTo);
        assert.equal(h.sessionStorage.getItem(pendingKey) !== null, true);
        h.location.navigated = null;
        h.callback(`?code=code&state=${pending.state}`);
        assert.equal((await h.authentication.restore()).name, "Signed in");
        assert.equal(h.location.navigated, returnTo);
        h.location.href = returnTo;
        h.location.pathname = new URL(returnTo).pathname;
        h.location.navigated = null;
        assert.equal((await h.authentication.restore()).name, "Signed in");
        assert.equal(h.location.href, returnTo);
        assert.equal(h.location.navigated, null);
        assert.equal(h.authentication.error, false);
    }
});

test("Normal page queries are not consumed as callbacks, even with a pending login", async () => {
    for (const url of ["https://emp.test/blog/?code=sample#demo", "https://emp.test/blog/?error=example", "https://emp.test/blog/?state=example", "https://emp.test/blog/post/?code=sample&state=example#demo"]) {
        const h = await harness();
        await start(h);
        const pending = h.sessionStorage.getItem(pendingKey);
        h.location.href = url;
        h.location.pathname = new URL(url).pathname;
        assert.equal(await h.authentication.restore(), null);
        assert.equal(h.location.href, url);
        assert.equal(h.sessionStorage.getItem(pendingKey), pending);
    }
});

test("Unsafe or missing return URLs use the homepage without preventing valid authentication", async () => {
    for (const returnTo of [undefined, "https://elsewhere.test/"]) {
        const h = await harness(async url => url.endsWith("/oauth/token")
            ? ok({ access_token: "access", refresh_token: "refresh", token_type: "bearer", expires_in: 3600 })
            : ok({ id: 1, name: "Signed in" }));
        const { pending } = await start(h);
        h.sessionStorage.setItem(pendingKey, JSON.stringify({ ...pending, returnTo }));
        h.callback(`?code=code&state=${pending.state}`);
        assert.equal((await h.authentication.restore()).name, "Signed in");
        assert.equal(h.location.navigated, siteUrl);
    }
});

test("Replaying an OAuth callback without pending state leaves the URL and session alone", async () => {
    let exchanges = 0;
    const h = await harness(async url => {
        if (url.endsWith("/oauth/token")) {
            exchanges++;
            return ok({ access_token: "access", refresh_token: "refresh", token_type: "bearer", expires_in: 3600 });
        }
        return ok({ id: 1, name: "Signed in" });
    });
    const { pending } = await start(h);
    const query = `?code=code&state=${pending.state}`;
    h.callback(query);
    await h.authentication.restore();
    const session = h.localStorage.getItem(sessionKey);
    h.callback(query);
    h.location.navigated = null;
    assert.equal((await h.authentication.restore()).name, "Signed in");
    assert.equal(exchanges, 1);
    assert.equal(h.localStorage.getItem(sessionKey), session);
    assert.equal(h.location.href, `${siteUrl}${query}`);
    assert.equal(h.location.navigated, null);
    assert.equal(h.authentication.error, false);
});

test("A failed new sign-in preserves an existing session and restores its identity alongside the error", async () => {
    const h = await harness(async url => url.endsWith("/oauth/token") ? fail(400) : ok({ id: 2, name: "Existing user" }));
    const stored = JSON.stringify({ accessToken: "existing", refreshToken: "existing-refresh", expiresAt: Date.now() + 3600000, config });
    const { pending } = await start(h);
    h.localStorage.setItem(sessionKey, stored);
    h.callback(`?code=invalid-code&state=${pending.state}`);
    await assert.rejects(h.authentication.restore());
    assert.equal(h.localStorage.getItem(sessionKey), stored);
    assert.equal((await h.authentication.restore()).name, "Existing user");
    assert.equal(h.authentication.error, true);
    assert.equal((await h.authentication.restore()).name, "Existing user");
    assert.equal(h.authentication.error, false);
});
