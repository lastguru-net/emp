import assert from "node:assert/strict";
import { copyFile, cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import vm from "node:vm";
import github from "../extensions/authentication/github/index.js";
import { renderAuthenticationMethod } from "../_11ty/authentication.js";

const { cloudflare: cloudflareConfig } = github;
const base = {
    name: "existing-site", compatibility_date: "2026-09-22",
    observability: { enabled: true }, routes: [{ pattern: "example.com", custom_domain: true }],
    assets: { directory: "_site", html_handling: "auto-trailing-slash" }, vars: { KEEP: "value" },
};
const authentication = { method: "github", options: { clientId: "public-client" } };
const siteconfig = { url: "https://example.com/blog/", authentication };

test("Cloudflare and browser share a prefixed exchange route on the existing site", async () => {
    const config = cloudflareConfig(base, siteconfig, "custom-output");
    assert.equal(config.name, base.name);
    assert.deepEqual(config.routes, base.routes);
    assert.deepEqual(config.observability, base.observability);
    assert.deepEqual(config.assets, {
        directory: "custom-output", html_handling: "auto-trailing-slash", binding: "ASSETS",
        run_worker_first: ["/blog/api/auth/github/exchange"],
    });
    assert.deepEqual(config.vars, {
        KEEP: "value", CLIENT_ID: "public-client", REDIRECT_URI: "https://example.com/blog/",
        ALLOWED_ORIGINS: "https://example.com", EXCHANGE_PATH: "/blog/api/auth/github/exchange",
    });
    const browser = await renderAuthenticationMethod(authentication, siteconfig.url);
    const context = {};
    vm.runInNewContext(`${browser}\nglobalThis.options = authenticationOptions;`, context);
    assert.equal(context.options.exchangeUrl, new URL(config.vars.EXCHANGE_PATH, siteconfig.url).href);
    assert.equal("CLIENT_SECRET" in config.vars, false);
});

test("GitHub requires explicit integration with existing Worker and environment configurations", () => {
    assert.throws(() => cloudflareConfig({ ...base, main: "own-worker.js" }, siteconfig, "_site"), /existing Wrangler main/);
    assert.throws(() => cloudflareConfig({ ...base, env: { staging: {} } }, siteconfig, "_site"), /environment-resolved/);
});

test("Cloudflare rejects invalid OAuth setup and preserves existing worker-first patterns", () => {
    for (const url of ["http://example.com/", "https://example.com/blog", "https://example.com/?query", "https://user@example.com/", "https://example.com/#hash"]) {
        assert.throws(() => cloudflareConfig(base, { ...siteconfig, url }, "_site"), /HTTPS homepage/);
    }
    for (const routing of [true, ["/existing/*"]]) {
        const config = cloudflareConfig({ ...base, assets: { ...base.assets, run_worker_first: routing } }, siteconfig, "_site");
        assert.deepEqual(config.assets.run_worker_first, routing === true ? true : ["/existing/*", "/blog/api/auth/github/exchange"]);
    }
});

test("build hook leaves non-GitHub deployments alone and removes its redirect when disabled", async (t) => {
    const original = process.cwd();
    // Keep package resolution anchored to this project's installed dependencies.
    const fixture = await mkdtemp(new URL("../.test-cloudflare-", import.meta.url));
    t.after(async () => { process.chdir(original); await rm(fixture, { recursive: true, force: true }); });
    await mkdir(join(fixture, "_11ty"), { recursive: true });
    await mkdir(join(fixture, "content/_data"), { recursive: true });
    await mkdir(join(fixture, ".wrangler/deploy"), { recursive: true });
    await writeFile(join(fixture, "package.json"), '{"type":"module"}');
    await copyFile(new URL("../_11ty/cloudflare.js", import.meta.url), join(fixture, "_11ty/cloudflare.js"));
    await copyFile(new URL("../_11ty/authentication.js", import.meta.url), join(fixture, "_11ty/authentication.js"));
    await cp(new URL("../extensions/authentication", import.meta.url), join(fixture, "extensions/authentication"), { recursive: true });
    let revision = Date.now();
    t.mock.method(Date, "now", () => ++revision);
    const select = value => writeFile(join(fixture, "content/_data/siteconfig.js"), `export default ${JSON.stringify({ ...siteconfig, authentication: value })};`);
    let afterBuild;
    const plugin = await import(pathToFileURL(join(fixture, "_11ty/cloudflare.js")));
    plugin.default({ addWatchTarget() {}, on(event, callback) { if (event === "eleventy.after") afterBuild = callback; } });
    process.chdir(fixture);
    const build = () => afterBuild({ directories: { output: "_site" } });

    await select(null);
    await build(); // A static build does not require wrangler.json.
    const otherRedirect = '{"configPath":"../../another-tool.json"}';
    await writeFile(".wrangler/deploy/config.json", otherRedirect);
    await writeFile("wrangler.json", JSON.stringify({ ...base, env: { staging: {} } }));
    await build();
    assert.equal(await readFile(".wrangler/deploy/config.json", "utf8"), otherRedirect);
    await assert.rejects(readFile("wrangler.generated.json"), { code: "ENOENT" });

    // Wrangler accepts JSONC in wrangler.json, including comments and trailing commas.
    await writeFile("wrangler.json", `{ // Existing site configuration\n${JSON.stringify(base).slice(1, -1)},\n}`);
    await select(authentication);
    await assert.rejects(build(), /already redirects/);
    assert.equal(await readFile(".wrangler/deploy/config.json", "utf8"), otherRedirect);
    await assert.rejects(readFile("wrangler.generated.json"), { code: "ENOENT" });
    await rm(".wrangler/deploy/config.json");
    await build();
    const generated = JSON.parse(await readFile("wrangler.generated.json", "utf8"));
    assert.equal(generated.main, "extensions/authentication/github/worker/src/index.js");
    assert.equal(generated.vars.CLIENT_ID, "public-client");
    assert.equal(generated.vars.REDIRECT_URI, siteconfig.url);
    await select(null);
    await rm("wrangler.json");
    await build();
    await assert.rejects(readFile(".wrangler/deploy/config.json"), { code: "ENOENT" });
    await assert.rejects(readFile("wrangler.generated.json"), { code: "ENOENT" });
});
