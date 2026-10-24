import { html } from "../assets/js/html.js";
import { createPostPropertiesRenderer } from "../assets/js/post-properties.js";
import siteconfig from "../content/_data/siteconfig.js";

export const { renderProperties, renderMetricsActions } = createPostPropertiesRenderer(html);

const actionUrl = (value) => {
    const url = (value || "").trim();
    if (/[\u0000-\u001f\u007f\\]/.test(url) || url.startsWith("//")) return "";
    if (/^[a-z][a-z\d+.-]*:/i.test(url) && !/^(https?:\/\/|mailto:)/i.test(url)) return "";
    return url;
};

const isExternalAction = (href) => {
    if (!/^https?:\/\//i.test(href)) return false;
    const target = new URL(href);
    return ![siteconfig.url, ...(siteconfig.internalUrls || [])].some((value) => {
        const internal = new URL(value);
        const base = internal.pathname.replace(/\/+$/, "");
        return target.origin === internal.origin && (target.pathname === base || target.pathname.startsWith(base + "/"));
    });
};

// Nunjucks prepares post properties; the shortcode renders them
export default (eleventyConfig) => {
    eleventyConfig.addFilter("postAction", (action) => {
        const url = actionUrl(action.href);
        const href = url ? eleventyConfig.getFilter("url")(url) : "";
        return {
            label: action.label,
            href,
            external: isExternalAction(href),
            variant: action.variant,
            icon: action.icon,
            disabled: action.disabled
        };
    });
    eleventyConfig.addShortcode("postProperties", function (post) {
        return renderProperties(post, this.ctx);
    });
};
