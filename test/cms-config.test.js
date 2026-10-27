import assert from "node:assert/strict";
import test from "node:test";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { createCmsConfig, getCmsMode, getCmsPath, validateCmsFeatures } from "../extensions/plugins/sveltia-cms/config.js";

const settings = (method = "github") => ({
    plugins: { "sveltia-cms": { repo: "publisher/site", branch: "content" } },
    authentication: { method, options: { clientId: "public-application-id" } },
    url: "https://example.test/blog/", lang: "lv",
});

// These tests protect the public configuration consumed by stock Sveltia, not
// provider implementation details: a wrong mapping can write to the wrong
// branch, break self-hosted GitLab, or leak a server-only credential.
test("CMS configuration uses the plugin's repository and public EMP authentication settings", () => {
    const input = settings();
    const config = createCmsConfig(input);
    assert.deepEqual(config.backend, { name: "github", repo: "publisher/site", branch: "content", auth_methods: ["token"] });
    assert.equal(config.site_url, input.url);
    assert.equal(config.display_url, input.url);
    assert.equal(config.media_folder, "content/images");
    assert.equal(config.public_folder, "/images", "store logical image URLs; EMP prefixes them at render time");
    assert.equal(config.logout_redirect_url, "/blog/admin/?logout=1");
    assert.equal(config.local_backend, false);
    input.authentication.options.scopes = ["public_repo"];
    assert.deepEqual(createCmsConfig(input).backend, config.backend, "an explicit public-repository scope remains supported");
    assert(!JSON.stringify(config).includes("exchange"), "EMP's code exchange is not Sveltia's popup auth endpoint");

    const gitlab = settings("gitlab");
    gitlab.authentication.options.origin = "https://gitlab.example.test";
    gitlab.plugins["sveltia-cms"].repo = "publisher/team/site";
    const defaultGitlab = createCmsConfig(gitlab);
    gitlab.authentication.options.scopes = "read_user api";
    assert.deepEqual(createCmsConfig(gitlab).backend, defaultGitlab.backend, "an explicit sufficient scope string remains supported");
    assert.deepEqual(createCmsConfig(gitlab).backend, {
        name: "gitlab", repo: "publisher/team/site", branch: "content", auth_methods: ["token"],
        auth_type: "pkce", app_id: "public-application-id",
        base_url: "https://gitlab.example.test", auth_endpoint: "oauth/authorize",
        api_root: "https://gitlab.example.test/api/v4", graphql_api_root: "https://gitlab.example.test/api/graphql",
    });
    gitlab.authentication.options.origin = "https://GITLAB.EXAMPLE.TEST:443";
    assert.deepEqual(createCmsConfig(gitlab).backend, defaultGitlab.backend, "CMS accepts the provider's equivalent origin spelling");
});

test("CMS collections preserve EMP's nested regular Markdown files and mixed-shape metadata", () => {
    const config = createCmsConfig(settings());
    const collections = config.collections.filter(collection => collection.folder);
    const { output } = config;
    assert.deepEqual(collections.map(({ name, folder }) => [name, folder]), [["posts", "content/posts"], ["pages", "content/pages"]]);
    for (const collection of collections) {
        assert.deepEqual(collection.nested, { subfolders: false }, "unlimited recursive lookup, not index.md directories");
        assert.equal(collection.path, undefined, "existing slugs/paths must not be rewritten into a template");
        assert.equal(collection.meta.path.index_file, undefined);
        assert.equal(collection.fields.find(field => field.name === "body").widget, "markdown");
        for (const name of ["date", "updated"]) assert.equal(collection.fields.find(field => field.name === name).widget, "string", "do not normalize date-only and timezone timestamps");
        for (const name of ["tags", "thumbnail", "meta"]) assert(!collection.fields.some(field => field.name === name), "mixed-shape and arbitrary metadata must not be normalized by restrictive widgets");
    }
    assert.equal(output.omit_empty_optional_fields, true);
    assert.equal(collections[0].fields.find(field => field.name === "title").required, false, "attached post updates may omit their heading");
});

// File targets are an authoring boundary, not an inventory of internal helpers.
test("CMS configuration editing is limited to the requested source files without structured serialization", () => {
    const { collections } = createCmsConfig(settings());
    const configuration = collections.find(collection => collection.name === "configuration");
    assert.equal(configuration.format, "raw");
    assert.deepEqual(configuration.files.map(file => file.file).sort(), [
        "assets/css/theme.css",
        "content/_data/siteauthors.json5",
        "content/_data/siteconfig.js",
        "content/_data/siteelements.json5",
        "content/_data/sitestrings.json5",
        "content/_data/sitetags.json5",
    ]);
    for (const file of configuration.files) {
        assert.equal(file.fields.length, 1);
        assert.equal(file.fields[0].name, "body");
        assert.equal(file.fields[0].widget, "code");
        assert.equal(file.fields[0].output_code_only, true, "save source text, not a code/language object");
    }
});

test("enabled CMS fails early for settings that cannot support repository authoring", () => {
    for (const [edit, expected] of [
        [site => { site.authentication.method = null; }, /authentication.method/],
        [site => { site.authentication.options.clientId = ""; }, /clientId/],
        [site => { site.authentication.options.clientSecret = "not-public"; }, /public settings only/],
        [site => { site.plugins["sveltia-cms"].repo = ""; }, /plugin's repo/],
        [site => { site.plugins["sveltia-cms"].branch = ""; }, /plugin's branch/],
        [site => { site.plugins["sveltia-cms"].version = ""; }, /CMS version/],
        [site => { site.plugins["sveltia-cms"].version = null; }, /CMS version/],
        [site => { site.plugins["sveltia-cms"].version = 1; }, /CMS version/],
        [site => { site.plugins["sveltia-cms"] = true; }, /plugin's repo/],
        [site => { site.plugins["sveltia-cms"] = {}; }, /plugin's repo/],
        [site => { site.authentication.options.scopes = []; }, /scopes/],
        [site => { site.authentication.options.scopes = ["read:user"]; }, /scopes/],
        [site => { site.authentication = settings("gitlab").authentication; site.authentication.options.scopes = []; }, /scopes/],
        [site => { site.authentication = settings("gitlab").authentication; site.authentication.options.scopes = ["read_user", "write_repository"]; }, /scopes.*api/],
        [site => { site.authentication = settings("gitlab").authentication; site.authentication.options.origin = "https://gitlab.example.test/path/"; }, /origin/],
        [site => { site.authentication = settings("gitlab").authentication; site.authentication.options.origin = "https://gitlab.example.test/"; }, /origin/],
        [site => { site.authentication = settings("gitlab").authentication; site.authentication.options.scopes = "read_user,api"; }, /scopes/],
    ]) {
        const site = settings();
        edit(site);
        assert.throws(() => createCmsConfig(site), expected);
    }
    for (const features of [
        { js: false, userMenu: true, base: "regular" },
        { js: true, userMenu: false, base: "regular" },
        { js: true, userMenu: true, base: "primitive" },
    ]) assert.throws(() => validateCmsFeatures({ features }), /shared sign-in/);
    assert.doesNotThrow(() => validateCmsFeatures({ features: { js: true, userMenu: true, base: "regular" } }));
});


test("standalone CMS uses public stock login settings without EMP authentication", () => {
    const site = settings();
    site.authentication = { method: "unused-invalid-method", options: { clientSecret: "ignored-unused-setting" } };
    site.plugins["sveltia-cms"].backend = { name: "github", base_url: "https://auth.example.test", auth_endpoint: "auth", auth_methods: ["oauth"] };
    const config = createCmsConfig(site);
    assert.equal(getCmsMode(site), "standalone");
    assert.deepEqual(config.backend, { name: "github", base_url: "https://auth.example.test", auth_endpoint: "auth", auth_methods: ["oauth"], repo: "publisher/site", branch: "content" });
    assert.equal(config.logout_redirect_url, undefined, "native CMS logout must not call an EMP provider");
    site.plugins["sveltia-cms"].backend = { name: "gitlab", auth_type: "pkce", app_id: "public-gitlab-client", base_url: "https://gitlab.example.test", api_root: "https://gitlab.example.test/api/v4" };
    assert.equal(createCmsConfig(site).backend.app_id, "public-gitlab-client");
    delete site.plugins["sveltia-cms"].backend.api_root;
    assert.equal(createCmsConfig(site).backend.api_root, "https://gitlab.example.test/api/v4");
    assert.equal(createCmsConfig(site).backend.graphql_api_root, "https://gitlab.example.test/api/graphql");
    for (const backend of [
        { name: "github", repo: "duplicate/repository" },
        { name: "github", branch: "duplicate-branch" },
        { name: "github", client_secret: "not-public" },
        { name: "github", access_token: "not-public" },
        { name: "gitlab", auth_type: "pkce" },
        { name: "gitlab", auth_type: "pkce", app_id: "public-app", base_url: "https://gitlab.example.test", api_root: "https://different.test/api/v4" },
        { name: "github", auth_type: "pkce", app_id: "unsupported" },
    ]) {
        site.plugins["sveltia-cms"].backend = backend;
        assert.throws(() => createCmsConfig(site), /plugin options|public|PKCE|pkce/);
    }
});

test("CMS links use a configurable logical folder and preserve the deployment prefix", () => {
    const site = settings();
    assert.equal(getCmsMode(site), "shared");
    assert.equal(getCmsPath(site), "/admin/");
    site.plugins["sveltia-cms"].path = "/tools/editor/";
    assert.equal(getCmsPath(site), "/tools/editor/");
    assert.equal(createCmsConfig(site).logout_redirect_url, "/blog/tools/editor/?logout=1");
    site.plugins["sveltia-cms"].path = "/editor:v2/";
    assert.equal(createCmsConfig(site).logout_redirect_url, "/blog/editor:v2/?logout=1");
    for (const path of ["/", "https://other.test/editor/", "//other.test/editor/", "/../editor/", "/tools/../editor/", "/editor/?query=1", "/editor/#fragment", "/%2e%2e/editor/", "/editor\\unsafe/"]) {
        site.plugins["sveltia-cms"].path = path;
        assert.throws(() => createCmsConfig(site), /CMS path/);
    }
});

test("disabled CMS ignores unused authoring settings", () => {
    for (const plugins of [undefined, {}, { "sveltia-cms": false }]) {
        assert.equal(createCmsConfig({ plugins, authentication: { method: "unknown" } }), null);
    }
});

// Exercise Eleventy templates and real asset delivery with an intercepted CDN.
// Browser checks separately exercise the published distribution itself.
test("opt-in CMS renders through the site layout without adding public collection entries", async t => {
    const fixture = await mkdtemp(new URL("../.test-cms-", import.meta.url));
    t.after(() => rm(fixture, { recursive: true, force: true }));
    for (const dir of ["_11ty", "extensions/plugins", "extensions/authentication", "content/_data", "content/_includes"]) await mkdir(join(fixture, dir), { recursive: true });
    await cp(new URL("../extensions/plugins/sveltia-cms", import.meta.url), join(fixture, "extensions/plugins/sveltia-cms"), { recursive: true });
    for (const method of ["github", "gitlab"]) await cp(new URL(`../extensions/authentication/${method}`, import.meta.url), join(fixture, `extensions/authentication/${method}`), { recursive: true });
    for (const name of ["plugins", "authentication", "config"]) await cp(new URL(`../_11ty/${name}.js`, import.meta.url), join(fixture, `_11ty/${name}.js`));
    const write = (name, body) => writeFile(join(fixture, name), body);
    await write("package.json", '{"type":"module"}');
    await write("mock-cms-fetch.js", `globalThis.fetch = async url => {
    if (!url.startsWith("https://unpkg.com/@sveltia/cms@")) throw new Error("Unexpected download: " + url);
    return new Response("export default " + JSON.stringify({ source: url }) + ";");
};`);
    await write("eleventy.config.mjs", `import plugins from "./_11ty/plugins.js";
export default config => { config.addPlugin(plugins); return {dir:{input:"content"}}; };`);
    await write("content/_data/siteelements.json5", JSON.stringify({ features: { js: true, userMenu: true, base: "regular" } }));
    await write("content/_data/sitestrings.json5", JSON.stringify({ lv: { cms_title: "Redaktors", sign_in: "Pierakstities" } }));
    await write("content/index.njk", '<h1>Public page</h1>');
    await write("content/_includes/base.njk", '<html><head><title>{{ title }} - Test site</title><meta name="robots" content="{{ meta.robots.value }}"></head><body><nav>Site navigation</nav><main>{{ content | safe }}</main></body></html>');
    await write("content/publicjs.njk", '---\npermalink: /public.js\neleventyExcludeFromCollections: true\n---\n{% pluginsJs %}');
    await write("content/report.njk", '---\npermalink: /entries.txt\neleventyExcludeFromCollections: true\n---\n{% for entry in collections.all %}{{ entry.url }}\n{% endfor %}');
    const build = () => promisify(execFile)(process.execPath, ["--import", join(fixture, "mock-cms-fetch.js"), new URL("../node_modules/@11ty/eleventy/cmd.cjs", import.meta.url).pathname, "--quiet"], { cwd: fixture });
    const config = settings();
    config.plugins["sveltia-cms"] = false;
    config.authentication.method = "unused-invalid-method";
    await write("content/_data/siteconfig.js", `export default ${JSON.stringify(config)}`);
    await build();
    assert(!(await readdir(join(fixture, "_site"))).includes("admin"), "disabled sites emit no admin resources");
    await rm(join(fixture, "_site"), { recursive: true });
    config.plugins["sveltia-cms"] = settings().plugins["sveltia-cms"];
    config.authentication.method = "github";
    await write("content/_data/siteconfig.js", `export default ${JSON.stringify(config)}`);
    await build();
    const read = file => readFile(join(fixture, "_site", file), "utf8");
    const admin = await read("admin/index.html");
    assert.match(admin, /<title>Redaktors - Test site<\/title>/);
    assert.match(admin, /name="robots" content="noindex,nofollow"/);
    assert.match(admin, /<nav>Site navigation<\/nav><main>/);
    assert.match(admin, /data-cms-script="\/blog\/admin\/emp.js\?v=[a-f0-9]{16}"/);
    const gateBootstrap = await read("admin/emp.js");
    assert.doesNotMatch(gateBootstrap, /const authenticationOptions|const cmsSession/, "the gate must reuse the public site's authentication instance");
    const editor = await read("admin/editor/index.html");
    assert.doesNotMatch(editor, /Site navigation|stylesheet/, "stock Sveltia gets its own document without site UI or CSS");
    assert.match(editor, /src="\/blog\/admin\/editor.js\?v=[a-f0-9]{16}"/);
    const bootstrap = await read("admin/editor.js");
    assert.doesNotMatch(bootstrap, /const authenticationOptions/, "the editor reads shared storage without creating another EMP controller");
    assert.deepEqual(JSON.parse(bootstrap.match(/const cmsConfig = (.+);/)[1]), createCmsConfig(config));
    assert.match(bootstrap, /const cmsConfig = /, "bootstrap carries its matching configuration rather than fetching a potentially stale config URL");
    const vendorUrl = JSON.parse(bootstrap.match(/const adminVendorUrl = ("[^"\n]+")/)[1]);
    assert.match(vendorUrl, /^https:\/\/example\.test\/blog\/admin\/vendor\/[a-f0-9]{16}\/cms.js$/);
    const vendorDirectory = new URL(vendorUrl).pathname.replace(/^\/blog\//, "").replace(/\/cms\.js$/, "");
    const vendorFiles = await readdir(join(fixture, "_site", vendorDirectory));
    assert.deepEqual(vendorFiles, ["cms.js"], "only the main distribution is downloaded");
    assert.match(await read(`${vendorDirectory}/cms.js`), /@sveltia\/cms@latest\/dist\/sveltia-cms\.mjs/);
    assert.equal((await read("index.html")).trim(), "<h1>Public page</h1>", "CMS does not inject its editor into public HTML");
    assert.doesNotMatch(await read("entries.txt"), /admin/, "CMS resources never enter public collections");

    // A changed edit target must not reuse cached bootstrap/config from the
    // previous deployment, while unchanged CMS bytes remain reusable.
    config.plugins["sveltia-cms"].branch = "new-content";
    await write("content/_data/siteconfig.js", `export default ${JSON.stringify(config)}`);
    await build();
    const updatedAdmin = await read("admin/index.html");
    assert.notEqual(updatedAdmin.match(/emp\.js\?v=[a-f0-9]{16}/)[0], admin.match(/emp\.js\?v=[a-f0-9]{16}/)[0]);
    const updatedBootstrap = await read("admin/editor.js");
    assert.equal(JSON.parse(updatedBootstrap.match(/const cmsConfig = (.+);/)[1]).backend.branch, "new-content");
    assert.equal(JSON.parse(updatedBootstrap.match(/const adminVendorUrl = ("[^"\n]+")/)[1]), vendorUrl);

    // Site owners can select a release without changing EMP, in either mode.
    config.plugins["sveltia-cms"].version = "0.250.1";
    await write("content/_data/siteconfig.js", `export default ${JSON.stringify(config)}`);
    await build();
    const versionedBootstrap = await read("admin/editor.js");
    const versionedUrl = JSON.parse(versionedBootstrap.match(/const adminVendorUrl = ("[^"\n]+")/)[1]);
    assert.notEqual(versionedUrl, vendorUrl, "different downloaded bytes change the vendor URL");
    assert.notEqual((await read("admin/index.html")).match(/emp\.js\?v=[a-f0-9]{16}/)[0], updatedAdmin.match(/emp\.js\?v=[a-f0-9]{16}/)[0], "the bootstrap URL follows the new asset");
    assert.match(await read(new URL(versionedUrl).pathname.replace(/^\/blog\//, "")), /@sveltia\/cms@0\.250\.1\/dist\/sveltia-cms\.mjs/);
    assert.equal(JSON.parse(versionedBootstrap.match(/const cmsConfig = (.+);/)[1]).version, undefined, "the download setting is not a stock CMS config field");

    // Standalone native login also works on sites with all EMP user features off.
    await rm(join(fixture, "_site"), { recursive: true });
    config.plugins["sveltia-cms"] = { ...settings().plugins["sveltia-cms"], version: "0.250.1", path: "/tools/editor/", backend: { name: "github", auth_methods: ["token"] } };
    config.authentication = { method: "unused-invalid-method" };
    await write("content/_data/siteconfig.js", `export default ${JSON.stringify(config)}`);
    await write("content/_data/siteelements.json5", JSON.stringify({ features: { js: false, userMenu: false, base: "primitive" } }));
    await build();
    assert(!(await readdir(join(fixture, "_site"))).includes("admin"));
    const standaloneHtml = await read("tools/editor/index.html");
    assert.match(standaloneHtml, /src="\/blog\/tools\/editor\/emp.js\?v=[a-f0-9]{16}"/);
    const standaloneBootstrap = await read("tools/editor/editor.js");
    assert.match(standaloneBootstrap, /const cmsStandaloneContext = /);
    assert.doesNotMatch(standaloneBootstrap, /const authenticationOptions = /);
    assert.equal((await read("public.js")).trim(), "", "standalone mode emits no EMP credential bridge on public pages");
    const standaloneVendor = JSON.parse(standaloneBootstrap.match(/const adminVendorUrl = ("[^"\n]+")/)[1]);
    assert.match(standaloneVendor, /\/blog\/tools\/editor\/vendor\/[a-f0-9]{16}\/cms.js$/);
    assert.match(await read(new URL(standaloneVendor).pathname.replace(/^\/blog\//, "")), /@sveltia\/cms@0\.250\.1\/dist\/sveltia-cms\.mjs/);
    assert.equal(JSON.parse(standaloneBootstrap.match(/const cmsConfig = (.+);/)[1]).backend.repo, "publisher/site");
});
