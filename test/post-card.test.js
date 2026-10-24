import assert from "node:assert/strict";
import test from "node:test";
import nunjucks from "@11ty/nunjucks";
import registerPostProperties, { renderProperties } from "../_11ty/post-properties.js";
import staticPostlist from "../extensions/postlist/static/index.js";
import { html } from "../assets/js/html.js";
import { createPostCardRenderer } from "../extensions/postlist/post-card.js";
import registerDates from "../_11ty/dates.js";
import registerFilters from "../_11ty/filters.js";
import registerExcerpt from "../_11ty/excerpt.js";

const renderCard = createPostCardRenderer(html, renderProperties);

const context = {
    siteelements: { features: { postproperties: true, postlistThumbnail: "right" } },
    inlinesvg: {},
    sitestrings: { en: { pinned_badge: "Pinned", posts_by: "Posts by", posts_tagged: "Posts tagged" } },
    siteconfig: { lang: "en", url: "https://site.example/blog/", internalUrls: ["https://internal.example/allowed/"] }
};

test("card rendering escapes text and attributes", () => {
    const html = renderCard({
        url: "/post/",
        title: '<img src=x onerror="alert(1)">',
        excerpt: "<script>alert(1)</script>",
        properties: {
            author: { name: "A & B", url: "/people/a-b/" },
            place: { name: "Somewhere", address: 'A "quoted" place' },
            decorations: {
                badges: [{ label: "<strong>New</strong>", variant: 'x" onclick="bad' }],
                metrics: [],
                actions: [{ label: "<Register>", href: "/sign/?a=1&b=2" }]
            }
        }
    }, context);

    assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
    assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.match(html, /data-address="A &quot;quoted&quot; place"/);
    assert.match(html, /data-variant="x&quot; onclick=&quot;bad"/);
    assert.match(html, /href="\/sign\/\?a=1&amp;b=2"/);
    assert.match(html, /&lt;Register&gt;/);
    assert.doesNotMatch(html, /<strong>|<img src=x|onclick="bad/);
});

const prepareCards = async posts => {
    const env = new nunjucks.Environment(new nunjucks.FileSystemLoader("content/_includes"), { autoescape: true });
    const shortcodes = {};
    const config = {
        addFilter: (name, fn) => env.addFilter(name, fn),
        addNunjucksFilter: (name, fn) => env.addFilter(name, fn),
        addNunjucksAsyncFilter: (name, fn) => env.addFilter(name, fn, true),
        addShortcode: (name, fn) => { shortcodes[name] = fn; },
        getFilter: name => env.getFilter(name),
        addNunjucksShortcode() {}
    };
    for (const register of [registerDates, registerFilters, registerExcerpt]) register(config);
    // Stub the URL filter to check that template preparation applies it.
    env.addFilter("url", value => value.startsWith("/") ? "/blog" + value : value);
    registerPostProperties(config);
    await staticPostlist.setup(config);
    const context = {
        siteconfig: { lang: "en", pagination: { authorLinkPrefix: "/people/", tagLinkPrefix: "/" } },
        siteelements: { features: { postproperties: true, postlistThumbnail: false } },
        sitestrings: { en: { words: "words", posts_by: "Posts by", posts_tagged: "Posts tagged" } },
        siteauthors: { author: { fullName: "Page author" } },
        sitetags: { notime: ["event"], notag: ["posts"], aliases: { event: "events" }, icons: {} },
        inlinesvg: {}
    };
    const items = [];
    await env.renderString(`{% for post in posts %}
        {% import "post-card-data.njk" as prepared with context %}{{ collect(prepared.card) }}{% endfor %}`, {
        ...context, posts,
        collect(card) { items.push(card); return ""; }
    });
    return { items, context, shortcodes };
};

test("Nunjucks prepares configured links and body reading time without leaking post data", async () => {
    const first = { url: "/one/", data: { title: "A & B", author: "author", tags: ["posts", "event"], decorations: {
        badges: [{ label: "Open" }], metrics: [{ label: "Capacity", value: 0, max: 30 }],
        actions: [{ label: "Go", href: "/target/" }, { label: "External", href: "https://other.example/" }, { label: "Button" }]
    } }, templateContent: "Hello" };
    const original = structuredClone(first);
    const { items: [one, two], context, shortcodes } = await prepareCards([first, {
        url: "/two/", data: { title: "Second",
            postAttachments: [{ name: "An attachment.txt", path: "/file.txt" }],
            postUpdates: [{ data: { title: "An update" }, date: new Date("2026-01-01"), templateContent: "<p>" + "word ".repeat(500) + "</p>" }]
        }, templateContent: "<p>Two words.</p>"
    }]);
    assert.equal(one.properties.author.name, "Page author");
    assert.equal(one.properties.author.url, "/blog/people/author/");
    assert.deepEqual(one.properties.tags.map(tag => tag.name), ["Event"]);
    assert.equal(one.properties.tags[0].url, "/blog/events/");
    assert.equal(one.properties.decorations.actions[0].href, "/blog/target/");
    assert.equal(one.properties.decorations.actions[0].external, false);
    assert.equal(one.properties.decorations.actions[1].external, true);
    assert.equal(one.properties.decorations.actions[2].href, "");
    assert.equal(one.properties.readingTime, null);
    assert.equal(one.properties.decorations.metrics[0].value, 0);
    assert.equal(two.properties.author, null);
    assert.equal(two.properties.readingTime.wordsLabel, "2 words");
    assert.equal(two.properties.readingTime.label, "1 minute", "attachments and updates do not inflate reading time");
    assert.deepEqual(two.properties.tags, []);
    assert.deepEqual(two.properties.decorations, { badges: [], metrics: [], actions: [] });
    assert.deepEqual(first, original);
    const html = shortcodes.postCard(one, context);
    assert.match(html, /A &amp; B/);
    assert.match(html, /href="\/blog\/one\/"/);
    assert.match(html, /Page author/);
    assert.match(html, /href="https:\/\/other.example\/" target="_blank" rel="noopener"/);
    assert.match(html, /<button\b[^>]*><span>Button<\/span><\/button>/);
    assert.match(shortcodes.postProperties.call({ ctx: context }, one), /Posts by Page author/);
});
