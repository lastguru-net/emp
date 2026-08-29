import markdownIt from "markdown-it";
import markdownItAnchor from "markdown-it-anchor";
import markdownItDeflist from "markdown-it-deflist";
import { full as markdownItEmoji } from "markdown-it-emoji";
import markdownItFootnote from "markdown-it-footnote";
import markdownItMark from "markdown-it-mark";
import markdownItSub from "markdown-it-sub";
import markdownItSup from "markdown-it-sup";
import markdownItTasklists from "markdown-it-task-lists";
import codeBlockHeaders from "./code-block-headers.js";

export const markdownOptions = Object.freeze({
    html: true,
    xhtmlOut: true,
    linkify: false,
    typographer: true
});

const markdownPlugins = Object.freeze([
    { name: "anchor", plugin: markdownItAnchor },
    { name: "deflist", plugin: markdownItDeflist },
    { name: "emoji", plugin: markdownItEmoji },
    { name: "footnote", plugin: markdownItFootnote },
    { name: "mark", plugin: markdownItMark },
    { name: "sub", plugin: markdownItSub },
    { name: "sup", plugin: markdownItSup },
    { name: "task-lists", plugin: markdownItTasklists },
    { name: "code-block-headers", plugin: codeBlockHeaders }
]);

export const markdownPluginNames = Object.freeze(markdownPlugins.map(({ name }) => name));

export const createMarkdownLibrary = () => {
    const md = markdownIt(markdownOptions);

    for (const { plugin } of markdownPlugins) {
        md.use(plugin);
    }

    return md;
};
