import markdownIt from "markdown-it";
import markdownItAnchor from "markdown-it-anchor";
import markdownItDeflist from "markdown-it-deflist";
import { full as markdownItEmoji } from "markdown-it-emoji";
import markdownItFootnote from "markdown-it-footnote";
import markdownItMark from "markdown-it-mark";
import markdownItSub from "markdown-it-sub";
import markdownItSup from "markdown-it-sup";
import markdownItTasklists from "markdown-it-task-lists";
import siteconfig from "../content/_data/siteconfig.js";
import codeBlockHeaders from "./code-block-headers.js";
import { loadConfig } from "./config.js";

export const createMarkdownLibrary = async (urlFilter = (url) => url) => {
    const inlinesvg = await loadConfig("inlinesvg");
    const sitestrings = await loadConfig("sitestrings");
    const markdown = markdownIt({
        html: true,
        xhtmlOut: true,
        linkify: false,
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
        .use(codeBlockHeaders, {
            copyIcon: inlinesvg.copy,
            strings: sitestrings[siteconfig.lang]
        });

    // Resolve links while rendering; image sources remain filesystem inputs.
    markdown.renderer.rules.link_open = (tokens, index, options, env, renderer) => {
        const token = tokens[index];
        token.attrSet("href", urlFilter(token.attrGet("href")));
        return renderer.renderToken(tokens, index, options);
    };
    return markdown;
};