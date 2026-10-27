import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import test from "node:test";
import vm from "node:vm";
import { renderAuthenticationMethod } from "../_11ty/authentication.js";

const site = "https://emp.test/blog/";
const storage = () => {
    const values = new Map();
    return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) };
};
async function browser(method, returnTo = site + "post/?code=ordinary&state=ordinary#comments") {
    const localStorage = storage(), sessionStorage = storage(), calls = [];
    const pendingKey = `emp.${method}.pending`, sessionKey = `emp.${method}.session`;
    const source = await renderAuthenticationMethod({ method, options: { clientId: "client" } }, site);
    const location = {
        href: returnTo, origin: new URL(site).origin, navigations: [],
        assign() {},
        replace(url) { this.navigations.push(url); this.href = url; },
    };
    const h = {
        localStorage, sessionStorage, calls, location, pendingKey, sessionKey,
        load() {
            const context = {
                localStorage, sessionStorage, location, URL, URLSearchParams, TextEncoder, Uint8Array, btoa,
                crypto: webcrypto, AbortSignal,
                history: { replaceState(_s, _t, url) { location.href = url; } },
                navigator: { locks: { request: (_key, _options, action) => action() } },
                fetch: async (url, init) => {
                    calls.push({ url, init, page: location.href });
                    assert.equal(sessionStorage.getItem(pendingKey), null, "Consume before spending the code");
                    return Response.json(url.endsWith("/user")
                        ? { id: 42, name: "Signed in", login: "person", username: "person" }
                        : { access_token: "access", refresh_token: "refresh", token_type: "bearer", expires_in: 3600 });
                },
            };
            vm.runInNewContext(source + "\nglobalThis.auth = authentication;", context);
            h.auth = context.auth;
        },
        async callback() {
            await h.auth.signIn();
            const pending = JSON.parse(sessionStorage.getItem(pendingKey));
            location.href = site + "?code=oauth-code&state=" + pending.state;
            return h.auth.restore();
        },
    };
    h.load();
    return h;
}

// The requested speedup must move network work to the destination, not just hide
// the homepage. One-use state and unchanged session guards protect actual logins.
for (const method of ["github", "gitlab"]) {
    test(method + ": returns before any API request and completes once in a new document", async () => {
        const h = await browser(method);
        const returnTo = h.location.href;
        assert.equal(await h.callback(), null);
        assert.equal(h.calls.length, 0);
        assert.deepEqual(h.location.navigations, [returnTo]);
        assert.equal(h.localStorage.getItem(h.sessionKey), null);
        h.load();
        assert.equal((await h.auth.restore()).name, "Signed in");
        assert.equal(h.calls.length, 2, "One token exchange and one profile lookup");
        assert(h.calls.every(call => call.page === returnTo));
        if (method === "gitlab") assert.equal(h.calls[0].init.body.get("redirect_uri"), site);
        assert.equal(h.location.navigations.length, 1, "No post-authentication reload");
        h.load();
        await h.auth.restore();
        assert.equal(h.calls.filter(call => !call.url.endsWith("/user")).length, 1, "Reload cannot replay the code");
    });

    test(method + ": homepage and fragment returns finish without a document reload", async () => {
        for (const fragment of ["", "#comments"]) {
            const h = await browser(method, site + fragment);
            assert.equal((await h.callback()).name, "Signed in");
            assert.equal(h.location.href, site + fragment);
            assert.deepEqual(h.location.navigations, fragment ? [site + fragment] : []);
            assert.equal(h.calls.length, 2);
        }
    });

    test(method + ": handoff is destination-bound and revalidates expiry/configuration", async () => {
        for (const failure of ["expired", "configuration"]) {
            const h = await browser(method);
            await h.callback();
            const returnTo = h.location.href;
            h.location.href = site + "another-page/";
            h.load();
            assert.equal(await h.auth.restore(), null);
            assert.equal(h.calls.length, 0);
            const pending = JSON.parse(h.sessionStorage.getItem(h.pendingKey));
            if (failure === "expired") pending.createdAt -= 11 * 60 * 1000;
            else pending.config = "another-client";
            h.sessionStorage.setItem(h.pendingKey, JSON.stringify(pending));
            h.location.href = returnTo;
            h.load();
            await assert.rejects(h.auth.restore(), /state/);
            assert.equal(h.auth.error, true, "Destination reports the error without another navigation");
            assert.equal(h.calls.length, 0);
            assert.equal(h.sessionStorage.getItem(h.pendingKey), null);
            assert.equal(await h.auth.restore(), null);
            assert.equal(h.auth.error, false);
        }
    });

    test(method + ": logout and new sign-in discard a pending handoff", async () => {
        for (const action of ["signOut", "signIn"]) {
            const h = await browser(method);
            await h.callback();
            h.load();
            await h.auth[action]();
            const pending = h.sessionStorage.getItem(h.pendingKey);
            assert.equal(JSON.parse(pending)?.callback, undefined);
            assert.equal(await h.auth.restore(), null);
            assert.equal(h.sessionStorage.getItem(h.pendingKey), pending);
            assert.equal(h.calls.length, 0);
        }
    });

    test(method + ": cross-tab logout during the handoff cannot resurrect an old login", async () => {
        const h = await browser(method);
        h.localStorage.setItem(h.sessionKey, JSON.stringify({ accessToken: "old-secret" }));
        await h.callback();
        assert(!h.sessionStorage.getItem(h.pendingKey).includes("old-secret"), "Handoff is not another credential store");
        h.localStorage.removeItem(h.sessionKey);
        h.load();
        assert.equal(await h.auth.restore(), null);
        assert.equal(h.calls.length, 0);
        assert.equal(h.localStorage.getItem(h.sessionKey), null);
    });
}
