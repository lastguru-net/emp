import minifyHtml from "@minify-html/node";

const isProduction = process.env.NODE_ENV === "production";

// Options for HTML minification. All supported options are listed below.
const htmlOpts = {
    // Allow unquoted attribute values in the output to contain characters prohibited by the [WHATWG specification](https://html.spec.whatwg.org/multipage/syntax.html#attributes-2). These will still be parsed correctly by almost all browsers.
    allow_noncompliant_unquoted_attribute_values: false,
    // Allow some minifications around entities that may not pass validation, but will still be parsed correctly by almost all browsers.
    allow_optimal_entities: false,
    // Allow removing_spaces between attributes when possible, which may not be spec compliant. These will still be parsed correctly by almost all browsers.
    allow_removing_spaces_between_attributes: false,
    // Do not omit closing tags when possible.
    keep_closing_tags: true,
    // Keep all comments.
    keep_comments: false,
    // Do not omit `<html>` and `<head>` opening tags when they don't have attributes.
    keep_html_and_head_opening_tags: true,
    // Keep `type=text` attribute name and value on `<input>` elements.
    keep_input_type_text_attr: true,
    // Keep SSI comments.
    keep_ssi_comments: false,
    // Minify CSS in `<style>` tags and `style` attributes using [https://github.com/parcel-bundler/lightningcss](lightningcss).
    minify_css: true,
    // Minify DOCTYPEs. Minified DOCTYPEs may not be spec compliant, but will still be parsed correctly by almost all browsers.
    minify_doctype: false,
    // Minify JavaScript in `<script>` tags using [minify-js](https://github.com/wilsonzlin/minify-js).
    minify_js: true,
    // When `{{`, `{#`, or `{%` are seen in content, all source code until the subsequent matching closing `}}`, `#}`, or `%}` respectively gets piped through untouched.
    preserve_brace_template_syntax: false,
    // When `<%` is seen in content, all source code until the subsequent matching closing `%>` gets piped through untouched.
    preserve_chevron_percent_template_syntax: false,
    // Remove all bangs.
    remove_bangs: false,
    // Remove all processing instructions.
    remove_processing_instructions: false
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