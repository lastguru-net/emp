import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import nunjucks from "@11ty/nunjucks";
import JSON5 from "json5";
import { HtmlBasePlugin } from "@11ty/eleventy";
import registerFilters from "../_11ty/filters.js";
import siteconfig from "../content/_data/siteconfig.js";

const data = name => JSON5.parse(readFileSync(new URL(`../content/_data/${name}.json5`, import.meta.url), "utf8"));
const env = new nunjucks.Environment(new nunjucks.FileSystemLoader(new URL("../content/_includes", import.meta.url).pathname));
env.addFilter("url", value => HtmlBasePlugin.applyBaseToUrl(value, "/blog/"));
registerFilters({
    addFilter: (name, fn) => env.addFilter(name, fn),
    addNunjucksFilter: (name, fn) => env.addFilter(name, fn),
    addNunjucksAsyncFilter: (name, fn) => env.addFilter(name, fn, true),
    getFilter: name => env.getFilter(name)
});
const context = {
    siteconfig,
    siteelements: data("siteelements"),
    sitestrings: data("sitestrings"),
    inlinesvg: data("inlinesvg"),
    page: { url: "/custom/a&b%20c/" }, title: "A & B"
};

test("sharing query values preserve the complete canonical URL and separate provider options", async () => {
    const html = await env.render("social.njk", context);
    const links = [...html.matchAll(/<a\b[^>]*href="([^"]*)"/g)].map(([, href]) => new URL(href.replaceAll("&amp;", "&")));
    const canonical = new URL("/blog/custom/a&b%20c/", siteconfig.url).href;
    const provider = host => {
        const link = links.find(link => link.hostname === host);
        assert.ok(link, host);
        return link.searchParams;
    };
    assert.equal(provider("bsky.app").get("text"), `A & B ${canonical}`);
    assert.equal(provider("threads.net").get("text"), canonical);
    assert.equal(provider("www.facebook.com").get("u"), canonical);
    assert.equal(provider("www.facebook.com").get("display"), "popup");
    assert.equal(provider("x.com").get("url"), canonical);
    assert.equal(provider("x.com").get("text"), "A & B");
    assert.equal(provider("x.com").get("via"), context.siteelements.social.twitter_x);
    assert.equal(provider("www.linkedin.com").get("url"), canonical);
});
