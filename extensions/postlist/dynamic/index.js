import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export default {
    template: "extensions/postlist/dynamic/postlist.njk",
    js: "extensions/postlist/dynamic/js.njk",
    setup(eleventyConfig) {
        const exports = new Map();
        eleventyConfig.on("eleventy.before", () => exports.clear());

        eleventyConfig.addFilter("postlistJson", (list) => {
            const directory = list.url + "postlist/";
            const { page, totalPages } = list.pagination;
            const { jsonReadPrefix, ...siteconfig } = list.context.siteconfig;
            exports.set(directory.replace(/^\//, "") + (page || 1) + ".json",
                JSON.stringify({ items: list.items, pagination: { page, totalPages } }));
            return {
                readUrl: (jsonReadPrefix || "").replace(/\/+$/, "") + eleventyConfig.getFilter("url")(directory),
                context: { ...list.context, siteconfig }
            };
        });

        eleventyConfig.on("eleventy.after", async ({ directories }) => {
            for (const [relative, content] of exports) {
                const destination = path.join(directories.output, relative);
                await mkdir(path.dirname(destination), { recursive: true });
                await writeFile(destination, content);
            }
        });
    },
};
