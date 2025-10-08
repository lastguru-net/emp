import minifyHtml from "@minify-html/node";

const isProduction = process.env.NODE_ENV === "production";

const htmlOpts = {
    do_not_minify_doctype: false,
    ensure_spec_compliant_unary_tags: true,
    ensure_spec_compliant_unquoted_attribute_values: true,
    keep_html_and_head_opening_tags: true,
    keep_closing_tags: true,
    minify_css: true,
    minify_js: true,
    remove_comments: true
};

// inline, dependency-free XML minifier — conservative and safe for typical feed XML:
// - preserves CDATA blocks
// - removes XML comments
// - collapses whitespace between tags
function simpleXmlMinify(xml) {
    if (!xml || typeof xml !== "string") return xml;

    // extract CDATA blocks
    const cdata = [];
    xml = xml.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (m, inner) => {
        cdata.push(inner);
        return `__CDATA_PLACEHOLDER_${cdata.length - 1}__`;
    });

    // remove XML comments
    xml = xml.replace(/<!--[\s\S]*?-->/g, "");

    // collapse whitespace between tags (be conservative)
    xml = xml.replace(/>\s+</g, "><");

    // trim leading/trailing whitespace
    xml = xml.trim();

    // restore CDATA blocks
    xml = xml.replace(/__CDATA_PLACEHOLDER_(\d+)__/g, (m, idx) => `<![CDATA[${cdata[Number(idx)]}]]>`);

    return xml;
}

// Inline minifier for JSON-LD inside HTML: parse and re-stringify script[type="application/ld+json"]
function minifyInlineJsonLd(html) {
    if (!html || typeof html !== "string") return html;
    return html.replace(/(<script\b[^>]*type=(['"])application\/ld\+json\2[^>]*>)([\s\S]*?)(<\/script>)/gi, (match, openTag, _q, inner, closeTag) => {
        const trimmed = inner.trim();
        // Let JSON.parse/JSON.stringify throw if there's a problem so the build fails fast.
        const min = JSON.stringify(JSON.parse(trimmed));
        return openTag + min + closeTag;
    });
}

const minifyContent = (content, path) => {
    if (!path || !isProduction) return content;

    if (path.endsWith(".html")) {
        // First, minify any embedded JSON-LD so shortcodes like imageTransform have already run.
        content = minifyInlineJsonLd(content);

        const result = minifyHtml.minify(Buffer.from(content), htmlOpts);
        content = result ? result.toString() : content;
    } else if (path.endsWith(".xml")) {
        // use inline minifier
        content = simpleXmlMinify(content);
    } else if (path.endsWith(".json") || path.endsWith(".webmanifest")) {
        // use strict JSON parse/stringify to produce compact, valid JSON
        const s = String(content);
        content = JSON.stringify(JSON.parse(s));
    }

    return content;
};

export default eleventyConfig => {
    eleventyConfig.addTransform("minifyContent", minifyContent);
};