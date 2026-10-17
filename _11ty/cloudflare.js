import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import JSON5 from "json5";
import { loadAuthenticationMethod } from "./authentication.js";

export default (eleventyConfig) => {
    eleventyConfig.addWatchTarget("./wrangler.json");
    eleventyConfig.on("eleventy.after", async ({ directories }) => {
        // Global data changes do not invalidate config-plugin imports in watch mode.
        const { default: siteconfig } = await import(`../content/_data/siteconfig.js?cloudflare=${Date.now()}`);
        const provider = await loadAuthenticationMethod(siteconfig.authentication);
        if (!provider?.cloudflare) {
            // Stop redirecting Wrangler when this integration is disabled. Leave
            // redirects owned by another build tool alone.
            try {
                const redirect = JSON.parse(await readFile(".wrangler/deploy/config.json", "utf8"));
                if (redirect.configPath === "../../wrangler.generated.json") {
                    await rm(".wrangler/deploy/config.json");
                    await rm("wrangler.generated.json", { force: true });
                }
            } catch (error) {
                if (error.code !== "ENOENT" && !(error instanceof SyntaxError)) throw error;
            }
            return;
        }
        try {
            const redirect = JSON.parse(await readFile(".wrangler/deploy/config.json", "utf8"));
            if (redirect.configPath !== "../../wrangler.generated.json") {
                throw new Error("Wrangler already redirects to another generated configuration; integrate authentication with that build instead.");
            }
        } catch (error) {
            if (error.code !== "ENOENT") throw error;
        }
        const base = JSON5.parse(await readFile("wrangler.json", "utf8"));
        const config = await provider.cloudflare(base, siteconfig, directories.output);
        // Keep relative paths anchored to the project root, outside public assets.
        await writeFile("wrangler.generated.json", JSON.stringify(config, null, 4) + "\n");
        await mkdir(".wrangler/deploy", { recursive: true });
        await writeFile(".wrangler/deploy/config.json", JSON.stringify({ configPath: "../../wrangler.generated.json" }) + "\n");
    });
};
