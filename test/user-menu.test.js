import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import nunjucks from "@11ty/nunjucks";
import JSON5 from "json5";

const data = name => JSON5.parse(readFileSync(new URL(`../content/_data/${name}.json5`, import.meta.url), "utf8"));
const defaults = data("siteelements");
const env = new nunjucks.Environment(new nunjucks.FileSystemLoader(new URL("../content/_includes", import.meta.url).pathname));
env.addFilter("url", value => `/blog${value}`);
env.addFilter("isHomeLink", () => "");
env.addFilter("isActiveLink", () => "");

function context(features, lang = "en") {
    return {
        siteelements: {
            ...defaults,
            features: { ...defaults.features, search: false, sitesocial: false, ...features },
            privacyPolicy: { name: "Configured policy", url: "/custom-policy/" }
        },
        siteconfig: { lang, title: "Example", image: "/logo.png" },
        sitestrings: data("sitestrings"),
        inlinesvg: data("inlinesvg"),
        page: { url: "/" }
    };
}

test("user menu is opt-in and replaces the sidebar policy link when enabled", async () => {
    assert.equal(defaults.features.userMenu, false);
    for (const [userMenu, js] of [[false, true], [true, false], [true, true]]) {
        const html = await env.render("sidebar.njk", context({ userMenu, js, privacyPolicy: "sidebar" }));
        assert.equal(html.includes("/blog/custom-policy/"), !userMenu || !js);
        assert.equal(html.includes('id="sidebar-user-menu-open"'), Boolean(userMenu && js));
        if (userMenu && js) assert.match(html, /commandfor="user-menu-dialog" command="show-modal"/);
    }
});

test("user popup obeys privacy placement and uses localized labels and configured policy URL", async () => {
    for (const [privacyPolicy, lang] of [["sidebar", "lv"], ["footer", "en"], [false, "en"]]) {
        const values = context({ userMenu: true, js: true, privacyPolicy }, lang);
        const dialog = await env.render("user-menu.njk", values);
        assert.match(dialog, /<dialog\b[^>]*id="user-menu-dialog"/);
        assert.match(dialog, /id="user-menu-sign-in"/);
        assert.equal(dialog.includes("/blog/custom-policy/"), privacyPolicy === "sidebar");
        assert.equal(dialog.includes("Configured policy"), privacyPolicy === "sidebar");
        assert.match(dialog, lang === "en" ? /Sign in/ : /Pierakst/);
    }
});

test("CMS menu link follows the configured prefixed path and stays gated by sign-in", async () => {
    for (const lang of ["en", "lv"]) {
        const values = context({ userMenu: true, js: true }, lang);
        assert.doesNotMatch(await env.render("user-menu.njk", values), /user-menu-cms/);
        values.cmsPath = "/tools/editor/";
        const html = await env.render("user-menu.njk", values);
        assert.match(html, /id="user-menu-cms"[^>]+href="\/blog\/tools\/editor\/"[^>]*hidden/);
        assert(html.includes(values.sitestrings[lang].cms_title));
    }
});
