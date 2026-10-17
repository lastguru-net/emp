import { readFileSync } from "node:fs";

export default {
    browser(options, siteUrl) {
        options = {
            ...options,
            redirectUri: new URL(siteUrl).href,
            exchangeUrl: new URL("api/auth/github/exchange", siteUrl).href,
        };
        return `const authenticationOptions = ${JSON.stringify(options)};\n${readFileSync(new URL("./browser.js", import.meta.url), "utf8")}`;
    },

    cloudflare(base, { authentication, url }, output) {
        if (base.env && Object.keys(base.env).length) {
            throw new Error("Generate Cloudflare configuration from an environment-resolved wrangler.json (without env blocks).");
        }
        if (base.main) throw new Error("Integrate GitHub authentication with the existing Wrangler main entry point before building.");

        const clientId = authentication.options?.clientId;
        const callback = new URL(url);
        if (!clientId || callback.protocol !== "https:" || callback.search || callback.hash || callback.username || callback.password || !callback.pathname.endsWith("/")) {
            throw new Error("GitHub authentication requires a clientId and an HTTPS homepage siteconfig.url ending in /, without credentials, query or fragment.");
        }
        const exchangePath = new URL("api/auth/github/exchange", callback).pathname;
        return {
            ...base,
            main: "extensions/authentication/github/worker/src/index.js",
            assets: {
                ...base.assets,
                directory: output,
                binding: "ASSETS",
                run_worker_first: base.assets?.run_worker_first === true ? true
                    : [...new Set([...(base.assets?.run_worker_first || []), exchangePath])],
            },
            vars: {
                ...base.vars,
                CLIENT_ID: clientId,
                REDIRECT_URI: callback.href,
                ALLOWED_ORIGINS: callback.origin,
                EXCHANGE_PATH: exchangePath,
            },
        };
    },
};
