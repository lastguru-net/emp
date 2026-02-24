// Full-text MiniSearch index builder (async Nunjucks filter)
import MiniSearch from "minisearch";
import siteconfig from "../content/_data/siteconfig.js";
import { loadConfig } from "./config.js";
import { extractExcerpt } from "./excerpt.js";

const stripTags = (value = "") => String(value).replace(/<[^>]*>/g, " ");
const collapseWhitespace = (value = "") => String(value).replace(/\s+/g, " ").trim();
const toArray = (value) => Array.isArray(value) ? value : (value ? [value] : []);
const stripFrontMatter = (value = "") => String(value).replace(/^---\s*[\r\n]+[\s\S]*?[\r\n]+---\s*[\r\n]*/, "");
const capitalize = (value = "") => {
    const text = String(value);
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
};

// Strip Markdown formatting to extract plain text for indexing
const stripMarkdown = (value = "") => String(value)
    .replace(/^```[\w-]*\s*$/gm, "")
    .replace(/^~~~[\w-]*\s*$/gm, "")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/==(.*?)==/g, "$1")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s{0,3}([-*+]|\d+\.)\s+/gm, "");

const indexOptions = {
    idField: "id",
    fields: ["title", "excerpt", "content", "tags"],
    storeFields: ["id", "url", "title", "excerpt", "tags", "date"]
};

const buildSearchIndex = async (allItems) => {
    const sitetags = await loadConfig("sitetags");
    const sitestrings = await loadConfig("sitestrings");
    const localizedStrings = sitestrings[siteconfig.lang];

    const docs = (allItems || [])
        .filter((item) => {
            if (!item || item.data?.hidden === true) return false;
            const tags = toArray(item.data?.tags);
            return tags.includes("posts") || tags.includes("pages");
        })
        .map((item) => {
            const tags = toArray(item.data?.tags)
                .filter((tag) => !sitetags.notag.includes(tag))
                .map((tag) => capitalize(localizedStrings[tag] || tag));
            const sourceContent = stripFrontMatter(item.rawInput).trim();
            const excerpt = item.data.excerpt || extractExcerpt(stripMarkdown(sourceContent), 250);
            const content = collapseWhitespace(stripMarkdown(stripTags(sourceContent)));
            const date = item.date instanceof Date ? item.date.toISOString() : item.date;

            return {
                id: item.url,
                url: item.url,
                title: item.data.title,
                excerpt,
                content,
                tags,
                date
            };
        })
        .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    const miniSearch = new MiniSearch(indexOptions);
    miniSearch.addAll(docs);

    return JSON.stringify({
        options: indexOptions,
        searchOptions: { prefix: true, fuzzy: 0.2 },
        strings: {
            noResults: localizedStrings.search_no_results,
            placeholder: localizedStrings.search_placeholder
        },
        index: miniSearch.toJSON()
    });
};

export default (eleventyConfig) => {
    eleventyConfig.addNunjucksAsyncFilter("buildSearchIndex", (allItems, callback) => {
        buildSearchIndex(allItems).then((result) => callback(null, result)).catch(callback);
    });
};