// Transform to add Lean Rada CSS-only LQIP placeholders to images
// More info: https://leanrada.com/notes/css-only-lqip/
// Adapted from: https://github.com/Kalabasa/leanrada.com/blob/src/main/scripts/update/lqip/lqip.mjs
// and https://github.com/Virtuouz/SiteStitcher/blob/main/utils/lqip.js
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import JSON5 from "json5";

let siteelementsCache = null;
const loadSiteelements = () => {
    if (siteelementsCache) return siteelementsCache;
    const raw = fs.readFileSync("content/_data/siteelements.json5", "utf8");
    siteelementsCache = JSON5.parse(raw);
    return siteelementsCache;
};

// recursive DOM walker to collect image nodes
const collectImages = (nodes, out) => {
    if (!nodes) return;
    for (const node of Array.isArray(nodes) ? nodes : [nodes]) {
        if (!node) continue;
        if (node.type === "tag" && node.name === "img") out.push(node);
        if (node.children && node.children.length) collectImages(node.children, out);
    }
};

const isSkippable = (node) => {
    const src = node.attrs.src;
    const cls = node.attrs.class || "";
    if (!src || cls.split(/\s+/).includes("nolqip")) return true;
    if (src.startsWith("http")) return true;
    const ext = path.extname(src).toLowerCase();
    return ext === ".svg";
};

const clamp = (value, min, max) => {
  return Math.min(max, Math.max(min, value));
}

const gamma_inv = (x) => {
  return x >= 0.04045 ? Math.pow((x + 0.055) / 1.055, 2.4) : x / 12.92;
}

const rgbToOkLab = (rgb) => {
    const r = gamma_inv(rgb.r / 255);
    const g = gamma_inv(rgb.g / 255);
    const b = gamma_inv(rgb.b / 255);

    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

    return {
        L: l * +0.2104542553 + m * +0.793617785 + s * -0.0040720468,
        a: l * +1.9779984951 + m * -2.428592205 + s * +0.4505937099,
        b: l * +0.0259040371 + m * +0.7827717662 + s * -0.808675766
    };
}

// Scales a or b of Oklab to move away from the center
// so that euclidean comparison won't be biased to the center
const scaleComponentForDiff = (x, chroma) => {
    return x / (1e-6 + Math.pow(chroma, 0.5));
}

// find the best bit configuration that would produce a color closest to target
const findOklabBits = (targetL, targetA, targetB) => {
    const targetChroma = Math.hypot(targetA, targetB);
    const scaledTargetA = scaleComponentForDiff(targetA, targetChroma);
    const scaledTargetB = scaleComponentForDiff(targetB, targetChroma);

    let bestBits = [0, 0, 0];
    let bestDifference = Infinity;

    for (let lli = 0; lli <= 0b11; lli++) {
        for (let aaai = 0; aaai <= 0b111; aaai++) {
            for (let bbbi = 0; bbbi <= 0b111; bbbi++) {
                const { L, a, b } = bitsToLab(lli, aaai, bbbi);

                // gray is a common average colour and i don't like that
                const grayPenalty = aaai === 4 && bbbi === 3 ? 0.04 : 0;

                const chroma = Math.hypot(a, b);
                const scaledA = scaleComponentForDiff(a, chroma);
                const scaledB = scaleComponentForDiff(b, chroma);

                const difference =
                    grayPenalty +
                    Math.hypot(
                        L - targetL,
                        scaledA - scaledTargetA,
                        scaledB - scaledTargetB
                    );

                if (difference < bestDifference) {
                    bestDifference = difference;
                    bestBits = [lli, aaai, bbbi];
                }
            }
        }
    }

    return { ll: bestBits[0], aaa: bestBits[1], bbb: bestBits[2] };
}

const bitsToLab = (ll, aaa, bbb) => {
    const L = (ll / 0b11) * 0.6 + 0.2;
    const a = (aaa / 0b1000) * 0.7 - 0.35;
    const b = ((bbb + 1) / 0b1000) * 0.7 - 0.35;
    return { L, a, b };
}

const imgCache = new Map();
const calculateLqip = async (src) => {
    if (imgCache.has(src)) return imgCache.get(src);
    const filePath = path.join(process.cwd(), "content", src);
    if (!filePath || !fs.existsSync(filePath)) {
        imgCache.set(src, null);
        return null;
    }

    const stats = await sharp(filePath).stats();
    const dominantColor = [
        Math.round(stats.dominant.r),
        Math.round(stats.dominant.g),
        Math.round(stats.dominant.b),
    ];

    const buf = await sharp(filePath)
        .gamma(2)
        .resize(3, 2, { fit: "fill" })
        .sharpen({ sigma: 0.5 })
        .removeAlpha()
        .toFormat("raw", { bitdepth: 8 })
        .toBuffer();
    
    const {
        L: rawBaseL,
        a: rawBaseA,
        b: rawBaseB,
    } = rgbToOkLab({
        r: dominantColor[0],
        g: dominantColor[1],
        b: dominantColor[2],
    });
    const { ll, aaa, bbb } = findOklabBits(rawBaseL, rawBaseA, rawBaseB);
    const { L: baseL, a: baseA, b: baseB } = bitsToLab(ll, aaa, bbb);

    const cells = Array.from({ length: 6 }, (_, index) => {
        const r = buf.readUint8(index * 3);
        const g = buf.readUint8(index * 3 + 1);
        const b = buf.readUint8(index * 3 + 2);
        return rgbToOkLab({ r, g, b });
    });

    const values = cells.map(({ L }) => clamp(0.5 + L - baseL, 0, 1));
    const ca = Math.round(values[0] * 0b11);
    const cb = Math.round(values[1] * 0b11);
    const cc = Math.round(values[2] * 0b11);
    const cd = Math.round(values[3] * 0b11);
    const ce = Math.round(values[4] * 0b11);
    const cf = Math.round(values[5] * 0b11);
    const lqip =
        -(2 ** 19) +
        ((ca & 0b11) << 18) +
        ((cb & 0b11) << 16) +
        ((cc & 0b11) << 14) +
        ((cd & 0b11) << 12) +
        ((ce & 0b11) << 10) +
        ((cf & 0b11) << 8) +
        ((ll & 0b11) << 6) +
        ((aaa & 0b111) << 3) +
        (bbb & 0b111);

    const result = lqip.toFixed(0);
    imgCache.set(src, result);
    return result;
};

const addClassOnce = (existing, cls) => {
    const parts = (existing || "").split(/\s+/).filter(Boolean);
    if (!parts.includes(cls)) parts.push(cls);
    return parts.join(" ");
};

const applyLqip = () => {
    return async (tree) => {
        const siteelements = loadSiteelements();
        if (!siteelements?.features?.lqip) return tree;

        const transformTag = async (node) => {
            const lqip = await calculateLqip(node.attrs.src);
            if (lqip) {
                node.attrs.class = addClassOnce(node.attrs.class, "lqip");

                const style = node.attrs.style || "";
                const sep = style && !style.trim().endsWith(";") ? ";" : "";
                node.attrs.style = style + sep + "--lqip:" + lqip + ";";
            }
        };

        const promises = [];
        tree.match({ tag: "img" }, (node) => {
            node.attrs = node.attrs || {};
            if (isSkippable(node)) return node;

            promises.push(transformTag(node));
            return node;
        });

        await Promise.all(promises);
        return tree;
    };
};

export default (eleventyConfig) => {
    // Runs in Eleventy's HTML pipeline (before writing the final .html files)
    eleventyConfig.htmlTransformer.addPosthtmlPlugin("html", applyLqip);
};