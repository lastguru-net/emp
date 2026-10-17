import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import vm from "node:vm";
import test from "node:test";

test("plugins and authentication build HTML, CSS, browser code and deployment config without registry edits", async (t) => {
    const fixture = await mkdtemp(new URL("../.test-providers-", import.meta.url));
    t.after(() => rm(fixture, { recursive: true, force: true }));
    for (const dir of ["_11ty", "extensions/authentication/local", "extensions/plugins/local", "extensions/plugins/syntax-highlighting", "content/_data"]) {
        await mkdir(join(fixture, dir), { recursive: true });
    }
    for (const file of ["authentication.js", "plugins.js", "cloudflare.js"]) {
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
            export default config => {
                config.addPlugin(authentication);
                config.addPlugin(plugins);
                config.addPlugin(cloudflare);
                return { dir: { input: "content" } };
            };`,
        "content/_data/siteconfig.js": `export default {
            url: "https://example.test/blog/",
            plugins: { "syntax-highlighting": true, local: { label: "Local plugin" } },
            authentication: { method: "local", options: { name: "Local user" } },
        };`,
        "extensions/plugins/local/index.js": `export default {
            head: ({ label }) => '<meta name="local-plugin" content="' + label + '">',
        };`,
        "extensions/authentication/local/index.js": `export default {
            browser: ({ name }) => 'const authentication = { async restore() { return { id: "local", name: ' + JSON.stringify(name) + ' }; } };',
            cloudflare: (base, siteconfig, output) => ({ ...base, assets: { directory: output }, vars: { PROVIDER: siteconfig.authentication.method } }),
        };`,
        "content/index.njk": "{% pluginsHead %}{% pluginsBodyStart %}",
        "content/code.md": '\n```js\nconst value = 42;\n```\n',
        "content/style.njk": "---\npermalink: /style.css\n---\n{% pluginsCss %}",
        "content/auth.njk": "---\npermalink: /assets/js/min.js\n---\n{% authenticationMethod siteconfig.authentication, siteconfig.url %}",
    };
    for (const [file, contents] of Object.entries(files)) await writeFile(join(fixture, file), contents);
    await promisify(execFile)(process.execPath, [new URL("../node_modules/@11ty/eleventy/cmd.cjs", import.meta.url).pathname], { cwd: fixture });
    assert.match(await readFile(join(fixture, "_site/index.html"), "utf8"), /content="Local plugin"/);
    const highlighted = await readFile(join(fixture, "_site/code/index.html"), "utf8");
    assert.match(highlighted, /class="token keyword">const<\/span>/);
    assert.match(await readFile(join(fixture, "_site/style.css"), "utf8"), /\.token\.keyword/);
    const source = await readFile(join(fixture, "_site/assets/js/min.js"), "utf8");
    const identity = await vm.runInNewContext(`${source}\nauthentication.restore()`);
    assert.equal(identity.name, "Local user");
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
