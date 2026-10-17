import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import MiniSearch from "minisearch";
import { createMarkdownLibrary } from "../_11ty/markdown.js";
import registerSearchIndex from "../_11ty/search-index.js";

const source = readFileSync(new URL("../assets/js/search.js", import.meta.url), "utf8");
const run = new (Object.getPrototypeOf(async () => {}).constructor)("window", "document", "fetch", "indexUrl", "miniSearchUrl", source);
const miniSearchUrl = "data:text/javascript,export default {loadJS(){return {search(){return []}}}}";
const payload = { strings: { placeholder: "Search posts" }, index: {}, options: {} };

async function harness(fetchIndex) {
    const listeners = [];
    const dialog = { open: false, showModal() { this.open = true; } };
    const input = { setAttribute(name, value) { this[name] = value; },
        addEventListener(name, handler) { if (name === "input") listeners.push(handler); },
        select() {} };
    const nodes = { "search-modal": dialog, "search-input": input, "search-results": {}, "search-status": {} };
    const window = {};
    await run(window, { getElementById: id => nodes[id] }, fetchIndex, "/search-index.json", miniSearchUrl);
    return { open: window.searchButton, dialog, input, listeners };
}

test("search loads lazily once across concurrent opens and later reopens", async () => {
    let complete;
    const response = new Promise(resolve => { complete = resolve; });
    let requests = 0;
    const h = await harness(() => { requests++; return response; });
    assert.equal(requests, 0);
    const first = h.open();
    const second = h.open();
    assert.equal(requests, 1);
    complete(Response.json(payload));
    await Promise.all([first, second]);
    assert.equal(h.listeners.length, 1);
    assert.equal(h.input.placeholder, "Search posts");
    assert.equal(h.dialog.open, true);
    h.dialog.open = false;
    await h.open();
    assert.equal(h.dialog.open, true);
    assert.equal(requests, 1);
    assert.equal(h.listeners.length, 1);
});

test("a failed search load can retry without duplicate input handlers", async () => {
    let requests = 0;
    const h = await harness(async () => {
        if (++requests === 1) throw new Error("offline");
        return Response.json(payload);
    });
    await assert.rejects(h.open(), /offline/);
    assert.equal(h.dialog.open, false);
    await Promise.all([h.open(), h.open()]);
    assert.equal(requests, 2);
    assert.equal(h.dialog.open, true);
    assert.equal(h.listeners.length, 1);
});

test("the real search index finds words across inline markup and stores readable excerpts", async () => {
    let buildIndex;
    registerSearchIndex({
        getFilter: () => value => value,
        addNunjucksAsyncFilter: (name, callback) => { buildIndex = callback; }
    });
    const item = {
        url: "/lunch/", date: new Date("2026-10-16"),
        data: { title: "Lunch", tags: ["posts"] },
        templateContent: createMarkdownLibrary().render("Un**believ**able fish & chips.")
    };
    const payload = JSON.parse(await new Promise((resolve, reject) =>
        buildIndex([item], (error, result) => error ? reject(error) : resolve(result))));
    const index = MiniSearch.loadJS(payload.index, payload.options);
    const [result] = index.search("unbelievable");
    assert.equal(result.url, "/lunch/");
    assert.equal(result.excerpt, "Unbelievable fish & chips.");
    assert.deepEqual(index.search("amp"), []);
});
