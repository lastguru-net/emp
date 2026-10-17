// Image optimization pipeline and manual transform shortcode
import path from "node:path";
import { cp } from "node:fs/promises";
import Image, { eleventyImageTransformPlugin } from "@11ty/eleventy-img";

const outputDir = ".cache/images/";
export const urlPath = "/images/";

const filenameFormat = (id, src, width, format) => {
    const name = path.basename(src, path.extname(src));
    return name + "-" + id + "-" + width + "w." + format;
};

// Shared sharp encoding options
const sharpOptions = {
    sharpJpegOptions: {
        quality: 82,
        mozjpeg: true
    },
    sharpPngOptions: {
        compressionLevel: 7,
        adaptiveFiltering: true
    },
    sharpWebpOptions: {
        quality: 80,
        alphaQuality: 90,
        effort: 5,
        smartSubsample: true
    },
    sharpAvifOptions: {
        quality: 50,
        effort: 4
    }
};

// Plugin options for the automatic image transform pipeline
const pluginOptions = {
    extensions: "html",
    outputDir,
    urlPath,
    filenameFormat,
    formats: ["avif", "webp", "auto"],
    svgShortCircuit: true,
    widths: [2560, 1920, 1600, 1280, 960, 640, "auto"],

    // optional, attributes assigned on <img> override these values.
    defaultAttributes: {
        loading: "lazy",
        decoding: "async",
        sizes: "100vw"
    },
    ...sharpOptions
};

const resolveImageSource = (src) => {
    const value = String(src || "");
    if (/^https?:\/\//i.test(value)) return value;
    return path.join("content", value.replace(/^\/+/, ""));
};

export const generateImageMetadata = async (src, options = {}) => Image(resolveImageSource(src), {
    outputDir,
    urlPath,
    filenameFormat,
    ...sharpOptions,
    ...options
});

// Manual image transform shortcode (used in feeds and meta tags)
const imageTransform = async (src, width, format) => {
    const metadata = await generateImageMetadata(src, {
        formats: [format],
        widths: [width]
    });
    return metadata[format][0].url;
};

export default (eleventyConfig) => {
    eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
        ...pluginOptions,
        urlPath: path.posix.join(eleventyConfig.pathPrefix, urlPath)
    });
    eleventyConfig.addShortcode("imageTransform", async (...args) =>
        eleventyConfig.getFilter("url")(await imageTransform(...args)));
    eleventyConfig.addShortcode("imageTransformAbsoluteUrl", async (...args) =>
        eleventyConfig.getFilter("absoluteUrl")(await imageTransform(...args)));

    // Copy optimized images to the public folder after build
    eleventyConfig.on("eleventy.after", ({ directories }) =>
        cp(outputDir, path.join(directories.output, "images"), { recursive: true }));
};