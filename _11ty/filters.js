// Shared value helpers and general-purpose Nunjucks filters
import { URL } from "node:url";
import markdownIt from "markdown-it";
import baseSlugify from "@sindresorhus/slugify";
import siteconfig from "../content/_data/siteconfig.js";
import { loadConfig } from "./config.js";

// Normalise a value to an array (handles undefined, single values and arrays)
export const toArray = (value) => Array.isArray(value) ? value : (value ? [value] : []);

// Plain text for excerpts and search: inline markup must not split words.
const { unescapeAll } = markdownIt().utils;
export const stripTags = (value = "") => String(value)
    .replace(/<[^>]*>/g, "")
    // Decode entities after stripping tags; leave Markdown backslash escapes alone.
    .replace(/&(?:#\d+|#x[\da-f]+|[a-z][\da-z]+);/gi, unescapeAll);

// Collapse consecutive whitespace into a single space and trim
export const collapseWhitespace = (value = "") => String(value).replace(/\s+/g, " ").trim();

// Upper-case the first character of a string
export const capitalize = (value = "") => {
    const text = String(value);
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
};

// Slugify that preserves dots for tag/author URLs.
export const empSlugify = (value) => baseSlugify(value, { preserveCharacters: ["."] });

const getKeywords = async (tags) => {
    const sitetags = await loadConfig("sitetags");
    const sitestrings = await loadConfig("sitestrings");
    const notagList = sitetags.notag || [];
    const localizedStrings = sitestrings[siteconfig.lang] || {};
    return toArray(tags)
        .filter((t) => !notagList.includes(t))
        .map((t) => localizedStrings[t] || t);
};

export default (eleventyConfig) => {
    eleventyConfig.addFilter("empSlugify", empSlugify);

    // CSS class for home page link
    eleventyConfig.addNunjucksFilter("isHomeLink", (url, pattern) => {
        return pattern === "/" && url === "/" ? "active" : "";
    });

    // CSS class for active page link
    eleventyConfig.addNunjucksFilter("isActiveLink", (url, pattern) => {
        const section = pattern.replace(/\/+$/, "");
        return url.length > 1 && section.length > 0 && (url === section || url.startsWith(section + "/")) ? "active" : "";
    });

    // Absolute URL from path
    eleventyConfig.addFilter("absoluteUrl", (path) => {
        const prefixedPath = eleventyConfig.getFilter("url")(path);
        return new URL(prefixedPath, siteconfig.url).toString();
    });

    // Markdown image sources stay unprefixed for page optimization; feeds link to the originals.
    eleventyConfig.addFilter("feedImageUrls", (html) => String(html ?? "").replace(
        /(<img src=")(\/(?!\/)[^"]*)/g,
        (_, tag, src) => tag + eleventyConfig.getFilter("url")(src)
    ));

    // Estimated reading time in minutes
    eleventyConfig.addNunjucksFilter("readingTime", (wordcount) => {
        return Math.ceil(wordcount / 250);
    });

    // Locale-formatted reading time including the minute unit
    eleventyConfig.addNunjucksFilter("formatReadingTime", (minutes) => {
        return new Intl.NumberFormat(siteconfig.lang || "en", {
            style: "unit",
            unit: "minute",
            unitDisplay: "long"
        }).format(minutes);
    });

    // Locale-formatted word count
    eleventyConfig.addNunjucksFilter("formatWords", (wordcount) => {
        return wordcount.toLocaleString(siteconfig.lang || "en");
    });

    // Serialize whole JSON values, including data embedded in HTML script elements.
    eleventyConfig.addNunjucksFilter("jsonScript", value => JSON.stringify(value).replaceAll("<", "\\u003c"));

    // Filter and localise tags into a keyword array (excludes notag entries)
    // Usage: {{ tags | getKeywords }}
    eleventyConfig.addNunjucksAsyncFilter("getKeywords", (tags, callback) => {
        getKeywords(tags).then((result) => callback(null, result)).catch(callback);
    });
};