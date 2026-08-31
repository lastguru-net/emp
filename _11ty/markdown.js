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

const inlinesvg = await loadConfig("inlinesvg");
const sitestrings = await loadConfig("sitestrings");

export const createMarkdownLibrary = () => {
    return markdownIt({
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
};