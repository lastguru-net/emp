// Transformer to ensure that non-relative links open in a new window
// and have for SEO reasons `rel="noopener"` set.

import { parse } from "node-html-parser";
import siteconfig from "../content/_data/siteconfig.js";

const checkHrefs = (href) => {
    return (
        !href.startsWith("/") &&
        !href.startsWith("#") &&
        !href.startsWith(siteconfig.url) &&
        !href.startsWith("about:blank")
    );
};

const options = {
    target: "_blank",
    rel: "noopener",
    merel: "me noopener"
};

const externalContentLinks = async (rawContent, outputPath) => {
    let content = rawContent;
    if (outputPath && outputPath.endsWith(".html")) {
        const dom = parse(content);
        const links = dom.querySelectorAll("a");
        links.forEach((link) => {
            const href = link.getAttribute("href");
            const me = link.getAttribute("rel") && link.getAttribute("rel").includes("me");
            if (href && checkHrefs(href)) {
                link.setAttribute("target", options.target);
                link.setAttribute("rel", me ? options.merel : options.rel);
            }
        });
        content = dom.toString();
    }
    
    return content;
};

export default eleventyConfig => {
    eleventyConfig.addTransform('externalContentLinks', externalContentLinks);
};