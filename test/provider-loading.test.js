import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import vm from "node:vm";
import test from "node:test";

test("extensions build HTML, CSS, browser code and deployment config without registry edits", async (t) => {
    const fixture = await mkdtemp(new URL("../.test-providers-", import.meta.url));
    t.after(() => rm(fixture, { recursive: true, force: true }));
    for (const dir of ["_11ty", "extensions/authentication/local", "extensions/plugins/local", "extensions/plugins/syntax-highlighting", "extensions/postlist/local", "content/_data", "content/_includes"]) {
        await mkdir(join(fixture, dir), { recursive: true });
    }
    for (const file of ["authentication.js", "plugins.js", "cloudflare.js", "postlist.js"]) {
        await copyFile(new URL(`../_11ty/${file}`, import.meta.url), join(fixture, "_11ty", file));
    }
    for (const file of ["index.js", "prism-okaidia.css"]) {
        await copyFile(new URL(`../extensions/plugins/syntax-highlighting/${file}`, import.meta.url), join(fixture, "extensions/plugins/syntax-highlighting", file));
    }
    const files = {
        "package.json": '{"type":"module"}',
        "wrangler.json": '{"name":"local-site"}',
        "eleventy.config.mjs": `
            import authentication from "./_11ty/authentication.js";
            import plugins from "./_11ty/plugins.js";
            import cloudflare from "./_11ty/cloudflare.js";
            import postlist from "./_11ty/postlist.js";
            export default config => {
                config.addPlugin(authentication);
                config.addPlugin(plugins);
                config.addPlugin(cloudflare);
                config.addPlugin(postlist);
                return { dir: { input: "content" } };
            };`,
        "content/_data/siteconfig.js": `export default {
            url: "https://example.test/blog/",
            plugins: { "syntax-highlighting": true, local: { label: "Local plugin" } },
            authentication: { method: "local", options: { name: "Local user" } },
            pagination: { postlist: "local" },
            lang: "en",
        };`,
        "content/_data/siteelements.json": '{"features":{}}',
        "content/_data/sitestrings.json": '{"en":{}}',
        "extensions/postlist/local/index.js": `export default {
            template: "extensions/postlist/local/postlist.njk",
            js: "extensions/postlist/local/js.njk",
        };`,
        "extensions/postlist/local/postlist.njk": '<article>{{ list.items[0].title }}: {{ list.pagination.totalPages }}</article>',
        "extensions/postlist/local/js.njk": 'globalThis.localList = "{{ siteconfig.pagination.postlist }}";',
        "extensions/plugins/local/index.js": `export default {
            head: ({ label }) => '<meta name="local-plugin" content="' + label + '">',
            js: ({ label }) => 'globalThis.localPlugin = ' + JSON.stringify(label) + ';',
        };`,
        "extensions/authentication/local/index.js": `export default {
            browser: ({ name }) => 'const authentication = { async restore() { return { id: "local", name: ' + JSON.stringify(name) + ' }; } };',
            cloudflare: (base, siteconfig, output) => ({ ...base, assets: { directory: output }, vars: { PROVIDER: siteconfig.authentication.method } }),
        };`,
        "content/index.njk": '{% pluginsHead %}{% pluginsBodyStart %}{% set list = [{title: "Local list", url: "/post/"}] | postlistData %}{% include postlistTemplate %}',
        "content/code.md": '\n```js\nconst value = 42;\n```\n',
        "content/style.njk": "---\npermalink: /style.css\n---\n{% pluginsCss %}",
        "content/auth.njk": "---\npermalink: /assets/js/min.js\n---\n{% authenticationMethod siteconfig.authentication, siteconfig.url %}\n{% pluginsJs %}\n{% if postlistJsTemplate %}{% include postlistJsTemplate %}{% endif %}",
    };
    for (const [file, contents] of Object.entries(files)) await writeFile(join(fixture, file), contents);
    await promisify(execFile)(process.execPath, [new URL("../node_modules/@11ty/eleventy/cmd.cjs", import.meta.url).pathname], { cwd: fixture });
    assert.match(await readFile(join(fixture, "_site/index.html"), "utf8"), /content="Local plugin"/);
    assert.match(await readFile(join(fixture, "_site/index.html"), "utf8"), /<article>Local list: 1<\/article>/);
    const highlighted = await readFile(join(fixture, "_site/code/index.html"), "utf8");
    assert.match(highlighted, /class="token keyword">const<\/span>/);
    assert.match(await readFile(join(fixture, "_site/style.css"), "utf8"), /\.token\.keyword/);
    const source = await readFile(join(fixture, "_site/assets/js/min.js"), "utf8");
    const browser = {};
    const identity = await vm.runInNewContext(`${source}\nauthentication.restore()`, browser);
    assert.equal(identity.name, "Local user");
    assert.equal(browser.localPlugin, "Local plugin");
    assert.equal(browser.localList, "local");
    const deployed = JSON.parse(await readFile(join(fixture, "wrangler.generated.json"), "utf8"));
    assert.equal(deployed.name, "local-site");
    assert.equal(deployed.vars.PROVIDER, "local");
    assert.equal(JSON.parse(await readFile(join(fixture, ".wrangler/deploy/config.json"), "utf8")).configPath, "../../wrangler.generated.json");
    await writeFile(join(fixture, "content/_data/siteconfig.js"), files["content/_data/siteconfig.js"].replace('"syntax-highlighting": true', '"syntax-highlighting": false'));
    await promisify(execFile)(process.execPath, [new URL("../node_modules/@11ty/eleventy/cmd.cjs", import.meta.url).pathname], { cwd: fixture });
    const plain = await readFile(join(fixture, "_site/code/index.html"), "utf8");
    assert.doesNotMatch(plain, /class="token/);
    assert.match(plain, /const value = 42;/);
    assert.equal((await readFile(join(fixture, "_site/style.css"), "utf8")).trim(), "");
});
