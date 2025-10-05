import { URL } from "url";
import siteconfig from "../content/_data/siteconfig.js";

export default eleventyConfig => {
    // Returns CSS class for home page link
    eleventyConfig.addNunjucksFilter("isHomeLink", function (url, pattern) {
        return (pattern === "/" && url === "/") ? "active" : "";
    });

    // Returns CSS class for active page link
    eleventyConfig.addNunjucksFilter("isActiveLink", function (url, pattern) {
        return url.length > 1 && url.startsWith(pattern) ? "active" : "";
    });

    // Set absolute url
    eleventyConfig.addNunjucksFilter("absoluteUrl", (path) => {
        return new URL(path, siteconfig.url).toString();
    });
    
};