import assert from "node:assert/strict";
import test from "node:test";
import { HtmlBasePlugin } from "@11ty/eleventy";
import registerFilters from "../_11ty/filters.js";
import { createMarkdownLibrary } from "../_11ty/markdown.js";
import siteconfig from "../content/_data/siteconfig.js";

const filters = {};

const filterConfig = {
    pathPrefix: "/",
    getFilter() {
        return (path) => HtmlBasePlugin.applyBaseToUrl(path, filterConfig.pathPrefix);
    },
    addFilter(name, filter) {
        filters[name] = filter;
    },
    addNunjucksFilter(name, filter) {
        filters[name] = filter;
    },
    addNunjucksAsyncFilter() {}
};

registerFilters(filterConfig);

test("navigation is active on its own page and descendant pages", () => {
    assert.equal(filters.isActiveLink("/posts/", "/posts/"), "active");
    assert.equal(filters.isActiveLink("/posts/entry/", "/posts"), "active");
    assert.equal(filters.isActiveLink("/postscript/", "/posts"), "");
});

test("absolute URLs resolve root-relative, relative, and external inputs", () => {
    const originalUrl = siteconfig.url;

    try {
        siteconfig.url = "https://site.example/";
        assert.equal(filters.absoluteUrl("/"), "https://site.example/");
        assert.equal(filters.absoluteUrl("/posts/a b/?page=1#summary"), "https://site.example/posts/a%20b/?page=1#summary");
        assert.equal(filters.absoluteUrl("posts/entry/"), "https://site.example/posts/entry/");
        assert.equal(filters.absoluteUrl("https://other.example/path"), "https://other.example/path");
    } finally {
        siteconfig.url = originalUrl;
    }
});

test("absolute URLs include the deployment prefix for logical paths", () => {
    const originalUrl = siteconfig.url;

    try {
        siteconfig.url = "https://site.example/blog/";
        filterConfig.pathPrefix = "/blog/";
        assert.equal(filters.absoluteUrl("/"), "https://site.example/blog/");
        assert.equal(filters.absoluteUrl("/posts/"), "https://site.example/blog/posts/");
        assert.equal(filters.absoluteUrl("posts/"), "https://site.example/blog/posts/");
        assert.equal(filters.absoluteUrl("#website"), "https://site.example/blog/#website");
    } finally {
        siteconfig.url = originalUrl;
        filterConfig.pathPrefix = "/";
    }
});

test("feed image URLs prefix Markdown images without changing links, remote images or code", () => {
    const markdown = createMarkdownLibrary();
    const source = '[![A > B](/images/sample.png?x=1&y=2#detail)](/blog/post/)\n\n![Remote](https://example.com/image.png) ![CDN](//cdn.example.com/image.png) ![Relative](sample.png)\n\n`<img src="/images/code.png">`';
    const html = markdown.render(source);
    try {
        for (const prefix of ["/", "/blog/", "/project/subdir/"]) {
            filterConfig.pathPrefix = prefix;
            const result = filters.feedImageUrls(html);
            assert.ok(result.includes(`<img src="${prefix}images/sample.png?x=1&amp;y=2#detail" alt="A &gt; B"`));
            assert.ok(result.includes('<a href="/blog/post/">'));
            assert.ok(result.includes('<img src="https://example.com/image.png"'));
            assert.ok(result.includes('<img src="//cdn.example.com/image.png"'));
            assert.ok(result.includes('<img src="sample.png"'));
            assert.ok(result.includes('<code>&lt;img src=&quot;/images/code.png&quot;&gt;</code>'));
        }
    } finally {
        filterConfig.pathPrefix = "/";
    }
});

test("reading-time units use English plural rules", () => {
    const originalLanguage = siteconfig.lang;

    try {
        siteconfig.lang = "en";
        assert.deepEqual([1, 2, 11, 21].map(filters.formatReadingTime), [
            "1 minute",
            "2 minutes",
            "11 minutes",
            "21 minutes"
        ]);
    } finally {
        siteconfig.lang = originalLanguage;
    }
});

test("reading-time units use Latvian plural rules", () => {
    const originalLanguage = siteconfig.lang;

    try {
        siteconfig.lang = "lv";
        assert.deepEqual([1, 2, 11, 21].map(filters.formatReadingTime), [
            "1 minūte",
            "2 minūtes",
            "11 minūšu",
            "21 minūte"
        ]);
    } finally {
        siteconfig.lang = originalLanguage;
    }
});

test("word counts use the configured locale with an English fallback", () => {
    const originalLanguage = siteconfig.lang;

    try {
        siteconfig.lang = "en";
        assert.equal(filters.formatWords(1234567), "1,234,567");

        siteconfig.lang = "lv";
        assert.equal(filters.formatWords(1234567), "1\u00a0234\u00a0567");

        siteconfig.lang = "";
        assert.equal(filters.formatWords(1234567), "1,234,567");
    } finally {
        siteconfig.lang = originalLanguage;
    }
});
