import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import test from "node:test";

const cli = createRequire(import.meta.url).resolve("@11ty/eleventy/cli");
const plugin = new URL("../_11ty/post-additions.js", import.meta.url).href;
const template = new URL("../content/_includes/post-additions.njk", import.meta.url);
const dates = new URL("../_11ty/dates.js", import.meta.url).href;

test("Eleventy exposes sorted nested updates without changing post bodies", () => {
    const root = mkdtempSync(path.join(tmpdir(), "emp-post-updates-"));
    const write = (name, body) => {
        const target = path.join(root, name);
        mkdirSync(path.dirname(target), { recursive: true });
        writeFileSync(target, body);
    };
    const read = name => readFileSync(path.join(root, "_site", name), "utf8");
    const reports = () => read("report.json").trim().split("\n").map(line => JSON.parse(line));
    try {
        write("eleventy.config.mjs", `import updates from ${JSON.stringify(plugin)};
import dates from ${JSON.stringify(dates)};
export default config => {
    config.addPlugin(dates);
    config.addPlugin(updates);
    config.addShortcode("reportdata", (item) => JSON.stringify({
        title: item.data.title, date: item.date, updated: item.data.updated,
        excerpt: item.data.excerpt, content: item.templateContent,
        updateCount: item.data.postUpdates?.length
    }));
    return { dir: { input: "content" } };
};`);
        write("content/_data/siteconfig.json", '{"lang":"en"}');
        write("content/_data/sitestrings.json", '{"en":{"post_updates":"Updates"}}');
        write("content/posts/posts.json", JSON.stringify({ layout: "post.njk", tags: ["posts"], permalink: "/{{ title }}/" }));
        write("content/_includes/post-additions.njk", readFileSync(template, "utf8"));
        write("content/_includes/post.njk", '{{ content | safe }}{% include "post-additions.njk" %}');
        write("content/report.njk", '---\npermalink: /report.json\neleventyImport:\n  collections: [posts]\n---\n{% for item in collections.posts %}{% reportdata item %}\n{% endfor %}');
        for (const [source, title] of [["conference", "root"], ["2026/conference", "year"], ["topics/local/conference", "deep"]]) {
            write(`content/posts/${source}.md`, `---\ntitle: ${title}\ndate: 2026-01-01\nexcerpt: Original excerpt\n${title === "deep" ? "updated: 2026-04-01\n" : ""}---\nOriginal ${title} body.\n`);
            write(`content/posts/${source}/change.md`, `---\ndate: 2026-03-01\ntitle: 'News <strong> & details'\n---\nLatest **${title}** update.\n`);
        }
        write("content/posts/conference/early.md", "---\ndate: 2026-02-01\n---\nEarlier update without a title.\n");
        write("content/posts/ordinary.md", "---\ntitle: ordinary\ndate: 2026-01-01\n---\nUnchanged body.\n");
        execFileSync(process.execPath, [cli, "--quiet"], { cwd: root, stdio: "pipe" });
        const initial = reports();
        assert.equal(initial.length, 4, "updates are not independent posts");
        for (const title of ["root", "year", "deep"]) {
            const post = initial.find(item => item.title === title);
            const html = read(`${title}/index.html`);
            assert.equal(post.content, `<p>Original ${title} body.</p>\n`, "post templateContent is only the original body");
            assert.equal(post.excerpt, "Original excerpt");
            assert.equal(post.date, "2026-01-01T00:00:00.000Z");
            assert.equal(post.updated, title === "deep" ? "2026-04-01T00:00:00.000Z" : "2026-03-01T00:00:00.000Z");
            assert.equal(post.updateCount, title === "root" ? 2 : 1);
            assert.match(html, new RegExp(`Latest <strong>${title}</strong> update`));
            assert.match(html, /News &lt;strong&gt; &amp; details/);
            assert.match(html, /<time datetime="2026-03-01T00:00:00.000Z">/);
        }
        assert.ok(read("root/index.html").indexOf("Latest") < read("root/index.html").indexOf("Earlier"));
        assert.equal(initial.find(item => item.title === "ordinary").content, "<p>Unchanged body.</p>\n");
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});
