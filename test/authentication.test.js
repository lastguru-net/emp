import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { renderAuthenticationMethod } from "../_11ty/authentication.js";

test("authentication can be disabled and rejects unsupported methods", async () => {
    assert.equal(await renderAuthenticationMethod({ method: null, options: {} }), "");
    await assert.rejects(renderAuthenticationMethod({ method: "unknown" }), /Cannot find module/);
});

test("OAuth providers normalize the site's root homepage URL", async () => {
    for (const method of ["gitlab", "github"]) {
        const context = {};
        const source = await renderAuthenticationMethod({ method, options: { clientId: "public-client" } }, "https://emp.test");
        vm.runInNewContext(`${source}\nglobalThis.options = authenticationOptions;`, context);
        assert.equal(context.options.redirectUri, "https://emp.test/");
        if (method === "github") {
            assert.equal(context.options.exchangeUrl, "https://emp.test/api/auth/github/exchange");
        }
    }
});

test("test authentication restores, signs in and signs out through the common identity", async () => {
    const values = new Map([["other", "keep me"]]);
    const storage = {
        getItem(key) { return values.get(key) ?? null; },
        setItem(key, value) { values.set(key, String(value)); },
        removeItem(key) { values.delete(key); },
    };
    const context = { localStorage: storage };
    const source = await renderAuthenticationMethod({ method: "test", options: {} });
    vm.runInNewContext(`${source}\nglobalThis.selectedAuthentication = authentication;`, context);
    const authentication = context.selectedAuthentication;

    assert.equal(authentication.storageKey, "user");
    assert.equal(authentication.cached(), null);
    assert.equal(await authentication.restore(), null);
    await authentication.signIn();
    assert.deepEqual(JSON.parse(JSON.stringify(authentication.cached())), { id: "test-user", name: "Test Username" });
    assert.deepEqual(JSON.parse(JSON.stringify(await authentication.restore())), { id: "test-user", name: "Test Username" });
    assert.equal(values.get("other"), "keep me");

    values.set("user", "Legacy Name");
    assert.deepEqual(JSON.parse(JSON.stringify(await authentication.restore())), { id: "test-user", name: "Legacy Name" });
    assert.equal(await authentication.signOut(), null);
    assert.equal(authentication.cached(), null);
    assert.equal(values.has("user"), false);
    assert.equal(values.get("other"), "keep me");
});
