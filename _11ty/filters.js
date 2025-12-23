import { URL } from "url";
import siteconfig from "../content/_data/siteconfig.js";

export default eleventyConfig => {
    const isProduction = process.env.NODE_ENV === "production";

    // Returns CSS class for home page link
    eleventyConfig.addNunjucksFilter("isHomeLink", function (url, pattern) {
        return (pattern === "/" && url === "/") ? "active" : "";
    });

    // Returns CSS class for active page link
    eleventyConfig.addNunjucksFilter("isActiveLink", function (url, pattern) {
        return url.length > 1 && pattern.length > 0 && url.startsWith(pattern) ? "active" : "";
    });

    // Set absolute url
    eleventyConfig.addNunjucksFilter("absoluteUrl", (path) => {
        return new URL(path, siteconfig.url).toString();
    });
    
    // Add reading time filter (migrated from reading-info.js)
    eleventyConfig.addNunjucksFilter("readingTime", (wordcount) => {
        return Math.ceil(wordcount / 250);
    });

    // Add word count formatting filter (migrated from reading-info.js)
    eleventyConfig.addNunjucksFilter("formatWords", (wordcount) => {
        return wordcount.toLocaleString(siteconfig.lang || "en");
    });

    // JSON-escape a string for inclusion inside a JSON string literal.
    eleventyConfig.addNunjucksFilter("jsonEscape", (value) => {
        if (value === undefined || value === null) return "";
        // JSON.stringify returns a quoted string; remove the surrounding quotes.
        return JSON.stringify(String(value)).slice(1, -1);
    });

    // Minify simple HTML produced by templates for use in feeds.
    // Preserve pre/code/textarea/script/style blocks so internal spacing is not altered.
    // Do no minification when not in production.
    eleventyConfig.addNunjucksFilter("minifyFeedHtml", (input) => {
        if (!isProduction) return (input === undefined || input === null) ? "" : String(input);
        if (input === undefined || input === null) return "";
        let s = String(input);

        // preserve pre/code/textarea/script/style blocks entirely
        const preserved = [];
        s = s.replace(/<(pre|code|textarea|script|style)[\s\S]*?<\/\1>/gi, (m) => {
            preserved.push(m);
            return `__PRESERVE_${preserved.length - 1}__`;
        });

        // remove HTML comments
        s = s.replace(/<!--[\s\S]*?-->/g, "");

        // collapse whitespace between tags
        s = s.replace(/>\s+</g, "><");

        // collapse multiple spaces to one (only outside preserved blocks)
        s = s.replace(/ {2,}/g, " ");

        s = s.trim();

        // restore preserved blocks
        s = s.replace(/__PRESERVE_(\d+)__/g, (m, idx) => preserved[Number(idx)]);

        return s;
    });
    
    // Minify a JSON string: parse and re-stringify to remove indentation/newlines.
    eleventyConfig.addNunjucksFilter("minifyJson", (value) => {
        if (!isProduction) return (value === undefined || value === null) ? "" : String(value).trim();
        if (value === undefined || value === null) return "";
        const s = String(value);
        return JSON.stringify(JSON.parse(s));
    });
};