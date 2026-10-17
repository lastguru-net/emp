import { readFile } from "node:fs/promises";
import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";

export default {
    setup(eleventyConfig, options) {
        return eleventyConfig.addPlugin(syntaxHighlight, options);
    },
    css() {
        return readFile(new URL("./prism-okaidia.css", import.meta.url), "utf8");
    },
};
