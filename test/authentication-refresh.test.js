import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import test from "node:test";
import vm from "node:vm";
import { renderAuthenticationMethod } from "../_11ty/authentication.js";

const site = "https://emp.test/blog/";
const plain = value => JSON.parse(JSON.stringify(value));
const storage = () => {
    const data = new Map();
    return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
};
const deferred = () => {
    let resolve;
    const promise = new Promise(done => { resolve = done; });
    return { promise, resolve };
};
// Keyed, abortable queue: a waiting request can time out without releasing its predecessor.
function locks() {
    const tails = new Map();
    return { request(name, { signal }, action) {
        const previous = tails.get(name) ?? Promise.resolve();
        const ready = deferred();
        const abort = () => ready.resolve(false);
        signal.addEventListener("abort", abort, { once: true });
        previous.then(() => ready.resolve(true));
        const result = ready.promise.then(async acquired => {
            signal.removeEventListener("abort", abort);
            if (!acquired || signal.aborted) throw signal.reason;
            return action();
        });
        tails.set(name, Promise.allSettled([previous, result]));
        return result;
    } };
}
async function browser(method, extra = {}) {
    const localStorage = extra.localStorage ?? storage();
    const sessionStorage = storage();
    const key = "emp." + method + ".session";
    const options = { clientId: "client" };
    const source = await renderAuthenticationMethod({ method, options }, site);
    const location = { href: site, origin: "https://emp.test", assign() {}, replace() {} };
    const profile = { id: 42, name: "Fresh name", login: "person", username: "person" };
    const token = { access_token: "rotated", refresh_token: "rotated-refresh", token_type: "bearer", expires_in: 3600 };
    const calls = [];
    const h = {
        localStorage, sessionStorage, location, key, calls, token, profile,
        respond: url => Response.json(url.endsWith("/user") ? profile : token),
        session: {
            accessToken: "old", expiresAt: Date.now() + 3600000,
            ...(method === "gitlab" ? { refreshToken: "refresh" } : {}),
            config: method === "github" ? JSON.stringify(["client", site, site + "api/auth/github/exchange", "repo user"])
                : JSON.stringify(["https://gitlab.com", "client", site, "api"]),
        },
        save(value = h.session) { localStorage.setItem(key, JSON.stringify(value)); },
        saved() { return JSON.parse(localStorage.getItem(key)); },
    };
    const context = {
        localStorage, sessionStorage, location, Date, URL, URLSearchParams, TextEncoder, Uint8Array, btoa,
        crypto: webcrypto, AbortSignal: extra.AbortSignal ?? AbortSignal,
        navigator: { locks: extra.locks ?? locks() },
        history: { replaceState: (_s, _t, value) => { location.href = value; } },
        fetch: (url, init) => { calls.push({ url, init }); return h.respond(url, init); },
    };
    vm.runInNewContext(source + "\nglobalThis.auth = authentication;", context);
    h.auth = context.auth;
    h.callback = async () => {
        await h.auth.signIn();
        const { state } = JSON.parse(sessionStorage.getItem("emp." + method + ".pending"));
        location.href = site + "?code=code&state=" + state;
        return h.auth.restore();
    };
    return h;
}

for (const method of ["github", "gitlab"]) {
    test(method + ": cached display is immediate, credential-bound and updated by live identity", async () => {
        const h = await browser(method);
        h.save();
        assert.equal(h.auth.cached(), null, "Legacy token-only record is accepted without a display");
        await h.auth.restore();
        assert.deepEqual(plain(h.auth.cached()), { id: "42", name: "Fresh name" });
        assert.equal(h.auth.storageKey, h.key);
        const count = h.calls.length;
        h.auth.cached();
        assert.equal(h.calls.length, count, "cached() never performs network work");
        const response = deferred();
        h.respond = () => response.promise;
        const restore = h.auth.restore();
        assert.equal(h.auth.cached().name, "Fresh name");
        response.resolve(Response.json({ ...h.profile, name: "Changed" }));
        await restore;
        assert.equal(h.auth.cached().name, "Changed");
        h.save({ ...h.saved(), config: "another application" });
        assert.equal(h.auth.cached(), null);
        await h.auth.signOut();
        assert.equal(h.auth.cached(), null);
    });

    test(method + ": failed identity lookup removes only the matching display cache", async () => {
        for (const failure of [403, 503, "malformed", "network"]) {
            const h = await browser(method);
            h.save({ ...h.session, user: { id: "42", name: "Cached" } });
            h.respond = () => {
                if (failure === "network") throw new Error("offline");
                return failure === "malformed" ? Response.json({}) : new Response(null, { status: failure });
            };
            await assert.rejects(h.auth.restore());
            assert.deepEqual(h.saved(), h.session);
            assert.equal(h.auth.cached(), null);
        }
    });

    test(method + ": display-only writes do not cancel callbacks or erase current credentials", async () => {
        const h = await browser(method);
        h.save({ ...h.session, user: { id: "42", name: "Before" } });
        const entered = deferred(), response = deferred();
        h.respond = url => {
            if (url.endsWith("/user")) { entered.resolve(); return response.promise; }
            return Response.json(h.token);
        };
        const callback = h.callback();
        await entered.promise;
        h.save({ ...h.session, user: { id: "42", name: "Updated in another tab" } });
        response.resolve(Response.json(h.profile));
        assert.equal((await callback).name, "Fresh name");
        assert.equal(h.saved().accessToken, "rotated");
        assert.equal(h.auth.cached().name, "Fresh name");
    });

    test(method + ": a late failure cannot clear a replacement session's display", async () => {
        const h = await browser(method);
        h.save({ ...h.session, user: { id: "42", name: "Old" } });
        const entered = deferred(), response = deferred();
        h.respond = () => { entered.resolve(); return response.promise; };
        const restore = h.auth.restore();
        await entered.promise;
        const replacement = { ...h.session, accessToken: "replacement", user: { id: "9", name: "New account" } };
        h.save(replacement);
        response.resolve(new Response(null, { status: 503 }));
        assert.equal(await restore, null);
        assert.deepEqual(h.saved(), replacement);
    });

    test(method + ": aborting a stalled lookup clears display but preserves credentials", async () => {
        const h = await browser(method, { AbortSignal: { timeout(ms) {
            assert.equal(ms, 10000);
            return AbortSignal.timeout(20);
        } } });
        h.save({ ...h.session, user: { id: "42", name: "Cached" } });
        h.respond = (_url, { signal }) => new Promise((_resolve, reject) => {
            signal.addEventListener("abort", () => reject(signal.reason), { once: true });
        });
        const alive = setTimeout(() => {}, 1000);
        try { await assert.rejects(h.auth.restore(), { name: "TimeoutError" }); }
        finally { clearTimeout(alive); }
        assert.deepEqual(h.saved(), h.session);
    });
}

test("GitLab: unexpected access-token rejection refreshes once, persists rotation, then retries identity", async () => {
    for (const retryStatus of [200, 401, 503]) {
        const h = await browser("gitlab");
        h.save({ ...h.session, user: { id: "42", name: "Cached" } });
        let profiles = 0;
        h.respond = url => {
            if (!url.endsWith("/user")) return Response.json(h.token);
            ++profiles;
            return profiles === 1 ? new Response(null, { status: 401 }) :
                retryStatus === 200 ? Response.json(h.profile) : new Response(null, { status: retryStatus });
        };
        if (retryStatus === 503) await assert.rejects(h.auth.restore());
        else assert.equal((await h.auth.restore())?.name ?? null, retryStatus === 200 ? "Fresh name" : null);
        assert.equal(h.calls.filter(call => call.init.body?.get("grant_type") === "refresh_token").length, 1);
        assert.equal(profiles, 2);
        if (retryStatus === 401) assert.equal(h.saved(), null);
        else {
            assert.equal(h.saved().refreshToken, "rotated-refresh");
            assert.equal(h.auth.cached()?.name ?? null, retryStatus === 200 ? "Fresh name" : null);
        }
    }
});

test("GitLab: callback queued behind a rotation still commits the deliberate new login", async () => {
    const shared = { localStorage: storage(), locks: locks() };
    const old = await browser("gitlab", shared), next = await browser("gitlab", shared);
    old.save({ ...old.session, expiresAt: Date.now() - 1 });
    const entered = deferred(), release = deferred();
    old.respond = async url => {
        if (url.endsWith("/user")) return Response.json(old.profile);
        entered.resolve();
        await release.promise;
        return Response.json(old.token);
    };
    next.respond = url => Response.json(url.endsWith("/user") ? { ...next.profile, name: "New login" } :
        { ...next.token, access_token: "new-login", refresh_token: "new-login-refresh" });
    const restoring = old.auth.restore();
    await entered.promise;
    const callback = next.callback();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(next.calls.length, 0, "Callback exchange waits for the shared lock");
    release.resolve();
    await restoring;
    assert.equal((await callback).name, "New login");
    assert.equal(next.saved().accessToken, "new-login");
});

test("GitLab: accepted rotation survives a superseding sign-in that can still be cancelled", async () => {
    const h = await browser("gitlab");
    h.save({ ...h.session, expiresAt: Date.now() - 1 });
    const entered = deferred(), release = deferred();
    h.respond = async () => { entered.resolve(); await release.promise; return Response.json(h.token); };
    const restoring = h.auth.restore();
    await entered.promise;
    await h.auth.signIn();
    release.resolve();
    assert.equal(await restoring, null);
    assert.equal(h.saved().refreshToken, "rotated-refresh");
});

test("GitLab: a lock-acquisition timeout removes display without deleting or spending the token", async () => {
    const sharedLocks = locks();
    const held = deferred(), entered = deferred();
    const blocker = sharedLocks.request("emp.gitlab.session", { signal: new AbortController().signal }, async () => {
        entered.resolve(); await held.promise;
    });
    await entered.promise;
    const h = await browser("gitlab", { locks: sharedLocks, AbortSignal: { timeout(ms) {
        assert.equal(ms, 10000); return AbortSignal.timeout(20);
    } } });
    h.save({ ...h.session, user: { id: "42", name: "Cached" } });
    const alive = setTimeout(() => {}, 1000);
    try { await assert.rejects(h.auth.restore(), { name: "TimeoutError" }); }
    finally { held.resolve(); clearTimeout(alive); await blocker; }
    assert.deepEqual(h.saved(), h.session);
    assert.equal(h.calls.length, 0);
});

