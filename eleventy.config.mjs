import JSON5 from "json5";
import siteconfig from "./content/_data/siteconfig.js";
import embedEverything from "eleventy-plugin-embed-everything";
import filters from "./_11ty/filters.js";
import plugins from "./_11ty/plugins.js";
import authentication from "./_11ty/authentication.js";
import cloudflare from "./_11ty/cloudflare.js";
import excerpt from "./_11ty/excerpt.js";
import dates from "./_11ty/dates.js";
import hash from "./_11ty/hash.js";
import externalLinks from "./_11ty/external-links.js";
import imageTransform from "./_11ty/image-transform.js";
import lqip from "./_11ty/lqip.js";
import minify from "./_11ty/minify.js";
import collections from "./_11ty/collections.js";
import searchIndex from "./_11ty/search-index.js";
import postCard from "./_11ty/post-card.js";
import postlist from "./_11ty/postlist.js";
import postAdditions from "./_11ty/post-additions.js";
import tailwind from "./_11ty/tailwind.js";
import { createMarkdownLibrary } from "./_11ty/markdown.js";

export default (eleventyConfig) => {
    // JSON5 data files
    eleventyConfig.addDataExtension("json5", (contents) => JSON5.parse(contents));

    // Markdown library
    eleventyConfig.setLibrary(
        "md",
        createMarkdownLibrary((url) => eleventyConfig.getFilter("url")(url))
    );

    // Passthrough assets and images
    eleventyConfig.addPassthroughCopy("assets");
    eleventyConfig.addPassthroughCopy("content/images/**/*.{avif,gif,ico,jpeg,jpg,png,svg,webp}");

    // Watch JS and CSS for dev-mode rebuilds
    eleventyConfig.addWatchTarget("./assets/js/");
    eleventyConfig.addWatchTarget("./assets/css/");
    eleventyConfig.addWatchTarget("./extensions/**", { resetConfig: true });

    // Template formats
    eleventyConfig.setTemplateFormats([
        "njk",
        "md",
        "svg",
        "jpg",
        "css",
        "png"
    ]);

    // Embed common media formats
    eleventyConfig.addPlugin(embedEverything);

    // General-purpose Nunjucks filters
    eleventyConfig.addPlugin(filters);

    // Plugins and authentication
    eleventyConfig.addPlugin(plugins);
    eleventyConfig.addPlugin(authentication);
    eleventyConfig.addPlugin(cloudflare);

    // Excerpts for post lists, feeds and metadata
    eleventyConfig.addPlugin(excerpt);

    // Getting and formatting dates
    eleventyConfig.addPlugin(dates);

    // Add custom hash for cache busting
    eleventyConfig.addPlugin(hash);

    // Setting _blank and rel=noopener on external links in markdown content
    eleventyConfig.addPlugin(externalLinks);

    // Images and post cards
    eleventyConfig.addPlugin(imageTransform);
    eleventyConfig.addPlugin(postCard);
    eleventyConfig.addPlugin(postlist);
    eleventyConfig.addPlugin(postAdditions);

    // Lean Rada CSS-only LQIP
    eleventyConfig.addPlugin(lqip);

    // Minifying HTML
    eleventyConfig.addPlugin(minify);

    // Double pagination for tags and authors, curated posts
    eleventyConfig.addPlugin(collections);

    // Serialize the MiniSearch index for the search-index.json template
    eleventyConfig.addPlugin(searchIndex);

    // Tailwind CSS processing
    eleventyConfig.addPlugin(tailwind);

    return {
        pathPrefix: new URL(siteconfig.url).pathname,
        dir: {
            // Source content directory
            input: "content"
        }
    };
};