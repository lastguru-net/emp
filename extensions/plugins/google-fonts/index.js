import { writeFile, mkdir } from "node:fs/promises";
import { resolve, basename } from "node:path";
import markdownIt from "markdown-it";

const { escapeHtml } = markdownIt().utils;
const cssCache = new Map();
const fontCache = new Map();
let fontsDir;
let fontsUrlPrefix;
let localCss;

const getUrl = (config) =>
    `https://fonts.googleapis.com/css2?family=${config.body.family}:ital,wght@${config.body.weights}&family=${config.header.family}:ital,wght@${config.header.weights}${config.swap ? "&display=swap" : ""}`;

const fetchCss = async (url) => {
    const response = await fetch(url, {
        headers: {
            Accept: "text/css,*/*;q=0.1",
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
        }
    });
    if (!response.ok) {
        throw new Error("HTTP " + response.status + " " + response.statusText);
    }
    const css = await response.text();
    console.log("[google-fonts] fetched " + url);
    return css;
};

const getCss = async (url) => {
    if (!cssCache.has(url)) {
        cssCache.set(url, fetchCss(url).catch((error) => {
            cssCache.delete(url);
            throw error;
        }));
    }
    return cssCache.get(url);
};

// Keep downloaded bytes across builds, but write them to each build's output.
const downloadFont = async (fontUrl) => {
    if (!fontCache.has(fontUrl)) {
        fontCache.set(fontUrl, (async () => {
            const response = await fetch(fontUrl);
            if (!response.ok) {
                throw new Error("Font download failed: HTTP " + response.status + " for " + fontUrl);
            }

            const buffer = Buffer.from(await response.arrayBuffer());
            console.log("[google-fonts] downloaded " + basename(new URL(fontUrl).pathname));
            return buffer;
        })().catch((error) => {
            fontCache.delete(fontUrl);
            throw error;
        }));
    }
    return fontCache.get(fontUrl);
};

// Fetch CSS and download all referenced font files, rewriting URLs to local paths
const localizeCss = async (url, fontsDir, fontsUrlPrefix) => {
    const css = await getCss(url);
    await mkdir(fontsDir, { recursive: true });

    // Find all url() references in the CSS
    const fontUrls = new Map();
    const urlPattern = /url\(([^)]+)\)/g;
    let match;
    while ((match = urlPattern.exec(css)) !== null) {
        const fontUrl = match[1].replace(/['"]/g, "");
        if (fontUrl.startsWith("http")) {
            fontUrls.set(fontUrl, null);
        }
    }

    // Download all fonts in parallel
    const downloads = [];
    for (const fontUrl of fontUrls.keys()) {
        downloads.push(
            downloadFont(fontUrl).then(async (buffer) => {
                const fileName = basename(new URL(fontUrl).pathname);
                await writeFile(resolve(fontsDir, fileName), buffer);
                fontUrls.set(fontUrl, fileName);
            })
        );
    }
    await Promise.all(downloads);

    // Rewrite URLs to local paths
    let localCss = css;
    for (const [fontUrl, fileName] of fontUrls) {
        localCss = localCss.replaceAll(fontUrl, fontsUrlPrefix + fileName);
    }
    return localCss;
};

export default {
    setup(eleventyConfig) {
        eleventyConfig.on("eleventy.before", ({ directories }) => {
            fontsDir = resolve(directories.output, "assets", "fonts");
            fontsUrlPrefix = eleventyConfig.getFilter("url")("/assets/fonts/");
            localCss = null;
        });
    },
    head(config) {
        if (config.local === "css") return '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>';
        if (config.local !== "none") return "";
        const url = escapeHtml(getUrl(config));
        return `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" href="${url}" as="style">
<link rel="stylesheet" href="${url}">`;
    },
    css(config) {
        if (config.local === "css") return getCss(getUrl(config));
        if (config.local !== "full") return "";
        // Hashing and stylesheet rendering share the same completed font writes.
        if (!localCss) {
            localCss = localizeCss(getUrl(config), fontsDir, fontsUrlPrefix).catch((error) => {
                localCss = null;
                throw error;
            });
        }
        return localCss;
    },
};