import { readFileSync } from "node:fs";

export const defaultScopes = "api";

export default {
    browser(options, siteUrl) {
        options = {
            ...options,
            scopes: options.scopes === undefined ? defaultScopes : options.scopes,
            redirectUri: new URL(siteUrl).href,
        };
        return `const authenticationOptions = ${JSON.stringify(options)};\n${readFileSync(new URL("./browser.js", import.meta.url), "utf8")}`;
    },
};
