import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import imageTransform from "../_11ty/image-transform.js";

test("optimized images copy into Eleventy's resolved output without replacing original images", async (t) => {
    const original = process.cwd();
    const fixture = await mkdtemp(join(tmpdir(), "emp-image-output-"));
    t.after(async () => { process.chdir(original); await rm(fixture, { recursive: true, force: true }); });
    process.chdir(fixture);
    await mkdir(".cache/images", { recursive: true });
    await writeFile(".cache/images/optimized.webp", "optimized bytes");
    let afterBuild;
    imageTransform({
        pathPrefix: "/blog/", addPlugin() {}, addShortcode() {},
        on(name, callback) { if (name === "eleventy.after") afterBuild = callback; }
    });
    for (const output of ["_site", join(fixture, "custom-output")]) {
        await mkdir(join(output, "images"), { recursive: true });
        await writeFile(join(output, "images/original.png"), "original bytes");
        await afterBuild({ directories: { output } });
        assert.equal(await readFile(join(output, "images/optimized.webp"), "utf8"), "optimized bytes");
        assert.equal(await readFile(join(output, "images/original.png"), "utf8"), "original bytes");
    }
});
