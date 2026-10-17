import { existsSync } from "node:fs";
import path from "node:path";

const updatesFor = (items = [], input) => items
    .filter(item => item.data.updateParent === path.normalize(input))
    .sort((a, b) => b.date - a.date);

export default (eleventyConfig) => {
    eleventyConfig.addPreprocessor("post-additions", "md", (data) => {
        const input = path.normalize(data.page.inputPath);
        if (!input.startsWith(path.join("content", "posts") + path.sep)) return;

        const parent = path.dirname(input) + ".md";
        if (existsSync(parent)) {
            if (!data.date) throw new Error(`Post update requires a date: ${input}`);
            data.updateParent = parent;
            data.layout = false;
            data.permalink = false;
            data.hidden = true;
            data.tags = ["postUpdates"];
            return;
        }

        data.eleventyImport = {
            ...data.eleventyImport,
            collections: [...(data.eleventyImport?.collections || []), "postUpdates"]
        };
        const authoredUpdated = data.updated;
        data.eleventyComputed = {
            ...data.eleventyComputed,
            postAttachments: ({ attachments }) => (attachments || []).map(file => ({
                name: path.posix.basename(file),
                path: file.split("/").map(encodeURIComponent).join("/")
            })),
            postUpdates: ({ collections }) => updatesFor(collections.postUpdates, input),
            updated: ({ postUpdates }) => {
                const latest = postUpdates[0]?.date;
                return latest && (!authoredUpdated || latest > new Date(authoredUpdated))
                    ? latest : authoredUpdated;
            }
        };
    });
};
