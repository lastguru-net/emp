import assert from "node:assert/strict";
import test, { before, after } from "node:test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import sharp from "sharp";
import { prepareThumbnail } from "../_11ty/post-card-image.js";

const original = process.cwd();
let fixture;
before(async () => {
    fixture = await mkdtemp(join(tmpdir(), "emp-card-image-"));
    process.chdir(fixture);
    await mkdir("content/images", { recursive: true });
});
after(async () => {
    process.chdir(original);
    if (fixture) await rm(fixture, { recursive: true, force: true });
});

const assertResponsiveUrls = (image, prefix) => {
    assert.ok(image.src.startsWith(prefix));
    assert.ok(typeof image.sizes === "string" && image.sizes.length > 0);
    for (const srcset of [image.srcset, ...image.sources.map(source => source.srcset)]) {
        assert.equal(typeof srcset, "string");
        const widths = srcset.split(",").map(candidate => {
            const [url, descriptor] = candidate.trim().split(/\s+/);
            assert.ok(url.startsWith(prefix), `${url} retains the deployment prefix`);
            assert.match(descriptor, /^[1-9]\d*w$/);
            const width = Number(descriptor.slice(0, -1));
            return width;
        });
        assert.ok(new Set(widths).size >= 2, "responsive images offer distinct width choices");
    }
};

test("prepared raster thumbnails retain responsive variants, prefixes and optional placeholders", async () => {
    await sharp({ create: { width: 320, height: 180, channels: 3, background: "#748493" } }).png().toFile("content/images/sample.png");
    const image = await prepareThumbnail("/images/sample.png", { urlFilter: url => "/blog" + url, lqip: true });
    assert.equal(image.width, 320);
    assert.equal(image.height, 180);
    assert.deepEqual(image.sources.map(source => source.type), ["image/avif", "image/webp"]);
    assertResponsiveUrls(image, "/blog/images/");
    assert.ok(Number.isSafeInteger(image.lqip));

    const withoutPlaceholder = await prepareThumbnail("/images/sample.png");
    assert.equal(withoutPlaceholder.lqip, undefined);
    assert.ok(withoutPlaceholder.src.startsWith("/images/"));
});

test("SVG thumbnails retain a usable vector fallback", async () => {
    await writeFile("content/images/sample.svg", '<svg xmlns="http://www.w3.org/2000/svg" width="37" height="19"><rect width="37" height="19" fill="red"/></svg>');
    const image = await prepareThumbnail("/images/sample.svg", { lqip: true });
    assert.match(image.src, /^\/images\/.*\.svg$/);
    assert.equal(image.width, 37);
    assert.equal(image.height, 19);
});
