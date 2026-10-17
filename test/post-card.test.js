import assert from "node:assert/strict";
import test from "node:test";
import nunjucks from "@11ty/nunjucks";
import registerPostCards from "../_11ty/post-card.js";
import registerDates from "../_11ty/dates.js";
import registerFilters from "../_11ty/filters.js";
import registerExcerpt from "../_11ty/excerpt.js";
import { renderCard, renderProperties } from "../assets/js/post-card.js";

const context = {
    siteelements: { features: { postproperties: true, postlistThumbnail: "right" } },
    inlinesvg: {},
    sitestrings: { en: { pinned_badge: "Pinned", posts_by: "Posts by", posts_tagged: "Posts tagged" } },
    siteconfig: { lang: "en", url: "https://site.example/blog/", internalUrls: ["https://internal.example/allowed/"] }
};

test("card rendering escapes text and rejects script and data URLs", () => {
    const html = renderCard({
        url: "javascript:alert(1)",
        title: '<img src=x onerror="alert(1)">',
        excerpt: "<script>alert(1)</script>",
        properties: {
            author: { name: "A & B", url: "data:text/html,bad" },
            place: { name: "Somewhere", address: 'A "quoted" place' },
            decorations: {
                badges: [{ label: "<strong>New</strong>", variant: 'x" onclick="bad' }],
                metrics: [],
                actions: [{ label: "Unsafe", href: "javascript:bad" }]
            }
        }
    }, context);

    assert.match(html, /href="#"/);
    assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
    assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.match(html, /data-address="A &quot;quoted&quot; place"/);
    assert.match(html, /data-variant="x&quot; onclick=&quot;bad"/);
    assert.match(html, /<button\b[^>]*>[\s\S]*?Unsafe[\s\S]*?<\/button>/);
    assert.doesNotMatch(html, /javascript:|data:text|<strong>|<img src=x|onclick="bad/);
});

test("external link attributes use exact configured origin and path boundaries", () => {
    const cases = [
        ["Local", "https://site.example/blog/post/", false],
        ["Outside base", "https://site.example/elsewhere/", true],
        ["Lookalike", "https://site.example.evil/blog/", true],
        ["Additional", "https://internal.example/allowed/item/", false],
        ["Email", "mailto:test@example.com", false]
    ];
    const properties = { decorations: { actions: cases.map(([label, href]) => ({ label, href })) } };
    const html = renderProperties({ properties }, context);

    const links = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)];
    for (const [label, href, external] of cases) {
        const link = links.find(([, , content]) => content.includes(label));
        assert.ok(link, label);
        const attributes = Object.fromEntries([...link[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(([, name, value]) => [name, value]));
        assert.equal(attributes.href, href);
        assert.equal(attributes.target, external ? "_blank" : undefined);
        assert.equal(attributes.rel, external ? "noopener" : undefined);
    }
});

test("responsive images retain valid candidates and reject unsafe sources", () => {
    const html = renderCard({
        url: "/post/",
        title: "Post",
        thumbnail: {
            src: "/images/post.png",
            srcset: "javascript:bad 160w, /images/post-320.png 320w, /images/bad.png nope",
            sources: [
                { type: "image/webp", srcset: "/images/post.webp 320w" },
                { type: "text/html", srcset: "/images/not-an-image 320w" }
            ]
        }
    }, context);

    assert.match(html, /srcset="\/images\/post-320\.png 320w"/);
    assert.match(html, /<source\b[^>]*type="image\/webp"/);
    assert.doesNotMatch(html, /javascript:bad|text\/html|nope/);
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
    registerPostCards(config);
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
        actions: [{ label: "Go", href: "/target/" }]
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
    assert.equal(one.properties.readingTime, null);
    assert.equal(one.properties.decorations.metrics[0].value, 0);
    assert.equal(two.properties.author, null);
    assert.equal(two.properties.readingTime.wordsLabel, "2 words");
    assert.equal(two.properties.readingTime.label, "1 minute", "attachments and updates do not inflate reading time");
    assert.deepEqual(two.properties.tags, []);
    assert.deepEqual(two.properties.decorations, { badges: [], metrics: [], actions: [] });
    assert.deepEqual(first, original);
    const html = shortcodes.postCard.call({ ctx: context }, one);
    assert.match(html, /A &amp; B/);
    assert.match(html, /href="\/blog\/one\/"/);
    assert.match(html, /Page author/);
    assert.match(shortcodes.postProperties.call({ ctx: context }, one), /Posts by Page author/);
});
