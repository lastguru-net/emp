import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import siteconfig from "../../../content/_data/siteconfig.js";
import { loadConfig } from "../../../_11ty/config.js";
import { createCmsConfig, getCmsMode, getCmsPath, validateCmsFeatures } from "./config.js";
import { buildCmsAssets, downloadCms } from "./build.js";
import { defaultScopes as githubScopes } from "../../authentication/github/index.js";
import { defaultScopes as gitlabScopes } from "../../authentication/gitlab/index.js";

const defaultStrings = {
    cms_title: "Content management", cms_sign_in_required: "Sign in to edit this site's content.",
    cms_error: "The content manager could not be loaded. Please try again.", cms_retry: "Retry",
    cms_loading: "Loading the content manager...",
    cms_back: "Back to site", sign_in: "Sign in",
    cms_other_session: "Close other content-manager tabs before changing the CMS configuration, then try again.",
};
const strings = async () => ({ ...defaultStrings, ...(await loadConfig("sitestrings"))[siteconfig.lang] });
const source = name => readFile(new URL(name, import.meta.url), "utf8");
const scriptJson = value => JSON.stringify(value).replaceAll("<", "\\u003c");

const sharedSource = async config => {
    const options = {
        backendName: config.backend.name,
        origin: config.backend.base_url ?? "https://github.com",
        clientId: siteconfig.authentication.options.clientId,
        siteUrl: siteconfig.url,
        repo: config.backend.repo,
        branch: config.backend.branch,
        scopes: siteconfig.authentication.options.scopes === undefined
            ? (config.backend.name === "github" ? githubScopes : gitlabScopes)
            : siteconfig.authentication.options.scopes,
    };
    return `const cmsOptions = ${scriptJson(options)};\n${await source("./context.js")}\n${await source("./browser.js")}`;
};
const revision = script => createHash("sha256").update(script).digest("hex").slice(0, 16);

const plugin = {
    async setup(eleventyConfig) {
        const config = createCmsConfig(siteconfig);
        if (!config) return;
        const mode = getCmsMode(siteconfig);
        if (mode === "shared") validateCmsFeatures(await loadConfig("siteelements"));
        const labels = await strings();
        const cmsPath = getCmsPath(siteconfig);
        const adminUrl = new URL(`.${cmsPath}`, siteconfig.url);
        if (mode === "shared") eleventyConfig.addGlobalData("cmsPath", cmsPath);
        const { contents, revision: assetRevision } = await downloadCms(siteconfig.plugins["sveltia-cms"].version);
        const vendorUrl = new URL(`vendor/${assetRevision}/cms.js`, adminUrl).href;
        const standaloneContext = `const cmsStandaloneContext = ${scriptJson(JSON.stringify(["standalone", siteconfig.url, config.backend]))};`;
        const sessionSource = mode === "shared" ? await sharedSource(config) : `${await source("./context.js")}\n${standaloneContext}`;
        const editorScript = `${sessionSource}\nconst cmsConfig = ${scriptJson(config)};\nconst adminVendorUrl = ${scriptJson(vendorUrl)};\nconst adminUrl = ${scriptJson(adminUrl.pathname)};\nconst cmsMode = ${scriptJson(mode)};\n${await source("./editor.js")}`;
        const editorUrl = `${adminUrl.pathname}editor/?v=${revision(editorScript)}`;
        const bootstrap = `const editorUrl = ${scriptJson(editorUrl)};\nconst adminVendorUrl = ${scriptJson(vendorUrl)};\nconst cmsLabels = ${scriptJson(labels)};\n${await source("./open-editor.js")}`;
        const script = mode === "shared" ? `${bootstrap}\n${await source("./admin.js")}`
            : `${sessionSource}\n${bootstrap}\n${await source("./standalone.js")}`;
        const templateData = { eleventyExcludeFromCollections: true, layout: false, templateEngineOverride: false };
        eleventyConfig.addTemplate("sveltia-cms-admin.njk", await source("./admin.njk"), {
            permalink: `${cmsPath}index.html`, title: labels.cms_title,
            cms: { mode, labels, scriptUrl: `${adminUrl.pathname}emp.js?v=${revision(script)}` },
        });
        eleventyConfig.addTemplate("sveltia-cms-editor.njk", await source("./editor.njk"), {
            permalink: `${cmsPath}editor/index.html`, title: labels.cms_title,
            cms: { labels, adminUrl: adminUrl.pathname, scriptUrl: `${adminUrl.pathname}editor.js?v=${revision(editorScript)}` },
        });
        eleventyConfig.addTemplate("sveltia-cms-script.njk", script, { ...templateData, permalink: `${cmsPath}emp.js` });
        eleventyConfig.addTemplate("sveltia-cms-editor-script.njk", editorScript, { ...templateData, permalink: `${cmsPath}editor.js` });
        eleventyConfig.on("eleventy.before", ({ directories }) => buildCmsAssets(resolve(directories.output, cmsPath.slice(1), "vendor", assetRevision), contents));
    },
    async js() {
        const config = createCmsConfig(siteconfig);
        if (!config || getCmsMode(siteconfig) === "standalone") return "";
        return `${await sharedSource(config)}\nauthentication.useSessionStorage(cmsSession);\n${await source("./loader.js")}`;
    },
    css() { return source("./admin.css"); },
};
export default plugin;
