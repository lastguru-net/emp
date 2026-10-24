import assert from "node:assert/strict";
import { createHash, webcrypto } from "node:crypto";
import test from "node:test";
import vm from "node:vm";
import { renderAuthenticationMethod } from "../_11ty/authentication.js";
import worker from "../extensions/authentication/github/worker/src/index.js";

const siteUrl = "https://emp.test/blog/";
const exchangeUrl = "https://emp.test/blog/api/auth/github/exchange";
const options = {
    clientId: "client-1",
    scopes: ["read:user"],
};
const pendingKey = "emp.github.pending";
const sessionKey = "emp.github.session";
const config = JSON.stringify([options.clientId, siteUrl, exchangeUrl, options.scopes.join(" ")]);
const profile = { id: 123, login: "octo", name: "  Octocat  " };
const token = { access_token: "token-1", token_type: "bearer", expires_in: 3600 };

function storage() {
    const values = new Map();
    return {
        getItem: key => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, String(value)),
        removeItem: key => values.delete(key),
    };
}

async function browser(initialUrl = "https://emp.test/blog/post/?x=1#part", methodOptions = options) {
    let current = new URL(initialUrl);
    const location = {
        get href() { return current.href; },
        set href(value) { current = new URL(value, current); },
        get origin() { return current.origin; },
        get pathname() { return current.pathname; },
        get search() { return current.search; },
        get hash() { return current.hash; },
        assign(value) { this.assigned = value; },
        replace(value) { this.replaced = value; current = new URL(value, current); },
    };
    const history = { replaceState(_state, _unused, value) {
        current = new URL(value, current);
    } };
    const localStorage = storage();
    const sessionStorage = storage();
    const calls = [];
    const b = { location, history, localStorage, sessionStorage, calls,
        respond(input) {
            if (input === exchangeUrl) return Response.json(token);
            if (input === "https://api.github.com/user") return Response.json(profile);
            throw new Error(`Unexpected fetch: ${input}`);
        },
    };
    const context = { URL, URLSearchParams, TextEncoder, Uint8Array, crypto: webcrypto, btoa,
        location, history, localStorage, sessionStorage, Date, AbortSignal,
        fetch: (input, init) => { calls.push([input, init, location.href]); return b.respond(input, init); },
    };
    const source = await renderAuthenticationMethod({ method: "github", options: methodOptions }, siteUrl);
    vm.runInNewContext(`${source}\nglobalThis.selectedAuthentication = authentication;`, context);
    b.auth = context.selectedAuthentication;
    return b;
}

async function begin(b) {
    await b.auth.signIn();
    return JSON.parse(b.sessionStorage.getItem(pendingKey));
}
function callback(b, query) {
    b.location.href = `${siteUrl}${query}`;
    return b.auth.restore();
}
function storedSession(accessToken = "old-token", expiresAt = null) {
    return JSON.stringify({ accessToken, expiresAt, config });
}

// Browser flow contracts: the callback is the homepage, so an ordinary homepage query is not OAuth.
test("GitHub sign-in binds PKCE and state, exchanges only code/verifier, and restores exact return URL", async () => {
    const b = await browser();
    const pending = await begin(b);
    const authorize = new URL(b.location.assigned);
    assert.equal(authorize.href.startsWith("https://github.com/login/oauth/authorize?"), true);
    assert.equal(authorize.searchParams.get("client_id"), options.clientId);
    assert.equal(authorize.searchParams.get("redirect_uri"), siteUrl);
    assert.equal(authorize.searchParams.get("scope"), "read:user");
    assert.equal(authorize.searchParams.get("state"), pending.state);
    assert.equal(authorize.searchParams.get("code_challenge_method"), "S256");
    assert.equal(authorize.searchParams.get("code_challenge"), createHash("sha256").update(pending.verifier).digest("base64url"));
    const user = await callback(b, `?code=abc&state=${pending.state}`);
    assert.deepEqual(JSON.parse(JSON.stringify(user)), { id: "123", name: "Octocat" });
    assert.equal(b.calls[0][2], siteUrl);
    assert.equal(b.location.replaced, "https://emp.test/blog/post/?x=1#part");
    assert.deepEqual(JSON.parse(b.calls[0][1].body), { code: "abc", codeVerifier: pending.verifier });
    assert.equal(b.calls[0][1].cache, "no-store");
    assert.equal(b.calls[1][1].headers.Authorization, "Bearer token-1");
    assert.equal(JSON.parse(b.localStorage.getItem(sessionKey)).expiresAt > Date.now(), true);
    assert.deepEqual(JSON.parse(JSON.stringify(await b.auth.restore())), { id: "123", name: "Octocat" });
    assert.equal(b.auth.error, false);
    await b.auth.signOut();
    assert.equal(await b.auth.restore(), null);
});

test("invalid state consumes a pending sign-in and replay without pending state leaves the URL alone", async () => {
    const b = await browser();
    const pending = await begin(b);
    await assert.rejects(callback(b, "?code=abc&state=wrong"), /state/i);
    assert.equal(b.calls.length, 0);
    assert.equal(b.location.replaced, pending.returnTo);
    const replayUrl = `${siteUrl}?code=abc&state=${pending.state}`;
    b.location.replaced = undefined;
    assert.equal(await callback(b, `?code=abc&state=${pending.state}`), null);
    assert.equal(b.calls.length, 0);
    assert.equal(b.location.href, replayUrl);
    assert.equal(b.location.replaced, undefined);
    assert.equal(b.auth.error, true);
    assert.equal(await b.auth.restore(), null);
    assert.equal(b.auth.error, false);
});

test("a completed callback cannot exchange again or replace its established session", async () => {
    const b = await browser();
    const pending = await begin(b);
    const query = `?code=abc&state=${pending.state}`;
    await callback(b, query);
    const session = b.localStorage.getItem(sessionKey);
    const replayUrl = `${siteUrl}${query}`;
    b.location.href = replayUrl;
    b.location.replaced = undefined;
    assert.equal((await b.auth.restore()).name, "Octocat");
    assert.equal(b.calls.filter(([url]) => url === exchangeUrl).length, 1);
    assert.equal(b.localStorage.getItem(sessionKey), session);
    assert.equal(b.location.href, replayUrl);
    assert.equal(b.location.replaced, undefined);
    assert.equal(b.auth.error, false);
});

test("stale application configuration or expired authorization cannot exchange a code", async () => {
    for (const change of [
        pending => { pending.config = "other-client"; },
        pending => { pending.createdAt -= 11 * 60 * 1000; },
    ]) {
        const b = await browser();
        const pending = await begin(b);
        change(pending);
        b.sessionStorage.setItem(pendingKey, JSON.stringify(pending));
        await assert.rejects(callback(b, `?code=abc&state=${pending.state}`), /state/i);
        assert.equal(b.calls.length, 0);
        assert.equal(b.localStorage.getItem(sessionKey), null);
    }
});

test("cancellation and exchange/profile failure return with a one-use error and preserve existing identity", async () => {
    for (const failure of ["cancelled", "exchange", "profile"]) {
        const b = await browser();
        if (failure === "exchange") b.localStorage.setItem(sessionKey, storedSession());
        const pending = await begin(b);
        b.respond = input => {
            if (input === exchangeUrl) return failure === "exchange"
                ? Response.json({ error: "denied" }, { status: 400 }) : Response.json(token);
            return failure === "profile" ? Response.json({}) : Response.json(profile);
        };
        const query = failure === "cancelled" ? `?error=access_denied&state=${pending.state}` : `?code=abc&state=${pending.state}`;
        await assert.rejects(callback(b, query));
        assert.equal(b.location.replaced, pending.returnTo);
        if (failure === "cancelled") assert.equal(b.calls.length, 0);
        assert.equal(b.localStorage.getItem(sessionKey), failure === "exchange" ? storedSession() : null);
        b.respond = () => Response.json(profile);
        assert.equal((await b.auth.restore())?.name ?? null, failure === "exchange" ? "Octocat" : null);
        assert.equal(b.auth.error, true);
        await b.auth.restore();
        assert.equal(b.auth.error, false);
    }
});

test("unsafe or absent return destination falls back to the callback URL regardless of auth result", async () => {
    const successful = await browser();
    const pending = await begin(successful);
    pending.returnTo = "https://evil.test/private";
    successful.sessionStorage.setItem(pendingKey, JSON.stringify(pending));
    await callback(successful, `?code=abc&state=${pending.state}`);
    assert.equal(successful.location.replaced, siteUrl);

    const failed = await browser();
    const missingReturn = await begin(failed);
    delete missingReturn.returnTo;
    failed.sessionStorage.setItem(pendingKey, JSON.stringify(missingReturn));
    await assert.rejects(callback(failed, "?code=abc&state=wrong"));
    assert.equal(failed.location.replaced, siteUrl);
    assert.equal(failed.calls.length, 0);
});

test("ordinary homepage queries are preserved before and after a sign-in", async () => {
    for (const url of [
        "https://emp.test/blog/?code=sample&state=example#section",
        "https://emp.test/blog/?error=example&state=example#section",
    ]) {
        const b = await browser(url);
        const pending = await begin(b);
        assert.equal(await b.auth.restore(), null);
        assert.equal(b.location.href, url);
        assert.equal(b.sessionStorage.getItem(pendingKey) !== null, true);
        assert.equal(b.calls.length, 0);
        assert.equal(pending.returnTo, url);
        assert.equal((await callback(b, `?code=abc&state=${pending.state}`)).name, "Octocat");
        assert.equal(b.location.replaced, url);
        assert.equal((await b.auth.restore()).name, "Octocat");
        assert.equal(b.location.href, url);
        assert.equal(b.auth.error, false);
    }
});

test("changing requested scopes invalidates an old token", async () => {
    const oldBrowser = await browser(undefined, { ...options, scopes: [] });
    const oldConfig = (await begin(oldBrowser)).config;
    const existing = await browser();
    existing.localStorage.setItem(sessionKey, JSON.stringify({ accessToken: "old-token", expiresAt: null, config: oldConfig }));
    assert.equal(await existing.auth.restore(), null);
    assert.equal(existing.localStorage.getItem(sessionKey), null);
    assert.equal(existing.calls.length, 0);
});

test("expired and revoked sessions clear, while a transient profile error retains the session", async () => {
    const expired = await browser();
    expired.localStorage.setItem(sessionKey, storedSession("expired", Date.now() - 1));
    assert.equal(await expired.auth.restore(), null);
    assert.equal(expired.localStorage.getItem(sessionKey), null);
    assert.equal(expired.calls.length, 0);

    const b = await browser();
    const session = storedSession();
    b.localStorage.setItem(sessionKey, session);
    for (const response of [Response.json({}), new Response(null, { status: 400 }), new Response(null, { status: 403 }), new Response(null, { status: 503 })]) {
        b.respond = () => response;
        await assert.rejects(b.auth.restore());
        assert.equal(b.localStorage.getItem(sessionKey), session);
    }
    b.respond = () => Response.json({ ...profile, name: "  " });
    assert.equal((await b.auth.restore()).name, "octo");
    b.respond = () => new Response(null, { status: 401 });
    assert.equal(await b.auth.restore(), null);
    assert.equal(b.localStorage.getItem(sessionKey), null);
});

test("sign-out or session replacement during profile fetch cannot resurrect or delete a newer session", async () => {
    const signedOut = await browser();
    signedOut.localStorage.setItem(sessionKey, storedSession());
    let resolveProfile;
    signedOut.respond = () => new Promise(resolve => { resolveProfile = resolve; });
    const restoring = signedOut.auth.restore();
    await signedOut.auth.signOut();
    resolveProfile(Response.json(profile));
    assert.equal(await restoring, null);
    assert.equal(signedOut.localStorage.getItem(sessionKey), null);

    const replaced = await browser();
    replaced.localStorage.setItem(sessionKey, storedSession("old"));
    let rejectOld;
    replaced.respond = () => new Promise(resolve => { rejectOld = resolve; });
    const oldRestoration = replaced.auth.restore();
    const newer = storedSession("new");
    replaced.localStorage.setItem(sessionKey, newer);
    rejectOld(new Response(null, { status: 401 }));
    assert.equal(await oldRestoration, null);
    assert.equal(replaced.localStorage.getItem(sessionKey), newer);
});

test("cross-tab sign-out or session replacement during callback cannot restore stale login", async () => {
    for (const change of ["sign-out", "newer session"]) {
        const b = await browser();
        const pending = await begin(b);
        b.localStorage.setItem(sessionKey, storedSession("old"));
        let resolveProfile;
        let profileStarted;
        const started = new Promise(resolve => { profileStarted = resolve; });
        b.respond = input => input === exchangeUrl ? Response.json(token) :
            new Promise(resolve => { resolveProfile = resolve; profileStarted(); });
        const restoring = callback(b, `?code=abc&state=${pending.state}`);
        await started;
        const newer = storedSession("newer");
        if (change === "sign-out") b.localStorage.removeItem(sessionKey);
        else b.localStorage.setItem(sessionKey, newer);
        resolveProfile(Response.json(profile));
        assert.equal(await restoring, null, change);
        assert.equal(b.localStorage.getItem(sessionKey), change === "sign-out" ? null : newer, change);
        assert.equal(b.location.replaced, pending.returnTo, change);
    }
});

test("a cancelled or superseded in-flight callback cannot log in, report errors or navigate", async () => {
    for (const action of ["signOut", "signIn"]) {
        for (const status of [200, 503]) {
            const b = await browser();
            const pending = await begin(b);
            let resolveProfile;
            let profileStarted;
            const started = new Promise(resolve => { profileStarted = resolve; });
            b.respond = input => input === exchangeUrl ? Response.json(token) :
                new Promise(resolve => { resolveProfile = resolve; profileStarted(); });
            const restoring = callback(b, `?code=abc&state=${pending.state}`);
            await started;
            await b.auth[action]();
            const navigation = b.location.assigned;
            const nextPending = b.sessionStorage.getItem(pendingKey);
            resolveProfile(status === 200 ? Response.json(profile) : new Response(null, { status }));
            assert.equal(await restoring, null);
            assert.equal(b.localStorage.getItem(sessionKey), null);
            assert.equal(b.sessionStorage.getItem("emp.github.error"), null);
            assert.equal(b.sessionStorage.getItem(pendingKey), nextPending);
            assert.equal(b.location.assigned, navigation);
            assert.equal(b.location.replaced, undefined);
        }
    }
});

const env = { CLIENT_ID: "server-client", CLIENT_SECRET: "server-secret", REDIRECT_URI: siteUrl, ALLOWED_ORIGINS: "https://emp.test", EXCHANGE_PATH: "/blog/api/auth/github/exchange" };
function workerRequest(method = "POST", { origin = "https://emp.test", path = env.EXCHANGE_PATH, body = { code: "abc", codeVerifier: "a".repeat(43) }, type = "application/json" } = {}) {
    return new Request(`https://emp.test${path}`, {
        method, headers: { ...(origin ? { Origin: origin } : {}), "Content-Type": type },
        ...(method === "POST" ? { body: typeof body === "string" ? body : JSON.stringify(body) } : {}),
    });
}

test("Worker code exchange uses fixed GitHub app values without forwarding refresh data", async (t) => {
    const calls = [];
    t.mock.method(globalThis, "fetch", async (url, init) => {
        calls.push([url, init]);
        return Response.json({ ...token, scope: "read:user", refresh_token: "must-not-leak" });
    });
    const response = await worker.fetch(workerRequest(), env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.deepEqual(await response.json(), token);
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], "https://github.com/login/oauth/access_token");
    assert.equal(calls[0][1].redirect, "manual");
    const form = new URLSearchParams(calls[0][1].body);
    assert.deepEqual(Object.fromEntries(form), {
        client_id: env.CLIENT_ID, client_secret: env.CLIENT_SECRET, code: "abc",
        redirect_uri: env.REDIRECT_URI, code_verifier: "a".repeat(43),
    });
});

test("Worker rejects wrong origin, route, method, media type and exchange input before GitHub", async (t) => {
    let calls = 0;
    t.mock.method(globalThis, "fetch", async () => {
        calls++;
        throw new Error("unexpected upstream request");
    });
    const cases = [
        [workerRequest("POST", { origin: "https://evil.test" }), 403],
        [workerRequest("POST", { origin: null }), 403],
        [workerRequest("GET"), 405],
        [workerRequest("POST", { type: "text/plain" }), 415],
        [workerRequest("POST", { body: { code: "abc", codeVerifier: "short" } }), 400],
        [workerRequest("POST", { body: { code: "abc", codeVerifier: "a".repeat(43), redirect_uri: "https://evil.test" } }), 400],
        [workerRequest("POST", { body: { code: "x".repeat(4096), codeVerifier: "a".repeat(43) } }), 400],
    ];
    for (const [request, status] of cases) assert.equal((await worker.fetch(request, env)).status, status);
    assert.equal(calls, 0);
});

test("Worker redacts upstream failure details", async (t) => {
    t.mock.method(globalThis, "fetch", async () => Response.json({ error: "bad_verification_code", error_description: "private" }));
    const response = await worker.fetch(workerRequest(), env);
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "exchange_rejected" });
});

test("Worker delegates non-auth requests unchanged to assets before origin checks", async () => {
    for (const path of ["/", "/blog/", "/missing", `${env.EXCHANGE_PATH}/`]) {
        const request = workerRequest("GET", { path, origin: null });
        const expected = new Response("asset or site 404", { status: path === "/missing" ? 404 : 200 });
        const response = await worker.fetch(request, { ...env, ASSETS: { fetch(input) {
            assert.equal(input.url, request.url);
            assert.equal(input.method, request.method);
            assert.deepEqual([...input.headers], [...request.headers]);
            return expected;
        } } });
        assert.equal(response.status, expected.status);
        assert.deepEqual([...response.headers], [...expected.headers]);
        assert.equal(await response.text(), "asset or site 404");
    }
});
