import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import nunjucks from "@11ty/nunjucks";
import JSON5 from "json5";
import dates from "../_11ty/dates.js";

const data = name => JSON5.parse(readFileSync(new URL(`../content/_data/${name}.json5`, import.meta.url), "utf8"));
const env = new nunjucks.Environment(new nunjucks.FileSystemLoader(new URL("../content/_includes", import.meta.url).pathname), { autoescape: true });
env.addFilter("url", value => `/blog${value}`);
env.addFilter("absoluteUrl", value => `https://example.org${value}`);
dates({ addNunjucksFilter: (name, fn) => env.addFilter(name, fn), addShortcode() {} });

test("post and page sharing modes preserve body/addition order and unique accessible copy controls", async () => {
    for (const layout of ["post.njk", "page.njk"]) {
        for (const [mode, positions] of [[undefined, []], [false, []], [true, ["below"]], ["below", ["below"]], ["above", ["above"]], ["both", ["above", "below"]]]) {
            const html = await env.render(layout, {
                title: "Example", page: { url: "/example/" }, image: "/images/sample.png",
                content: '<p id="main-body">Main body</p>',
                siteelements: { features: { sharer: mode, postproperties: false, prevnext: false }, social: {} },
                siteconfig: { lang: "en" }, sitestrings: data("sitestrings"), inlinesvg: data("inlinesvg"),
                postAttachments: [{ name: "sample.png", path: "/images/sample.png" }],
                postUpdates: [{ date: new Date("2026-01-01"), data: {}, templateContent: "<p>Update body</p>" }]
            });
            const label = `${layout}: ${mode}`;
            assert.equal((html.match(/class="social"/g) || []).length, positions.length, label);
            const ids = [...html.matchAll(/id="(copy-link-status-[^"]+)"/g)].map(match => match[1]);
            assert.deepEqual(ids, positions.map(position => `copy-link-status-${position}`), label);
            assert.equal(new Set(ids).size, ids.length, label);
            for (const position of positions) {
                const share = html.indexOf(`aria-describedby="copy-link-status-${position}"`);
                assert.ok(share > html.indexOf('class="postimage"'), label);
                assert.equal(share < html.indexOf('id="main-body"'), position === "above", label);
                assert.match(html, new RegExp(`aria-describedby="copy-link-status-${position}"[^>]*disabled aria-hidden="true"`), label);
                if (layout === "post.njk") assert.ok(share < html.indexOf('class="postattachments"'), label);
            }
            assert.equal((html.match(/href="https:\/\/bsky.app\/intent\/compose/g) || []).length, positions.length, label);
            if (layout === "post.njk") {
                assert.ok(html.indexOf('id="main-body"') < html.indexOf('class="postattachments"'), label);
                assert.ok(html.indexOf('class="postattachments"') < html.indexOf('class="postupdates"'), label);
            }
        }
    }
});
