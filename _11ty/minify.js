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

    // Avoid doctype shortening (prior minify_doctype: false)
    useShortDoctype: false
};

// inline, dependency-free XML minifier — conservative and safe for typical feed XML:
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
};