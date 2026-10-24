import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export default (eleventyConfig) => {
    const exports = new Map();
    eleventyConfig.on("eleventy.before", () => exports.clear());

    eleventyConfig.addNunjucksFilter("exportMetricsActions", ({ metrics, actions }, url) => {
        const output = url.replace(/^\/|\/$/g, "") + "/metrics-actions.json";
        exports.set(output, JSON.stringify({ metrics, actions }));
    });

    eleventyConfig.on("eleventy.after", async ({ directories }) => {
        for (const [relative, content] of exports) {
            const destination = path.join(directories.output, relative);
            await mkdir(path.dirname(destination), { recursive: true });
            await writeFile(destination, content);
        }
    });
};
