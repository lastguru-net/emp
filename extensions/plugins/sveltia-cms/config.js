import collections from "./collections.json" with { type: "json" };
import { defaultScopes as githubScopes } from "../../authentication/github/index.js";
import { defaultScopes as gitlabScopes } from "../../authentication/gitlab/index.js";

const fail = message => { throw new Error(`[sveltia-cms] ${message}`); };
const nonempty = value => typeof value === "string" && value.trim().length > 0;
const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);

export const getCmsMode = site => {
    const plugin = site.plugins?.["sveltia-cms"];
    if (!plugin) return null;
    if (plugin === true) return "shared";
    if (!isObject(plugin) || Object.keys(plugin).some(key => !["repo", "branch", "backend", "path", "version"].includes(key))) fail("Set repo and branch in the sveltia-cms plugin options; optional settings are backend, path and version.");
    if (plugin.version !== undefined && !nonempty(plugin.version)) fail("The CMS version must be a nonempty npm version or tag, such as latest.");
    if (!Object.hasOwn(plugin, "backend")) return "shared";
    if (!isObject(plugin.backend)) fail("The standalone backend must be a public stock Sveltia backend object.");
    return "standalone";
};

// Logical site-root path; deployment prefixes belong to siteconfig.url.
export const getCmsPath = site => {
    const configured = site.plugins?.["sveltia-cms"];
    const path = isObject(configured) && configured.path !== undefined ? configured.path : "/admin/";
    if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//") || path === "/" || /[\s\x00-\x1f\x7f?#%\\]/.test(path) || path.includes("//") || path.split("/").some(segment => [".", ".."].includes(segment))) fail("The CMS path must be an unencoded site-root-relative folder, such as /admin/ or /tools/editor/, without traversal, query or fragment.");
    return path.endsWith("/") ? path : `${path}/`;
};

const publicUrl = (value, name) => {
    let url;
    try { url = new URL(value); } catch { fail(`${name} must be an absolute HTTPS URL.`); }
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) fail(`${name} must be an HTTPS URL without credentials, query or fragment.`);
    return url;
};

const standaloneBackend = backend => {
    // A deliberately bounded subset of stock backend options, not an alternative
    // config editor. Repository/branch and content locations have one owner.
    const allowed = ["name", "base_url", "auth_endpoint", "app_id", "auth_type", "api_root", "graphql_api_root", "auth_scope", "auth_methods", "include_credentials", "site_domain"];
    for (const key of Object.keys(backend)) {
        if (["repo", "branch"].includes(key)) fail(`Set ${key} directly in the sveltia-cms plugin options, not in backend.`);
        if (!allowed.includes(key)) fail(`Unsupported standalone backend setting: ${key}. Only public stock authentication/API settings are accepted.`);
    }
    if (!["github", "gitlab"].includes(backend.name)) fail("The standalone backend.name must be github or gitlab.");
    for (const key of ["base_url", "api_root", "graphql_api_root"]) if (backend[key] !== undefined) publicUrl(backend[key], `backend.${key}`);
    for (const key of ["auth_endpoint", "app_id", "site_domain"]) if (backend[key] !== undefined && !nonempty(backend[key])) fail(`backend.${key} must be a nonempty public string.`);
    if (backend.auth_type !== undefined && backend.auth_type !== "" && !(backend.name === "gitlab" && backend.auth_type === "pkce")) fail("Only GitLab supports backend.auth_type: pkce; implicit authentication is unsupported.");
    if (backend.auth_type === "pkce" && !nonempty(backend.app_id)) fail("GitLab PKCE requires the public backend.app_id.");
    if (backend.name === "gitlab" && backend.auth_type === "pkce") {
        const base = (backend.base_url ?? "https://gitlab.com").replace(/\/+$/, "");
        backend = { ...backend, api_root: backend.api_root ?? `${base}/api/v4`, graphql_api_root: backend.graphql_api_root ?? `${base}/api/graphql` };
        const origin = new URL(base).origin;
        if (new URL(backend.api_root).origin !== origin || new URL(backend.graphql_api_root).origin !== origin) fail("GitLab PKCE backend.base_url, api_root and graphql_api_root must use the same provider origin.");
    }
    if (backend.include_credentials !== undefined && typeof backend.include_credentials !== "boolean") fail("backend.include_credentials must be a boolean.");
    if (backend.auth_methods !== undefined && (!Array.isArray(backend.auth_methods) || !backend.auth_methods.length || backend.auth_methods.some(method => !["oauth", "token"].includes(method)))) fail("backend.auth_methods must contain oauth and/or token.");
    if (backend.auth_scope !== undefined) {
        const scopes = Array.isArray(backend.auth_scope) ? backend.auth_scope : [backend.auth_scope];
        if (backend.name !== "github" || !scopes.some(scope => ["repo", "public_repo"].includes(scope)) || scopes.some(scope => !["repo", "public_repo", "workflow"].includes(scope))) fail("GitHub backend.auth_scope must include repo or public_repo, optionally workflow.");
    }
    return structuredClone(backend);
};

const sharedBackend = authentication => {
    const { method, options = {} } = authentication ?? {};
    if (!["github", "gitlab"].includes(method)) fail("Shared sign-in requires authentication.method github or gitlab; supply plugin.backend for standalone CMS login.");
    if (!nonempty(options.clientId)) fail("authentication.options.clientId is required (a public OAuth client ID).");
    if (Object.keys(options).some(key => /secret|password|access.?token|refresh.?token/i.test(key))) fail("authentication.options must contain public settings only; do not put credentials in site configuration.");
    const requestedScopes = options.scopes === undefined ? (method === "github" ? githubScopes : gitlabScopes) : options.scopes;
    const scopes = typeof requestedScopes === "string" ? requestedScopes.split(/\s+/).filter(Boolean) : requestedScopes;
    if (!Array.isArray(scopes) || scopes.some(scope => !nonempty(scope)) ||
        (method === "github" ? !scopes.some(scope => ["repo", "public_repo"].includes(scope)) : !scopes.includes("api"))) {
        fail(`authentication.options.scopes must include ${method === "github" ? "repo (or public_repo for a public repository)" : "api"} for CMS repository writes.`);
    }
    const backend = { name: method, auth_methods: ["token"] };
    if (method === "gitlab") {
        const origin = publicUrl(options.origin ?? "https://gitlab.com", "GitLab authentication.options.origin");
        if (origin.pathname !== "/" || (options.origin !== undefined && /[/?#]$/.test(options.origin))) fail("GitLab authentication.options.origin must be an HTTPS origin, without a trailing slash or path.");
        Object.assign(backend, {
            auth_type: "pkce", app_id: options.clientId,
            base_url: origin.origin, auth_endpoint: "oauth/authorize",
            api_root: `${origin.origin}/api/v4`, graphql_api_root: `${origin.origin}/api/graphql`,
        });
    }
    return backend;
};

export const createCmsConfig = site => {
    const mode = getCmsMode(site);
    if (!mode) return null;
    const cmsPath = getCmsPath(site);
    const backend = mode === "standalone" ? standaloneBackend(site.plugins["sveltia-cms"].backend) : sharedBackend(site.authentication);
    const { repo, branch } = site.plugins["sveltia-cms"];
    if (!nonempty(repo) || !/^[^\s/:]+(?:\/[^\s/:]+)+$/.test(repo) || (backend.name === "github" && repo.split("/").length !== 2)) fail("The sveltia-cms plugin's repo must be an owner/repository path (GitLab subgroups are supported).");
    if (!nonempty(branch)) fail("The sveltia-cms plugin's branch is required; select the branch to edit explicitly.");
    Object.assign(backend, { repo, branch });
    const siteUrl = publicUrl(site.url, "siteconfig.url");
    if (!siteUrl.pathname.endsWith("/")) fail("siteconfig.url must end in /.");
    return {
        backend,
        site_url: siteUrl.href,
        display_url: siteUrl.href,
        ...(mode === "shared" ? { logout_redirect_url: `${new URL(`.${cmsPath}`, siteUrl).pathname}?logout=1` } : {}),
        local_backend: false,
        media_folder: "content/images",
        public_folder: "/images",
        output: { omit_empty_optional_fields: true },
        editor: { preview: false },
        collections: structuredClone(collections),
    };
};

export const validateCmsFeatures = elements => {
    const features = elements?.features;
    if (!features?.js || !features.userMenu || features.base !== "regular") fail("The shared sign-in integration requires siteelements.features.js and userMenu enabled, with base: regular.");
};
