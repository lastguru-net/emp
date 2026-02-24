// Content minification transforms (HTML, XML, JSON, JS)
import { minify as minifyHtml } from "html-minifier-next";
import { minify as minifyJs } from "terser";

const isProduction = process.env.NODE_ENV === "production";

// html-minifier-next options
const htmlOpts = {
    collapseWhitespace: true,
    conservativeCollapse: false,
    collapseInlineTagWhitespace: true,
    collapseBooleanAttributes: true,

    // Avoid "optimizing" entities in ways that can affect validation/semantics
    decodeEntities: false,

    removeComments: true,
    removeEmptyAttributes: true,
    removeOptionalTags: false,
    removeRedundantAttributes: false,

    // Inline minification
    minifyCSS: true,
    minifyJS: true,

    // Avoid doctype shortening
    useShortDoctype: false
};

// Inline, dependency-free XML minifier — conservative and safe for typical feed XML:
// - preserves CDATA blocks
// - removes XML comments
// - collapses whitespace between tags
const simpleXmlMinify = (xml) => {
    if (!xml || typeof xml !== "string") return xml;

    // extract CDATA blocks
    const cdata = [];
    xml = xml.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (m, inner) => {
        cdata.push(inner);
        return "__CDATA_PLACEHOLDER_" + (cdata.length - 1) + "__";
    });

    // remove XML comments
    xml = xml.replace(/<!--[\s\S]*?-->/g, "");

    // collapse whitespace between tags (be conservative)
    xml = xml.replace(/>\s+</g, "><");

    // trim leading/trailing whitespace
    xml = xml.trim();

    // restore CDATA blocks
    xml = xml.replace(/__CDATA_PLACEHOLDER_(\d+)__/g, (m, idx) => "<![CDATA[" + cdata[Number(idx)] + "]]>");

    return xml;
};

// Minify HTML for feed content (preserves pre/code/script/style blocks)
const simpleHtmlMinify = (html) => {
    if (html === undefined || html === null) return "";
    if (!isProduction) return String(html);
    let s = String(html);

    // preserve pre/code/textarea/script/style blocks entirely
    const preserved = [];
    s = s.replace(/<(pre|code|textarea|script|style)[\s\S]*?<\/\1>/gi, (m) => {
        preserved.push(m);
        return "__PRESERVE_" + (preserved.length - 1) + "__";
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
};

const minifyContent = async (content, path) => {
    if (!path || !isProduction) return content;

    if (path.endsWith(".html")) {
        const s = String(content);
        content = await minifyHtml(s, htmlOpts);
    } else if (path.endsWith(".xml")) {
        // use inline minifier
        content = simpleXmlMinify(content);
    } else if (path.endsWith(".json") || path.endsWith(".webmanifest")) {
        // use strict JSON parse/stringify to produce compact, valid JSON
        const s = String(content);
        content = JSON.stringify(JSON.parse(s));
    } else if (path.endsWith(".js")) {
        const s = String(content);
        const m = await minifyJs(s);
        content = m.code;
    }

    return content;
};

export default (eleventyConfig) => {
    eleventyConfig.addTransform("minifyContent", minifyContent);
    eleventyConfig.addNunjucksFilter("minifyFeedHtml", simpleHtmlMinify);
};