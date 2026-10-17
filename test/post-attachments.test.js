import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import test from "node:test";
import MiniSearch from "minisearch";
import siteconfig from "../content/_data/siteconfig.js";

const cli = createRequire(import.meta.url).resolve("@11ty/eleventy/cli");
const plugin = new URL("../_11ty/post-additions.js", import.meta.url).href;
const template = new URL("../content/_includes/post-additions.njk", import.meta.url);
const dates = new URL("../_11ty/dates.js", import.meta.url).href;
const consumerPlugins = ["filters", "collections", "excerpt", "search-index", "minify"];

test("local attachments render through Nunjucks after sharing and work with deployment prefixes", () => {
    const root = mkdtempSync(path.join(tmpdir(), "emp-post-attachments-"));
    const write = (name, body) => {
        const target = path.join(root, name);
        mkdirSync(path.dirname(target), { recursive: true });
        writeFileSync(target, body);
    };
    const read = name => readFileSync(path.join(root, "_site", name), "utf8");
    const files = ["/assets/files/ārējais & \"dokuments\"#1%.txt", "/images/sample.png"];
    try {
        write("eleventy.config.mjs", `import additions from ${JSON.stringify(plugin)};
import dates from ${JSON.stringify(dates)};
${consumerPlugins.map((name, index) => `import plugin${index} from ${JSON.stringify(new URL(`../_11ty/${name}.js`, import.meta.url).href)};`).join("\n")}
export default config => {
    config.addPlugin(dates);
    config.addPlugin(additions);
    ${consumerPlugins.map((_, index) => `config.addPlugin(plugin${index});`).join("\n    ")}
    config.addDataExtension("json5", JSON.parse);
    config.addShortcode("imageTransformAbsoluteUrl", () => "https://example.test/image.png");
    config.addPassthroughCopy("assets");
    config.addPassthroughCopy("content/images/**/*.{avif,gif,ico,jpeg,jpg,png,svg,webp}");
    return { dir: { input: "content" } };
};`);
        write("content/_data/siteelements.json", JSON.stringify({ features: { sharer: true, index: "singlepost" }, feeds: { fullContent: true } }));
        write("content/_data/sitetags.json5", JSON.stringify({ notag: ["posts"] }));
        write("content/_data/siteauthors.json", JSON.stringify({ lastguru: { fullName: "Author" } }));
        write("content/_data/sitestrings.json5", JSON.stringify({
            en: { post_attachments: "Attachments", post_updates: "Updates" },
            lv: { post_attachments: "Pielikumi", post_updates: "Jaunumi" }
        }));
        write("content/posts/posts.json", JSON.stringify({ layout: "post.njk", tags: ["posts"], permalink: "/{{ title }}/" }));
        write("content/_includes/base.njk", "<body>{{ content | safe }}</body>");
        write("content/_includes/post.njk", readFileSync(new URL("../content/_includes/post.njk", import.meta.url), "utf8"));
        write("content/_includes/post-additions.njk", readFileSync(template, "utf8"));
        write("content/_includes/social.njk", '<nav id="share">Sharing controls</nav>');
        for (const name of ["feed.json", "rss", "atom", "search-index.json"]) {
            write(`content/${name}.njk`, readFileSync(new URL(`../content/utils/${name}.njk`, import.meta.url), "utf8"));
        }
        write("content/index.njk", readFileSync(new URL("../content/index.njk", import.meta.url), "utf8"));
        write("content/index.11tydata.json", JSON.stringify({ pagination: { size: 1 }, permalink: "/home/{{ pagination.pageNumber }}/index.html" }));
        write(files[0].slice(1), "Attachment bytes");
        write("content/images/sample.png", "Sample file bytes");
        for (const [title, attachments] of [["none", undefined], ["empty", []], ["multiple", files], ["both", files], ["updates", undefined]]) {
            write(`content/posts/${title}.md`, `---\ntitle: ${title}\ndate: 2026-01-01\n${attachments === undefined ? "" : `attachments: ${JSON.stringify(attachments)}\n`}---\nOriginal body.\n`);
        }
        for (const title of ["both", "updates"]) {
            write(`content/posts/${title}/news.md`, "---\ndate: 2026-02-01\ntitle: Updateonlyheadline\n---\nUpdated information.\n");
        }
        for (const [prefix, lang] of [["", "en"], ["/blog/", "lv"]]) {
            write("content/_data/siteconfig.json", JSON.stringify({ ...siteconfig, lang }));
            execFileSync(process.execPath, [cli, "--quiet", `--pathprefix=${prefix}`], { cwd: root, stdio: "pipe" });
            for (const title of ["none", "empty", "updates"]) {
                assert.ok(!read(`${title}/index.html`).includes('class="postattachments"'));
            }
            for (const title of ["none", "empty"]) {
                assert.ok(!read(`${title}/index.html`).includes('class="postbreak"'), "no empty attachment separator");
            }
            for (const title of ["multiple", "both"]) {
                const html = read(`${title}/index.html`);
                assert.ok(html.includes(`<h2>${lang === "en" ? "Attachments" : "Pielikumi"}</h2>`));
                assert.ok(html.indexOf("Original body.") < html.indexOf('id="share"'));
                assert.ok(html.indexOf('id="share"') < html.indexOf('class="postattachments"'));
                assert.ok(html.includes(`<a href="${prefix || "/"}images/sample.png">sample.png</a>`));
                const href = (prefix || "/") + files[0].slice(1).split("/").map(encodeURIComponent).join("/");
                assert.ok(html.includes(`<a href="${href}">ārējais &amp; &quot;dokuments&quot;#1%.txt</a>`));
                assert.ok(html.indexOf(href) < html.indexOf(`${prefix || "/"}images/sample.png`), "authored order retained");
            }
            const localizedDate = new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short", hourCycle: "h23" }).format(new Date("2026-02-01T00:00:00.000Z"));
            for (const title of ["both", "updates"]) {
                assert.ok(read(`${title}/index.html`).includes("Updated information."));
                assert.ok(read(`${title}/index.html`).includes(`<time datetime="2026-02-01T00:00:00.000Z">${localizedDate}</time>`));
                assert.ok(read(`${title}/index.html`).includes(`<h2>${lang === "en" ? "Updates" : "Jaunumi"}</h2>`));
            }
            assert.equal(read(files[0].slice(1)), "Attachment bytes");
            assert.equal(read("images/sample.png"), "Sample file bytes");
            const bothHtml = read("both/index.html");
            assert.ok(bothHtml.indexOf('class="postattachments"') < bothHtml.indexOf('class="postupdates"'));

            const homepages = Array.from({ length: 5 }, (_, i) => read(`home/${i}/index.html`));
            assert.equal(homepages.filter(html => html.includes('class="postattachments"')).length, 2);
            assert.equal(homepages.filter(html => html.includes('class="postupdates"')).length, 2);
            for (const html of homepages) {
                assert.match(html, /Original body\./);
                if (html.includes('class="postattachments"')) {
                    assert.ok(html.includes(`<a href="${prefix || "/"}images/sample.png">sample.png</a>`));
                }
                if (html.includes('class="postupdates"')) assert.match(html, /Updated information\./);
            }

            const feed = JSON.parse(read("feed.json"));
            assert.equal(feed.items.length, 5, "updates are not standalone feed entries");
            for (const content of [...feed.items.map(item => item.content_html), read("rss.xml"), read("atom.xml")]) {
                assert.match(content, /Original body\./);
                assert.doesNotMatch(content, /postattachments|postupdates|sample\.png|dokuments|Updateonlyheadline|Updated information/);
            }
            const search = JSON.parse(read("search-index.json"));
            const index = MiniSearch.loadJSON(JSON.stringify(search.index), search.options);
            assert.equal(index.search("Original").length, 5, "the body remains searchable");
            for (const term of ["dokuments", "Updateonlyheadline", "information"]) {
                assert.deepEqual(index.search(term), [], `${term} from additions is not indexed`);
            }
        }
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});
