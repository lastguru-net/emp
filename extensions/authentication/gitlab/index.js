import { readFileSync } from "node:fs";

export default {
    browser(options, siteUrl) {
        options = { ...options, redirectUri: new URL(siteUrl).href };
        return `const authenticationOptions = ${JSON.stringify(options)};\n${readFileSync(new URL("./browser.js", import.meta.url), "utf8")}`;
    },
};
