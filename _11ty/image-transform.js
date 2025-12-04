import path from "node:path";
import fs from "node:fs";
import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";
import Image from "@11ty/eleventy-img";

const imageTransformParams = {
    // which file extensions to process
    extensions: "html",

    // filename configuration
    outputDir: ".cache/images/",
    urlPath: "/images/",
    filenameFormat: function (id, src, width, format, options) {
        const extension = path.extname(src);
        const name = path.basename(src, extension);

        return `${name}-${id}-${width}w.${format}`;
    },

    // optional, output image formats
    formats: ["avif", "webp", "auto"],
    svgShortCircuit: true,
    // formats: ["auto"],

    // optional, output image widths
    widths: [2560, 1920, 1600, 1280, 960, 640, "auto"],

    // optional, attributes assigned on <img> override these values.
    defaultAttributes: {
        loading: "lazy",
        decoding: "async",
        sizes: "100vw",
    },

    // sharp options
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
    },
};

const imageTransform = async (src, width, format) => {
    const options = {
        outputDir: ".cache/images/",
        urlPath: "/images/",
        filenameFormat: function (id, src, width, format, options) {
            const extension = path.extname(src);
            const name = path.basename(src, extension);

            return `${name}-${id}-${width}w.${format}`;
        },
        formats: [format],
        widths: [width],
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
        },
    };

    const metadata = await Image(path.join("content", src), options);
    return metadata[format][0].url;
};

export default eleventyConfig => {
    eleventyConfig.addPlugin(eleventyImageTransformPlugin, imageTransformParams);

    eleventyConfig.addShortcode("imageTransform", imageTransform);
    
    // Copy the optimized images to the public folder after build
    eleventyConfig.on("eleventy.after", () => {
		fs.cpSync(".cache/images/", "_site/images/", {
			recursive: true
		});
	});
};