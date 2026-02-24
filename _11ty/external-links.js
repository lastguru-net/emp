// PostHTML plugin: add target="_blank" and rel="noopener" to external links
import siteconfig from "../content/_data/siteconfig.js";

const isExternalHref = (href) => {
    if (!href) return false;

    // local anchors, relative paths and about:blank are not external
    if (
        href.startsWith("/") ||
        href.startsWith("#") ||
        href.startsWith("about:blank")
    ) return false;

    // ignore non-navigation schemes
    if (
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:") ||
        href.startsWith("data:")
    ) return false;

    // main site URL, and any additional internal URLs
    const internalPrefixes = [
        siteconfig.url,
        ...(Array.isArray(siteconfig.internalUrls) ? siteconfig.internalUrls : [])
    ];

    // if href starts with any internal prefix, treat as internal
    for (const prefix of internalPrefixes) {
        if (prefix && href.startsWith(prefix)) return false;
    }

    // otherwise it's external
    return true;
};

const ensureRelTokens = (rel, tokensToEnsure) => {
    const existing = new Set(
        String(rel || "")
            .split(/\s+/g)
            .map((t) => t.trim())
            .filter(Boolean)
    );

    for (const t of tokensToEnsure) existing.add(t);

    return Array.from(existing).join(" ");
};

// PostHTML plugin: mark external links with target and rel attributes
const externalContentLinks = () => {
    return (tree) => {
        // Use PostHTML's native matcher/traversal
        tree.match({ tag: "a" }, (node) => {
            if (!node.attrs || !node.attrs.href) return node;

            if (isExternalHref(node.attrs.href)) {
                node.attrs.target = "_blank";
                // Preserve existing rel (including "me"), but ensure noopener is present
                node.attrs.rel = ensureRelTokens(node.attrs.rel, ["noopener"]);
            }

            return node;
        });

        return tree;
    };
};

export default (eleventyConfig) => {
    eleventyConfig.htmlTransformer.addPosthtmlPlugin("html", externalContentLinks);
};