import { generateObject } from "@11ty/eleventy-img";
import { generateImageMetadata, urlPath } from "./image-transform.js";
import { calculateLqip } from "./lqip.js";

// Eleventy Image owns fallback selection, dimensions and responsive source attributes.
// This adapter prepares variants, applies URL prefixes and adds optional LQIP data to the card's image fields.
export const prepareThumbnail = async (src, { urlFilter = (url) => url, lqip = false } = {}) => {
    const metadata = await generateImageMetadata(src, {
        formats: ["avif", "webp", "auto"],
        widths: [160, 320, 480, 640, 960, 1280],
        svgShortCircuit: true,
        urlPath: urlFilter(urlPath)
    });
    const object = generateObject(metadata, { alt: "", sizes: "(max-width: 640px) 100vw, 480px" });
    const nodes = object.picture?.["@children"] || [object];
    const { alt, ...image } = nodes.find((node) => node.img).img;
    const sources = nodes.filter((node) => node.source).map((node) => node.source);
    const placeholder = lqip && !/^https?:/i.test(src) && !/\.svg$/i.test(src) ? await calculateLqip(src) : null;
    return { ...image, sources, ...(placeholder !== null ? { lqip: Number(placeholder) } : {}) };
};
