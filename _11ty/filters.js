// General-purpose Nunjucks filters
import { URL } from "node:url";
import siteconfig from "../content/_data/siteconfig.js";
import { loadConfig } from "./config.js";

const getKeywords = async (tags) => {
    const sitetags = await loadConfig("sitetags");
    const sitestrings = await loadConfig("sitestrings");
    const notagList = sitetags.notag || [];
    const localizedStrings = sitestrings[siteconfig.lang] || {};
    const tagList = Array.isArray(tags) ? tags : (tags ? [tags] : []);
    return tagList
        .filter((t) => !notagList.includes(t))
        .map((t) => localizedStrings[t] || t);
};

export default (eleventyConfig) => {
    // CSS class for home page link
    eleventyConfig.addNunjucksFilter("isHomeLink", (url, pattern) => {
        return pattern === "/" && url === "/" ? "active" : "";
    });

    // CSS class for active page link
    eleventyConfig.addNunjucksFilter("isActiveLink", (url, pattern) => {
        return url.length > 1 && pattern.length > 0 && url.startsWith(pattern) ? "active" : "";
    });

    // Absolute URL from path
    eleventyConfig.addNunjucksFilter("absoluteUrl", (path) => {
        return new URL(path, siteconfig.url).toString();
    });

    // Estimated reading time in minutes
    eleventyConfig.addNunjucksFilter("readingTime", (wordcount) => {
        return Math.ceil(wordcount / 250);
    });

    // Locale-formatted word count
    eleventyConfig.addNunjucksFilter("formatWords", (wordcount) => {
        return wordcount.toLocaleString(siteconfig.lang || "en");
    });

    // JSON-escape a string for safe inclusion inside a JSON literal
    eleventyConfig.addNunjucksFilter("jsonEscape", (value) => {
        if (value === undefined || value === null) return "";
        // Remove surrounding quotes added by JSON.stringify
        return JSON.stringify(String(value)).slice(1, -1);
    });

    // Filter and localise tags into a keyword array (excludes notag entries)
    // Usage: {{ tags | getKeywords }}
    eleventyConfig.addNunjucksAsyncFilter("getKeywords", (tags, callback) => {
        getKeywords(tags).then((result) => callback(null, result)).catch(callback);
    });
};