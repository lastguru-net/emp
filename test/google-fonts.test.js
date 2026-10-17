import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import plugins from "../_11ty/plugins.js";
import siteconfig from "../content/_data/siteconfig.js";

const register = async (t, local, family, output = "unused", prefix = "") => {
    const original = siteconfig.plugins;
    t.after(() => { siteconfig.plugins = original; });
    siteconfig.plugins = {
        "google-fonts": { local, body: { family, weights: "0,400" }, header: { family, weights: "0,700" } }
    };
    const shortcodes = {};
    const hooks = {};
    await plugins({
        on(name, callback) { hooks[name] = callback; },
        addNunjucksAsyncShortcode(name, render) { shortcodes[name] = render; },
        getFilter: () => url => prefix + url
    });
    hooks["eleventy.before"]?.({ directories: { output } });
    return { ...shortcodes, before: output => hooks["eleventy.before"]?.({ directories: { output } }) };
};

test("Google CSS shares pending/successful requests and retries failures without a stray rejection", async (t) => {
    const shortcodes = await register(t, "css", "Retry");
    const requests = [];
    t.mock.method(globalThis, "fetch", async url => {
        requests.push(url);
        if (requests.length === 1) return { ok: false, status: 503, statusText: "unavailable" };
        return { ok: true, text: async () => "@font-face { src: url(https://fonts.example/a.woff2) }" };
    });
    const failed = await Promise.allSettled(Array.from({ length: 2 }, () => shortcodes.pluginsCss()));
    assert.ok(failed.every(result => result.status === "rejected" && /503/.test(result.reason.message)));
    assert.equal(requests.length, 1, "overlapping CSS requests share the failed fetch");
    await new Promise(resolve => setImmediate(resolve));
    const results = await Promise.all(Array.from({ length: 2 }, () => shortcodes.pluginsCss()));
    assert.ok(results.every(css => css === results[0]));
    assert.match(results[0], /https:\/\/fonts.example\/a.woff2/);
    await shortcodes.pluginsCss();
    assert.equal(requests.length, 2, "successful CSS is shared and remains cached");
    assert.ok(requests.every(request => request.startsWith("https://fonts.googleapis.com/css2?")), "CSS mode never fetches a font file");
});

test("full-mode fonts share downloads, retain prefixes and write to every resolved output directory", async (t) => {
    const fixture = await mkdtemp(join(tmpdir(), "emp-fonts-"));
    t.after(() => rm(fixture, { recursive: true, force: true }));
    const first = join(fixture, "_site");
    const second = join(fixture, "custom-output");
    const shortcodes = await register(t, "full", "Local", first, "/blog");
    const requests = new Map();
    t.mock.method(globalThis, "fetch", async url => {
        requests.set(url, (requests.get(url) || 0) + 1);
        return {
            ok: true,
            text: async () => '@font-face{src:url("https://fonts.example/shared.woff2")} @font-face{src:url(https://fonts.example/shared.woff2)}',
            arrayBuffer: async () => Uint8Array.from([1, 2, 3]).buffer
        };
    });
    const [css, same] = await Promise.all([shortcodes.pluginsCss(), shortcodes.pluginsCss()]);
    assert.equal(css, same);
    assert.equal(css.match(/\/blog\/assets\/fonts\/shared.woff2/g).length, 2);
    assert.doesNotMatch(css, /https:\/\/fonts.example/);
    assert.deepEqual(await readFile(join(first, "assets/fonts/shared.woff2")), Buffer.from([1, 2, 3]));
    assert.equal(requests.get("https://fonts.example/shared.woff2"), 1);
    shortcodes.before(second);
    assert.equal(await shortcodes.pluginsCss(), css);
    assert.deepEqual(await readFile(join(second, "assets/fonts/shared.woff2")), Buffer.from([1, 2, 3]));
    await rm(second, { recursive: true });
    shortcodes.before(second);
    assert.equal(await shortcodes.pluginsCss(), css);
    assert.deepEqual(await readFile(join(second, "assets/fonts/shared.woff2")), Buffer.from([1, 2, 3]), "rebuild restores fonts after output cleanup");
    assert.ok([...requests.values()].every(count => count === 1), "rebuilds reuse downloaded CSS and font bytes");
});

test("full-mode font failures can be retried", async (t) => {
    const fixture = await mkdtemp(join(tmpdir(), "emp-font-retry-"));
    t.after(() => rm(fixture, { recursive: true, force: true }));
    const shortcodes = await register(t, "full", "FontRetry", fixture);
    let downloads = 0;
    t.mock.method(globalThis, "fetch", async url => {
        if (url.startsWith("https://fonts.googleapis.com/")) return { ok: true, text: async () => "@font-face{src:url(https://fonts.example/retry.woff2)}" };
        downloads++;
        return { ok: downloads > 1, status: 503, arrayBuffer: async () => new ArrayBuffer(1) };
    });
    await assert.rejects(shortcodes.pluginsCss(), /503/);
    await shortcodes.pluginsCss();
    assert.equal((await readFile(join(fixture, "assets/fonts/retry.woff2"))).length, 1);
});
