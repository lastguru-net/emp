import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import siteconfig from "../content/_data/siteconfig.js";
import register from "../_11ty/hash.js";

test("asset cache-busting URLs are stable and change with bundled inputs", async (t) => {
    const original = process.cwd();
    const fixture = await mkdtemp(join(tmpdir(), "emp-hashes-"));
    const authentication = siteconfig.authentication;
    const plugins = siteconfig.plugins;
    t.after(async () => {
        siteconfig.authentication = authentication;
        siteconfig.plugins = plugins;
        process.chdir(original);
        await rm(fixture, { recursive: true, force: true });
    });
    for (const dir of ["assets/css", "assets/js", "content/_data", "content/_includes", "content/utils", "extensions/postlist/local"]) {
        await mkdir(join(fixture, dir), { recursive: true });
    }
    const files = {
        "assets/css/theme.css": "body { color: black; }",
        "assets/js/post-card.js": "export const title = 'Original';",
        "content/_data/siteelements.json5": "{ features: { search: false } }",
        "content/_data/siteconfig.js": 'export default { lang: "en", internalUrls: [] };',
        "content/_data/inlinesvg.json5": '{ calendar: { viewBox: "0 0 24 24", path: "M1 1h12v12H1z" } }',
        "content/_includes/card.njk": '<div class="p-11">Card</div>',
        "extensions/postlist/local/postlist.njk": '<div class="m-11">List</div>',
        "extensions/postlist/local/browser.js": 'const label = "Original";',
        "content/utils/js.njk": 'const language = "{{ siteconfig.lang }}";',
        "package.json": '{ "dependencies": { "tailwindcss": "4.0.0" } }'
    };
    for (const [name, content] of Object.entries(files)) await writeFile(join(fixture, name), content);
    process.chdir(fixture);
    siteconfig.authentication = null;
    siteconfig.plugins = {};

    const filters = {};
    let beforeBuild;
    register({
        on(event, callback) { if (event === "eleventy.before") beforeBuild = callback; },
        addNunjucksAsyncFilter(name, fn) { filters[name] = fn; },
    });
    const build = async () => {
        beforeBuild();
        const hashUrl = path => new Promise((resolve, reject) =>
            filters.addDirHash(path, (error, result) => error ? reject(error) : resolve(result)));
        const paths = ["/assets/css/min.css", "/assets/js/min.js", "/assets/js/post-card.js"];
        const urls = await Promise.all(paths.map(hashUrl));
        const hashes = urls.map((value, index) => {
            assert.ok(value.startsWith(paths[index] + "?"), "the original public asset path is preserved");
            const url = new URL(value, "https://example.test");
            assert.ok(url.searchParams.get("hash"), "asset URLs carry a nonempty cache token");
            return url.searchParams.get("hash");
        });
        return { css: [hashes[0]], js: hashes.slice(1) };
    };
    const assertChanged = (actual, previous, message) => {
        for (let index = 0; index < previous.length; index++) assert.notEqual(actual[index], previous[index], message);
    };
    const baseline = await build();
    assert.deepEqual(await build(), baseline, "unchanged build inputs produce stable URLs");

    for (const [name, content, affected] of [
        ["assets/css/theme.css", "body { color: blue; }", ["css"]],
        ["assets/js/post-card.js", "export const title = 'Changed';", ["js"]],
        ["content/_data/siteconfig.js", 'export default { lang: "lv", internalUrls: [] };', ["js"]],
        ["content/_data/inlinesvg.json5", '{ calendar: { viewBox: "0 0 24 24", path: "M2 2h10v10H2z" } }', ["js"]],
        ["content/_includes/card.njk", '<div class="p-12">Card</div>', ["css"]],
        ["extensions/postlist/local/postlist.njk", '<div class="m-12">List</div>', ["css"]],
        ["extensions/postlist/local/browser.js", 'const label = "Changed";', ["js"]],
        ["content/_data/siteelements.json5", "{ features: { search: true } }", ["css", "js"]],
        ["package.json", '{ "dependencies": { "tailwindcss": "4.1.0" } }', ["css", "js"]]
    ]) {
        await writeFile(name, content);
        const changed = await build();
        for (const type of affected) assertChanged(changed[type], baseline[type], `${name} invalidates ${type} URLs`);
        await writeFile(name, files[name]);
    }

    siteconfig.plugins = { "syntax-highlighting": true };
    assertChanged((await build()).css, baseline.css, "plugin CSS invalidates stylesheet URLs");

    siteconfig.authentication = { method: "test", options: { name: "First identity" } };
    const withAuthentication = await build();
    assertChanged(withAuthentication.js, baseline.js, "the selected authentication bundle invalidates JS URLs");
    siteconfig.authentication = { method: "test", options: { name: "Second identity" } };
    assertChanged((await build()).js, withAuthentication.js, "authentication options also change the generated bundle");
});
