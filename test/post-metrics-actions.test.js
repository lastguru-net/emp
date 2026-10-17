import assert from "node:assert/strict";
import test from "node:test";
import { setImmediate } from "node:timers/promises";
import { mountMetricsActions } from "../assets/js/post-metrics-actions.js";
import { renderProperties, renderMetricsActions } from "../assets/js/post-card.js";

const context = { siteconfig: { lang: "lv" } };
const data = { metrics: [{ label: "Participants", value: 18, max: 30, progress: true }], actions: [] };
const response = (body = data) => ({ ok: true, json: async () => body });

const badge = '<div class="postbadges">Workshop</div>';
function region() {
    const children = [{ html: badge, live: false }];
    const root = Object.assign(new EventTarget(), {
        isConnected: true, dataset: { metricsActionsUrl: "/api/blog/event/" },
        querySelectorAll(selector) {
            assert.equal(selector, ":scope > .postmetrics, :scope > .postactions");
            return children.filter(child => child.live).map(child => ({ remove() { children.splice(children.indexOf(child), 1); } }));
        },
        insertAdjacentHTML(position, html) {
            assert.equal(position, "beforeend");
            if (html) children.push({ html, live: true });
        },
        children,
        classList: { toggle() {} }
    });
    Object.defineProperty(root, "innerHTML", { get: () => children.map(child => child.html).join("") });
    return root;
}

test("live properties bind to their post URL and preserve static badges and venue", () => {
    const properties = { place: { name: "Venue" }, decorations: {
        badges: [{ label: "Workshop" }], ...data, actions: [{ label: "Go", href: "/go/" }]
    } };
    const staticHtml = renderProperties({ properties }, context);
    assert.match(staticHtml, /Participants/);
    assert.match(staticHtml, /href="\/go\/"/);
    assert.doesNotMatch(staticHtml, /data-metrics-actions-url/);
    const liveContext = { ...context, siteconfig: { lang: "lv", jsonReadPrefix: "/api/" }, siteelements: { features: { liveMetricsActions: true } } };
    const dynamic = renderProperties({ url: "/event/", properties }, liveContext);
    assert.match(dynamic, /data-metrics-actions-url="\/api\/event\/"/);
    assert.match(dynamic, /Workshop/);
    assert.doesNotMatch(dynamic, /Participants|href="\/go\/"/);
    assert.match(dynamic, /Venue/);
    const empty = renderProperties({ url: "/other/" }, liveContext);
    assert.match(empty, /data-metrics-actions-url="\/api\/other\/"/);
});

test("refresh uses the latest response and ignores responses for removed regions", async (t) => {
    const pending = [];
    t.mock.method(globalThis, "fetch", url => new Promise(resolve => pending.push({ url, resolve })));
    const root = region();
    const refresh = () => root.dispatchEvent(new Event("metricsactions:refresh"));
    mountMetricsActions(root, renderMetricsActions, context);
    assert.equal(pending.length, 1);
    assert.equal(pending[0].url, "/api/blog/event/metrics-actions.json");
    assert.equal(root.innerHTML, badge);
    refresh();
    pending[1].resolve(response());
    await setImmediate();
    const valid = root.innerHTML;
    assert.match(valid, /18 \/ 30/);
    assert.ok(valid.includes(badge));
    pending[0].resolve(response({ metrics: [], actions: [] }));
    await setImmediate();
    assert.equal(root.innerHTML, valid);
    refresh();
    root.isConnected = false;
    pending[2].resolve(response({ metrics: [], actions: [] }));
    await setImmediate();
    assert.equal(root.innerHTML, valid);
});

test("failed or invalid responses retain the last valid data; empty arrays clear it", async (t) => {
    let next = response();
    t.mock.method(globalThis, "fetch", async () => next);
    const root = region();
    mountMetricsActions(root, renderMetricsActions, context);
    await setImmediate();
    const valid = root.innerHTML;
    const invalid = [
        { ok: false, status: 503 },
        response({}),
        response({ metrics: [{}], actions: [] })
    ];
    for (next of invalid) {
        root.dispatchEvent(new Event("metricsactions:refresh"));
        await setImmediate();
        assert.equal(root.innerHTML, valid);
    }
    next = response({ metrics: [], actions: [] });
    root.dispatchEvent(new Event("metricsactions:refresh"));
    await setImmediate();
    assert.equal(root.innerHTML, badge);
});

test("live rendering preserves unknown/zero/max-only/above-target values, locale, safe text and disabled actions", () => {
    const html = renderMetricsActions({ metrics: [
        { label: "Unknown", value: null }, { label: "Zero", value: 0 },
        { label: "Capacity", max: 30, progress: true },
        { label: "Above", value: 12345, max: 30, progress: true },
        { label: "Below", value: -3, max: 30, progress: true }
    ], actions: [
        { label: "<Closed>", href: "/sign/", disabled: true }
    ] }, context);
    assert.match(html, /<dt>Unknown<\/dt><dd><\/dd>/);
    assert.match(html, /<dt>Zero<\/dt><dd>0<\/dd>/);
    assert.match(html, /<dt>Capacity<\/dt><dd>30<\/dd>/);
    assert.ok(html.includes(new Intl.NumberFormat("lv").format(12345) + " / 30"));
    assert.match(html, /<progress\b[^>]*value="30"/);
    const below = html.match(/<progress\b[^>]*aria-label="Below"[^>]*>/)[0];
    assert.match(below, /\bvalue="0"/);
    assert.match(below, /\bmax="30"/);
    assert.match(html, /disabled><span>&lt;Closed&gt;<\/span>/);
    assert.doesNotMatch(html, /href=|<Closed>/);
});
