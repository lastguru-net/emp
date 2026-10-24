import path from "node:path";
import siteconfig from "../content/_data/siteconfig.js";

export default async (eleventyConfig) => {
    const name = siteconfig.pagination?.postlist ?? "static";
    if (typeof name !== "string" || !/^[a-zA-Z0-9_-]+$/.test(name)) {
        throw new TypeError(`Invalid postlist name: ${String(name)}`);
    }
    const provider = (await import(`../extensions/postlist/${name}/index.js`)).default;
    eleventyConfig.addGlobalData("postlistTemplate", path.resolve(provider.template));
    eleventyConfig.addGlobalData("postlistJsTemplate", provider.js ? path.resolve(provider.js) : null);
    await provider.setup?.(eleventyConfig);

    eleventyConfig.addNunjucksFilter("postlistData", function (items = [], pagination = {}) {
        const ctx = this.ctx;
        const { lang, jsonReadPrefix } = ctx.siteconfig;
        const { postproperties, postlistThumbnail, lqip } = ctx.siteelements.features;
        const totalPages = items.length ? pagination.hrefs?.length || 1 : 0;
        return {
            items,
            url: pagination.href?.first || ctx.page.url,
            pagination: {
                page: totalPages ? (pagination.pageNumber || 0) + 1 : null,
                totalPages,
                hrefs: (pagination.hrefs || [ctx.page.url]).map(href => eleventyConfig.getFilter("url")(href))
            },
            context: {
                siteconfig: { lang, jsonReadPrefix },
                siteelements: { features: { postproperties, postlistThumbnail, lqip } },
                sitestrings: { [lang]: ctx.sitestrings[lang] },
                inlinesvg: ctx.inlinesvg
            }
        };
    });
};
