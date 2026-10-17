// Content minification transforms (HTML, XML, JSON, JS)
import { minify as minifyHtml } from "html-minifier-next";
import { minify as minifyJs } from "terser";

const isProduction = process.env.NODE_ENV === "production";

// html-minifier-next options
const htmlOptions = {
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

// Inline, dependency-free XML minifier:
// - preserves CDATA blocks
// - removes XML comments
// - collapses whitespace between tags
const minifyXml = (xml) => {
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

// Minify HTML for feed content (preserves pre/code/textarea/script/style blocks)
const minifyFeedHtml = (html) => {
    if (html === undefined || html === null) return "";
    if (!isProduction) return String(html);
    let output = String(html);

    // preserve pre/code/textarea/script/style blocks entirely
    const preserved = [];
    output = output.replace(/<(pre|code|textarea|script|style)[\s\S]*?<\/\1>/gi, (m) => {
        preserved.push(m);
        return "__PRESERVE_" + (preserved.length - 1) + "__";
    });

    // remove HTML comments
    output = output.replace(/<!--[\s\S]*?-->/g, "");

    // collapse whitespace between tags
    output = output.replace(/>\s+</g, "><");

    // collapse multiple spaces to one (only outside preserved blocks)
    output = output.replace(/ {2,}/g, " ");

    output = output.trim();

    // restore preserved blocks
    output = output.replace(/__PRESERVE_(\d+)__/g, (m, idx) => preserved[Number(idx)]);

    return output;
};

const minifyContent = async (content, outputPath) => {
    if (!outputPath || !isProduction) return content;

    if (outputPath.endsWith(".html")) return minifyHtml(String(content), htmlOptions);
    if (outputPath.endsWith(".xml")) return minifyXml(content);
    if (outputPath.endsWith(".json") || outputPath.endsWith(".webmanifest")) {
        return JSON.stringify(JSON.parse(String(content)));
    }
    if (outputPath.endsWith(".js")) return (await minifyJs(String(content))).code;
    return content;
};

export default (eleventyConfig) => {
    eleventyConfig.addTransform("minifyContent", minifyContent);
    eleventyConfig.addNunjucksFilter("minifyFeedHtml", minifyFeedHtml);
};