import assert from "node:assert/strict";
import test from "node:test";
import registerFilters from "../_11ty/filters.js";
import siteconfig from "../content/_data/siteconfig.js";

const filters = {};

registerFilters({
    addNunjucksFilter(name, filter) {
        filters[name] = filter;
    },
    addNunjucksAsyncFilter() {}
});

test("home-link detection requires both URLs to be the site root", () => {
    assert.equal(filters.isHomeLink("/", "/"), "active");
    assert.equal(filters.isHomeLink("/posts/", "/"), "");
    assert.equal(filters.isHomeLink("/", "/posts/"), "");
    assert.equal(filters.isHomeLink(undefined, undefined), "");
});

test("active-link detection uses a non-root prefix match", () => {
    assert.equal(filters.isActiveLink("/posts/entry/", "/posts/"), "active");
    assert.equal(filters.isActiveLink("/posts/", "/posts/"), "active");
    assert.equal(filters.isActiveLink("/postscript/", "/posts"), "active");
    assert.equal(filters.isActiveLink("/", "/"), "");
    assert.equal(filters.isActiveLink("/posts/", ""), "");
    assert.equal(filters.isActiveLink("/tags/", "/posts/"), "");
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

test("absolute URLs retain native URL base-path semantics", () => {
    const originalUrl = siteconfig.url;

    try {
        siteconfig.url = "https://site.example/blog/";
        assert.equal(filters.absoluteUrl("/"), "https://site.example/");
        assert.equal(filters.absoluteUrl("/posts/"), "https://site.example/posts/");
        assert.equal(filters.absoluteUrl("posts/"), "https://site.example/blog/posts/");
        assert.equal(filters.absoluteUrl("#website"), "https://site.example/blog/#website");
    } finally {
        siteconfig.url = originalUrl;
    }
});

test("reading-time calculation is unchanged", () => {
    assert.equal(filters.readingTime(1), 1);
    assert.equal(filters.readingTime(250), 1);
    assert.equal(filters.readingTime(251), 2);
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

test("JSON escaping handles nullish, primitive, and control-character inputs", () => {
    assert.equal(filters.jsonEscape(undefined), "");
    assert.equal(filters.jsonEscape(null), "");
    assert.equal(filters.jsonEscape(42), "42");
    assert.equal(filters.jsonEscape(true), "true");
    assert.equal(filters.jsonEscape('quote " slash \\ newline\n tab\t'), 'quote \\" slash \\\\ newline\\n tab\\t');
});
