import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import nunjucks from "@11ty/nunjucks";
import slugify from "@sindresorhus/slugify";
import { HtmlBasePlugin } from "@11ty/eleventy";
import registerFilters from "../_11ty/filters.js";
import registerDates from "../_11ty/dates.js";
import registerExcerpt from "../_11ty/excerpt.js";
import registerMinify from "../_11ty/minify.js";
import siteconfig from "../content/_data/siteconfig.js";

const template = name => readFileSync(new URL(`../content/${name}`, import.meta.url), "utf8")
    .replace(/^---\n[\s\S]*?\n---\n/, "");

const imageUrl = "https://images.example/image.png?width=1200&format=webp";

function environment() {
    const env = new nunjucks.Environment();
    const addShortcode = (name, render) => env.addExtension(name, {
        tags: [name],
        parse(parser, nodes) {
            const token = parser.nextToken();
            const args = parser.parseSignature(true, true);
            parser.advanceAfterBlockEnd(token.value);
            return new nodes.CallExtensionAsync(this, "run", args);
        },
        run(context, ...args) {
            const callback = args.pop();
            Promise.resolve().then(() => render.call({ ctx: context.ctx }, ...args))
                .then(value => callback(null, new nunjucks.runtime.SafeString(String(value))), callback);
        }
    });
    const config = {
        addFilter: (name, fn) => env.addFilter(name, fn),
        addNunjucksFilter: (name, fn) => env.addFilter(name, fn),
        addNunjucksAsyncFilter: (name, fn) => env.addFilter(name, fn, true),
        addShortcode, addNunjucksShortcode: addShortcode, addTransform() {},
        getFilter: name => env.getFilter(name)
    };
    env.addFilter("url", value => HtmlBasePlugin.applyBaseToUrl(value, "/blog/"));
    env.addFilter("empSlugify", slugify);
    registerFilters(config);
    registerDates(config);
    registerExcerpt(config);
    registerMinify(config);
    // Image processing is independent of JSON serialization; exercise async shortcode capture.
    addShortcode("imageTransform", async () => imageUrl);
    addShortcode("imageTransformAbsoluteUrl", async () => imageUrl);
    return env;
}

const render = (env, source, context) => new Promise((resolve, reject) =>
    env.renderString(source, context, (error, result) => error ? reject(error) : resolve(result)));

function metadataContext(text) {
    const website = "https://author.example/?a=1&b=2";
    const author = { fullName: "Author", website };
    const item = { url: "/post/?a=1&b=2", date: new Date("2026-01-02T03:04:05Z"), templateContent: '<p>Full &amp; "quoted" body.</p>', data: { title: text, excerpt: text, tags: ["posts", text], updated: new Date("2026-02-03T04:05:06Z") } };
    return {
        siteconfig: { ...siteconfig, title: text, description: text, author: "author", authorType: "Person", webmanifestSizes: [192] },
        siteelements: { features: { json_ld: true }, feeds: { fullContent: true }, social: {} },
        siteauthors: { author }, sitetags: { events: [] },
        collections: { empPosts: [item] }, page: { url: item.url, date: item.date },
        tags: ["posts", text], title: text, excerpt: text,
        updated: item.data.updated
    };
}

test("JSON feed and webmanifest preserve metadata text, URLs and captured images", async () => {
    const env = environment();
    const text = 'Fish & Chips "Club"\n</script><script>not markup</script>';
    const context = metadataContext(text);
    const manifest = JSON.parse(await render(env, template("utils/site.webmanifest.njk"), context));
    assert.equal(manifest.name, text);
    assert.equal(manifest.icons[0].src, imageUrl);
    const feed = JSON.parse(await render(env, template("utils/feed.json.njk"), context));
    const item = context.collections.empPosts[0];
    assert.equal(feed.title, text);
    assert.equal(feed.description, text);
    assert.equal(feed.authors[0].url, context.siteauthors.author.website);
    assert.equal(feed.icon, imageUrl);
    assert.equal(feed.items[0].url, new URL("/blog" + item.url, siteconfig.url).href);
    assert.equal(feed.items[0].title, text);
    assert.equal(feed.items[0].summary, text);
    assert.deepEqual(feed.items[0].tags, [text]);
    assert.equal(feed.items[0].image, imageUrl);
    assert.match(feed.items[0].content_html, /Full &amp; "quoted" body/);
});

test("JSON-LD serializes whole metadata values without closing its script element", async () => {
    const env = environment();
    const text = 'Fish & Chips "Club"\n</script><script>not markup</script>';
    const context = metadataContext(text);
    const html = await render(env, template("_includes/json-ld.njk"), context);
    assert.equal((html.match(/<script\b/g) || []).length, 1);
    assert.equal((html.match(/<\/script>/g) || []).length, 1);
    const [website, post] = JSON.parse(html.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1])["@graph"];
    assert.equal(website.name, text);
    assert.equal(post.headline, `${text} - ${text}`);
    assert.equal(post.url, new URL("/blog" + context.page.url, siteconfig.url).href);
    assert.equal(post.image[0], imageUrl);
});
