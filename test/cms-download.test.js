import assert from "node:assert/strict";
import test from "node:test";
import { downloadCms } from "../extensions/plugins/sveltia-cms/build.js";

const payload = Buffer.from("export default { init() {} };");

test("CMS download uses latest by default and preserves the distribution bytes", async t => {
    t.mock.method(globalThis, "fetch", async (url, options) => {
        assert.equal(url, "https://unpkg.com/@sveltia/cms@latest/dist/sveltia-cms.mjs");
        assert(options.signal instanceof AbortSignal);
        return new Response(payload);
    });
    assert.deepEqual((await downloadCms()).contents, payload);
});

test("CMS cache revision follows downloaded content, not the requested version", async t => {
    let body = payload;
    t.mock.method(globalThis, "fetch", async () => new Response(body));
    const first = await downloadCms();
    assert.equal((await downloadCms("0.250.1")).revision, first.revision, "identical bytes can reuse the same asset URL");
    body = Buffer.from("export default { init() {}, updated: true };");
    assert.notEqual((await downloadCms()).revision, first.revision, "a changed latest release gets a new asset URL");
});

test("CMS download rejects an HTTP error instead of serving its body as JavaScript", async t => {
    t.mock.method(globalThis, "fetch", async () => new Response(payload, { status: 503 }));
    await assert.rejects(downloadCms(), /HTTP 503/);
});

test("CMS download propagates network failures", async t => {
    t.mock.method(globalThis, "fetch", async () => { throw new Error("Network unavailable"); });
    await assert.rejects(downloadCms(), /Network unavailable/);
});
