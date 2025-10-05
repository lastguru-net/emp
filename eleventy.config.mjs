import JSON5 from "json5";
import markdownIt from "markdown-it";
import markdownItAnchor from "markdown-it-anchor";
import markdownItDeflist from "markdown-it-deflist";
import { full as markdownItEmoji} from "markdown-it-emoji";
import markdownItFootnote from "markdown-it-footnote";
import markdownItMark from "markdown-it-mark";
import markdownItPrism from "markdown-it-prism";
import markdownItSub from "markdown-it-sub";
import markdownItSup from "markdown-it-sup";
import markdownItTasklists from "markdown-it-task-lists";
import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";
import embedEverything from "eleventy-plugin-embed-everything";
import excerpt from "./_11ty/excerpt.js";
import readingInfo from "./_11ty/reading-info.js";
import filters from "./_11ty/filters.js";
import dates from "./_11ty/dates.js";
import hash from "./_11ty/hash.js";
import externalLinks from "./_11ty/external-links.js";
import imageTransform from "./_11ty/image-transform.js";
import htmlMinify from "./_11ty/html-minify.js";
import tagPagination from "./_11ty/tag.js";
import authorPagination from "./_11ty/author.js";

export default eleventyConfig => {
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
        .use(markdownItPrism)
        .use(markdownItSub)
        .use(markdownItSup)
        .use(markdownItTasklists)
    );

    // Define passthrough for assets
    eleventyConfig.addPassthroughCopy("assets");
    eleventyConfig.addPassthroughCopy({"content/images" : "images"});

    // Add watch target for JS files (needed for JS bundling in dev mode)
    eleventyConfig.addWatchTarget("./assets/js/");
    // And to make this work we've to disable the .gitignore usage of eleventy.
    eleventyConfig.setUseGitIgnore(false);

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
    eleventyConfig.addPlugin(excerpt);

    // Extract reading time and word count
    eleventyConfig.addPlugin(readingInfo);

    // Getting and formatting dates
    eleventyConfig.addPlugin(dates);

    // Add custom hash for cache busting
    eleventyConfig.addPlugin(hash);

    // Setting _blank and rel=noopener on external links in markdown content
    eleventyConfig.addPlugin(externalLinks);

    // Transforming images
    eleventyConfig.addPlugin(imageTransform);

    // Minifying HTML
    eleventyConfig.addPlugin(htmlMinify);

    // Syntax highlighting plugin
    eleventyConfig.addPlugin(syntaxHighlight);

    // Embed common media formats
    eleventyConfig.addPlugin(embedEverything);

    // Double pagination for tags and authors
    eleventyConfig.addPlugin(tagPagination);
    eleventyConfig.addPlugin(authorPagination);

    return {
        dir: {
            // Consolidating everything below the `content` folder
            input: "content"
        }
    };
};