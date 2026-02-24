import siteconfig from "../content/_data/siteconfig.js";

const stripTags = (value = "") => value.replace(/<[^>]*>/g, " ");
const collapseWhitespace = (value = "") => value.replace(/\s+/g, " ").trim();
export const extractExcerpt = (text = "", limit = 250) => {
    const plain = stripTags(text);
    if (!plain) return "";
    const newlineIndex = plain.indexOf("\n");
    const firstLineLimit = newlineIndex > 0 ? newlineIndex : plain.length;
    let sliceEnd;
    if (firstLineLimit <= limit) {
        sliceEnd = firstLineLimit;
    } else {
        const limitCap = Math.min(firstLineLimit, limit);
        const wordCap = plain.lastIndexOf(" ", limitCap);
        sliceEnd = wordCap > 0 ? wordCap : limitCap;
    }
    let excerpt = collapseWhitespace(plain.slice(0, sliceEnd));
    if (sliceEnd < plain.length) {
        excerpt += "…";
    }
    return excerpt;
};

const findCollectionItem = (collections = {}, page = {}) => {
    if (!collections.all || !page.url) {
        return undefined;
    }
    return collections.all.find((entry) => entry.url === page.url);
};

const deriveShortDescription = (ctx = {}) => {
    let source = "";
    if (ctx.excerpt) {
        source = ctx.excerpt;
    } else if (ctx.page && ctx.title && !ctx.posts) {
        const pageEntry = findCollectionItem(ctx.collections, ctx.page);
        source = pageEntry?.templateContent || "";
    } else {
        source = siteconfig.description || "";
    }
    return extractExcerpt(source, 150);
};

const getExcerpt = (article = {}) => {
    return extractExcerpt(article.templateContent || "", 250);
};

export default (eleventyConfig) => {
    eleventyConfig.addShortcode("getExcerpt", getExcerpt);
    eleventyConfig.addNunjucksShortcode("getShortDescription", function () {
        return deriveShortDescription(this.ctx);
    });
};