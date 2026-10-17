import assert from "node:assert/strict";
import test from "node:test";
import plugins from "../_11ty/plugins.js";
import siteconfig from "../content/_data/siteconfig.js";

const register = async (t) => {
    const original = siteconfig.plugins;
    t.after(() => { siteconfig.plugins = original; });
    siteconfig.plugins = {};
    const shortcodes = {};
    await plugins({
        addNunjucksAsyncShortcode(name, render) {
            shortcodes[name] = (config) => {
                siteconfig.plugins = config;
                return render();
            };
        }
    });
    return shortcodes;
};

test("plugin shortcodes emit nothing for absent, disabled or unconfigured plugins", async (t) => {
    const shortcodes = await register(t);
    for (const config of [
        undefined,
        { google: {}, meta: {} },
        { google: true, meta: true },
        { google: false, meta: false, "syntax-highlighting": false },
    ]) {
        for (const render of Object.values(shortcodes)) assert.equal(await render(config), "");
    }
});

test("Meta app metadata does not activate tracking", async (t) => {
    const shortcodes = await register(t);
    const config = { meta: { appId: "123456789" } };
    const metadata = await shortcodes.pluginsOpengraph(config);
    assert.match(metadata, /\bproperty=["']fb:app_id["']/);
    assert.match(metadata, /\bcontent=["']123456789["']/);
    assert.equal(await shortcodes.pluginsHead(config), "");
    assert.equal(await shortcodes.pluginsBodyStart(config), "");
});

test("shortcodes emit configured tracking without leaking previous render settings", async (t) => {
    const { pluginsHead: head, pluginsBodyStart: bodyStart } = await register(t);
    const first = { google: { tagId: "G-FIRST" }, meta: { pixelId: "123" } };
    const html = await head(first);
    assert(html.includes("https://www.googletagmanager.com/gtag/js?id=G-FIRST"));
    assert(html.includes("gtag('config', 'G-FIRST')"));
    const pixel = await bodyStart(first);
    assert(pixel.includes("https://connect.facebook.net/en_US/fbevents.js"));
    assert(pixel.includes("fbq('init', '123')"));
    assert(pixel.includes("https://www.facebook.com/tr?id=123&ev=PageView&noscript=1"));
    const second = await head({ google: { tagId: "G-SECOND" } });
    assert(second.includes("id=G-SECOND"));
    assert(!second.includes("G-FIRST"));
    assert(!second.includes("connect.facebook.net"));
    assert.equal(await head(), "");
    assert.equal(await bodyStart({ google: { tagId: "G-SECOND" } }), "");
});
