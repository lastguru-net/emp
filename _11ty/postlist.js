import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { jsonReadUrl } from "../assets/js/post-card.js";

export default (eleventyConfig) => {
    const exports = new Map();
    eleventyConfig.on("eleventy.before", () => exports.clear());

    eleventyConfig.addNunjucksFilter("exportMetricsActions", ({ metrics, actions }, url) => {
        const output = url.replace(/^\/|\/$/g, "") + "/metrics-actions.json";
        exports.set(output, JSON.stringify({ metrics, actions }));
    });

    eleventyConfig.addNunjucksFilter("postlistData", function (items = [], pagination = {}) {
        const ctx = this.ctx;
        const first = pagination.href?.first || ctx.page.url;
        const directory = first + "postlist/";
        const readUrl = jsonReadUrl(eleventyConfig.getFilter("url")(directory), ctx.siteconfig.jsonReadPrefix);
        const number = (pagination.pageNumber || 0) + 1;
        const { lang, url, internalUrls } = ctx.siteconfig;
        const strings = ctx.sitestrings[lang];
        const { postproperties, postlistThumbnail, lqip } = ctx.siteelements.features;
        // List cards render metrics/actions supplied by the list response.
        // Select the configuration to embed in the page, not the full Eleventy context.
        const context = {
            siteconfig: { lang, url, internalUrls },
            siteelements: { features: { postproperties, postlistThumbnail, lqip } },
            sitestrings: { [lang]: strings },
            inlinesvg: ctx.inlinesvg
        };
        const totalPages = items.length ? pagination.hrefs?.length || 1 : 0;
        const data = { items, pagination: { page: totalPages ? number : null, totalPages } };
        const output = directory.replace(/^\//, "") + number + ".json";
        exports.set(output, JSON.stringify(data));
        return { readUrl, number, context };
    });

    eleventyConfig.on("eleventy.after", async ({ directories }) => {
        for (const [relative, content] of exports) {
            const destination = path.join(directories.output, relative);
            await mkdir(path.dirname(destination), { recursive: true });
            await writeFile(destination, content);
        }
    });
};
