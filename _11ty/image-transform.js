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
    widths: [1280, 960, 640, 320, "auto"],

    // optional, attributes assigned on <img> override these values.
    defaultAttributes: {
        loading: "lazy",
        decoding: "async",
        sizes: "auto",
    }
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
        widths: [width]
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