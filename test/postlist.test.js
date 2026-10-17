import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import nunjucks from "@11ty/nunjucks";
import { HtmlBasePlugin } from "@11ty/eleventy";
import registerPostlist from "../_11ty/postlist.js";
import registerFilters from "../_11ty/filters.js";
import { validatePostlist } from "../assets/js/postlist.js";
import { renderCard, renderPagination } from "../assets/js/post-card.js";
import registerPostCards from "../_11ty/post-card.js";

const item = { url: "/event/", title: "Event" };

test("postlist responses accept empty and populated pages and reject invalid data", () => {
    const empty = { items: [], pagination: { page: null, totalPages: 0 } };
    assert.deepEqual(validatePostlist(empty), empty);
    const data = { items: [item], pagination: { page: 3, totalPages: 8 } };
    assert.deepEqual(validatePostlist(data), data);
    assert.throws(() => validatePostlist({}));
    assert.throws(() => validatePostlist({ items: [item], pagination: { page: 9, totalPages: 8 } }));
});

test("prepared lists and metrics/actions share exports to Eleventy's output directory", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "emp-postlist-"));
    try {
        const hooks = {};
        const filters = {};
        registerPostlist({
            on: (event, callback) => { hooks[event] = callback; },
            getFilter: () => value => HtmlBasePlugin.applyBaseToUrl(value, "/blog/"),
            addNunjucksFilter: (name, callback) => { filters[name] = callback; }
        });
        const context = { ctx: {
            siteelements: { features: { js: true } },
            siteconfig: { lang: "en", jsonReadPrefix: "/api/" },
            sitestrings: { en: {} },
            inlinesvg: {}, page: { url: "/events/" }
        } };
        const items = [{ ...item, properties: { date: "Already formatted", tags: [] } }];
        const pagination = { pageNumber: 1, href: { first: "/events/" }, hrefs: ["/events/", "/events/1/"] };
        const event = { directories: { output: dir } };
        hooks["eleventy.before"]();
        const list = filters.postlistData.call(context, items, pagination);
        const decorations = {
            badges: [{ label: "Static badge" }],
            metrics: [{ label: "Participants", value: 24, max: 30 }],
            actions: [{ label: "Register", href: "/blog/register/" }]
        };
        filters.exportMetricsActions(decorations, "/event/");
        assert.equal(list.readUrl, "/api/blog/events/postlist/");
        assert.equal(list.number, 2);
        await hooks["eleventy.after"](event);
        const file = path.join(event.directories.output, "events/postlist/2.json");
        assert.deepEqual(JSON.parse(await readFile(file, "utf8")), { items, pagination: { page: 2, totalPages: 2 } });
        const decorationFile = path.join(event.directories.output, "event/metrics-actions.json");
        assert.deepEqual(JSON.parse(await readFile(decorationFile, "utf8")), {
            metrics: decorations.metrics, actions: decorations.actions
        });
        hooks["eleventy.before"]();
        decorations.metrics[0].value = 25;
        filters.exportMetricsActions(decorations, "/event/");
        const rebuilt = path.join(dir, "rebuilt");
        await hooks["eleventy.after"]({ directories: { output: rebuilt } });
        assert.equal(JSON.parse(await readFile(path.join(rebuilt, "event/metrics-actions.json"), "utf8")).metrics[0].value, 25);
        await assert.rejects(access(path.join(rebuilt, "events/postlist/2.json")), { code: "ENOENT" });
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test("JSON list templates bind read prefixes and export empty standalone lists", async () => {
    const env = new nunjucks.Environment(new nunjucks.FileSystemLoader("content/_includes"));
    env.addExtension("postCard", {
        tags: ["postCard"],
        parse(parser, nodes) {
            const token = parser.nextToken();
            const args = parser.parseSignature(null, true);
            parser.advanceAfterBlockEnd(token.value);
            return new nodes.CallExtension(this, "run", args);
        },
        run() { assert.fail("JSON lists render their cards in the browser"); }
    });
    registerFilters({
        addFilter: (name, fn) => env.addFilter(name, fn),
        addNunjucksFilter: (name, fn) => env.addFilter(name, fn),
        addNunjucksAsyncFilter: (name, fn) => env.addFilter(name, fn, true),
        getFilter: () => value => HtmlBasePlugin.applyBaseToUrl(value, "/blog/")
    });
    const hooks = {};
    registerPostlist({
        on: (event, fn) => { hooks[event] = fn; },
        addNunjucksFilter: (name, fn) => env.addFilter(name, fn),
        getFilter: () => value => HtmlBasePlugin.applyBaseToUrl(value, "/blog/")
    });
    const message = 'No JS <b>please</b> </script><script>bad()</script>';
    const context = {
        siteelements: { features: { js: true, index: "json", postproperties: true, postlistThumbnail: "right", lqip: true, liveMetricsActions: true } },
        siteconfig: { lang: "en", url: "https://example.org", jsonReadPrefix: "https://data.example/api/", privateSetting: "not-for-browser" },
        sitestrings: { en: { postlist_no_js: message } },
        inlinesvg: {}, page: { url: "/custom/" }
    };
    const html = await env.renderString('{% include "postlist.njk" %}', context);
    assert.match(html, /data-postlist-url="https:\/\/data.example\/api\/blog\/custom\/postlist\/"/);
    assert.match(html, /data-initial-page="1"/);
    assert.match(html.match(/<noscript>([\s\S]*?)<\/noscript>/)[1], /&lt;b&gt;please&lt;\/b&gt;/);
    assert.doesNotMatch(html, /<script>bad|<b>|not-for-browser/);
    const serialized = html.match(/class="postlist-options">([^<]*)<\/script>/)[1];
    const rendererContext = JSON.parse(serialized);
    assert.equal(rendererContext.sitestrings[rendererContext.siteconfig.lang].postlist_no_js, message);
    assert.equal(rendererContext.siteelements.features.liveMetricsActions, undefined);
    const card = { ...item, properties: { decorations: {
        badges: [{ label: "Workshop" }],
        metrics: [{ label: "Participants", value: 24, max: 30 }],
        actions: [{ label: "Register", href: "/blog/register/" }]
    } } };
    const rendered = renderCard(card, rendererContext);
    assert.match(rendered, /Workshop/);
    assert.match(rendered, /24 \/ 30/);
    assert.match(rendered, /href="\/blog\/register\/"/);
    assert.doesNotMatch(rendered, /data-metrics-actions-url/);
    const output = await mkdtemp(path.join(os.tmpdir(), "emp-custom-list-"));
    try {
        await hooks["eleventy.after"]({ directories: { output } });
        assert.deepEqual(JSON.parse(await readFile(path.join(output, "custom/postlist/1.json"), "utf8")),
            { items: [], pagination: { page: null, totalPages: 0 } });
    } finally {
        await rm(output, { recursive: true, force: true });
    }
});

test("pagination provides prefixed native links and current-page indication in Nunjucks and JavaScript", async () => {
    const filters = {};
    registerPostCards({
        addNunjucksFilter: (name, fn) => { filters[name] = fn; },
        addShortcode() {}, addFilter() {},
        getFilter: () => value => HtmlBasePlugin.applyBaseToUrl(value, "/blog/")
    });
    const ctx = {
        siteconfig: { lang: "en" },
        sitestrings: { en: {
            first_page: "First",
            previous_page: "Previous", next_page: "Next", last_page: "Last", go_to_page: 'Page "<'
        } },
        inlinesvg: {}
    };
    const hrefs = ["/events/", "/events/1/", "/events/2/"];
    const env = new nunjucks.Environment(new nunjucks.FileSystemLoader("content/_includes"));
    env.addFilter("postPagination", filters.postPagination);
    for (const page of [1, 2, 3]) {
        const output = await env.render("postpagination.njk", {
            ...ctx, siteelements: { features: { index: "postlist" } },
            pagination: { pageNumber: page - 1, hrefs }
        });
        const anchors = [...output.matchAll(/<a\b([^>]*)>/g)].map(([, attributes]) => attributes);
        for (const href of ["/blog/events/", "/blog/events/1/", "/blog/events/2/"]) assert.ok(anchors.some(attributes => attributes.includes(`href="${href}"`)));
        assert.match(output, new RegExp('<div class="active"><a class="page-number"[^>]*>' + page + '</a>'));
        assert.equal(output.includes('aria-label="Previous"'), page > 1);
        assert.match(output, /Page &quot;&lt;/);
    }
    assert.equal(renderPagination({ page: null, totalPages: 0 }, () => "", ctx), "");
    assert.equal(renderPagination({ page: 1, totalPages: 1 }, () => "/events/", ctx), "");
    const controlHref = (html, label) => {
        const link = [...html.matchAll(/<a\b([^>]*)>/g)].find(([, attributes]) => attributes.includes(`aria-label="${label}"`));
        assert.ok(link, label);
        return link[1].match(/\bhref="([^"]*)"/)[1];
    };
    const first = renderPagination({ page: 1, totalPages: 8 }, n => "/page/" + n, ctx);
    assert.equal(controlHref(first, "Next"), "/page/2");
    assert.equal(controlHref(first, "Last"), "/page/8");
    const last = renderPagination({ page: 8, totalPages: 8 }, n => "/page/" + n, ctx);
    assert.equal(controlHref(last, "Previous"), "/page/7");
    assert.doesNotMatch(last, /aria-label="Next"|aria-label="Last"/);
});
