import JSON5 from "json5";
import markdownIt from "markdown-it";
import markdownItAnchor from "markdown-it-anchor";
import markdownItDeflist from "markdown-it-deflist";
import { full as markdownItEmoji } from "markdown-it-emoji";
import markdownItFootnote from "markdown-it-footnote";
import markdownItMark from "markdown-it-mark";
import markdownItSub from "markdown-it-sub";
import markdownItSup from "markdown-it-sup";
import markdownItTasklists from "markdown-it-task-lists";
import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";
import embedEverything from "eleventy-plugin-embed-everything";
import getExcerpt from "./_11ty/excerpt.js";
import filters from "./_11ty/filters.js";
import dates from "./_11ty/dates.js";
import hash from "./_11ty/hash.js";
import externalLinks from "./_11ty/external-links.js";
import imageTransform from "./_11ty/image-transform.js";
import minify from "./_11ty/minify.js";
import tagPagination from "./_11ty/tag.js";
import authorPagination from "./_11ty/author.js";
import googleFontsPlugin from "./_11ty/google-fonts.js";
import lqip from "./_11ty/lqip.js";
import empPostsPlugin from "./_11ty/emp-posts.js";
import searchDocsPlugin from "./_11ty/search-docs.js";
import tailwind from "./_11ty/tailwind.js";

export default (eleventyConfig) => {
    // Add support for JSON5 data files
    eleventyConfig.addDataExtension("json5", (contents) => JSON5.parse(contents));

    // Set Markdown library
    eleventyConfig.setLibrary(
        "md",
        markdownIt({
            html: true,
            xhtmlOut: true,
            linkify: true,
            typographer: true
        })
        .use(markdownItAnchor)
        .use(markdownItDeflist)
        .use(markdownItEmoji)
        .use(markdownItFootnote)
        .use(markdownItMark)
        .use(markdownItSub)
        .use(markdownItSup)
        .use(markdownItTasklists)
    );

    // Define passthrough for assets
    eleventyConfig.addPassthroughCopy("assets");
    eleventyConfig.addPassthroughCopy({ "content/images": "images" });

    // Add watch target for JS and CSS files (needed for JS and CSS bundling in dev mode)
    eleventyConfig.addWatchTarget("./assets/js/");
    eleventyConfig.addWatchTarget("./assets/css/");

    // Define 11ty template formats
    eleventyConfig.setTemplateFormats([
        "njk",
        "md",
        "svg",
        "jpg",
        "css",
        "png"
    ]);

    // Custom filters for various tasks
    eleventyConfig.addPlugin(filters);

    // Generate excerpt from first paragraph
    eleventyConfig.addPlugin(getExcerpt);

    // Getting and formatting dates
    eleventyConfig.addPlugin(dates);

    // Add custom hash for cache busting
    eleventyConfig.addPlugin(hash);

    // Setting _blank and rel=noopener on external links in markdown content
    eleventyConfig.addPlugin(externalLinks);

    // Transforming images
    eleventyConfig.addPlugin(imageTransform);

    // Lean Rada CSS-only LQIP
    eleventyConfig.addPlugin(lqip);

    // Minifying HTML
    eleventyConfig.addPlugin(minify);

    // Syntax highlighting plugin
    eleventyConfig.addPlugin(syntaxHighlight);

    // Embed common media formats
    eleventyConfig.addPlugin(embedEverything);

    // Double pagination for tags and authors
    eleventyConfig.addPlugin(tagPagination);
    eleventyConfig.addPlugin(authorPagination);
    eleventyConfig.addPlugin(googleFontsPlugin);

    // empPosts collection (pinned-first, etc.)
    eleventyConfig.addPlugin(empPostsPlugin);

    // Search docs collection and serialized Minisearch payload filter
    eleventyConfig.addPlugin(searchDocsPlugin);

    // Tailwind CSS processing
    eleventyConfig.addPlugin(tailwind);

    return {
        dir: {
            // Consolidating everything below the `content` folder
            input: "content"
        }
    };
};