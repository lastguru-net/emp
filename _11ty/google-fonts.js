// Inline Google Fonts CSS at build time with caching
// Supports two modes:
// - "css": fetches the @font-face CSS and inlines it (fonts still served from Google)
// - "full": fetches the CSS, downloads all font files to assets/fonts/, rewrites URLs to local paths

import { writeFile, mkdir } from "node:fs/promises";
import { join, basename } from "node:path";

const inflight = new Map();
const cssCache = new Map();
const fontCache = new Set();

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
    if (cssCache.has(url)) {
        return cssCache.get(url);
    }
    if (!inflight.has(url)) {
        const promise = (async () => {
            const css = await fetchCss(url);
            cssCache.set(url, css);
            return css;
        })();
        inflight.set(url, promise);
        promise.finally(() => inflight.delete(url));
    }
    return inflight.get(url);
};

// Download a single font file to the local fonts directory
const downloadFont = async (fontUrl, fontsDir) => {
    const urlObj = new URL(fontUrl);
    // Use the path portion as the filename (e.g. "s/montserrat/v29/abc.woff2" → "abc.woff2")
    const fileName = basename(urlObj.pathname);
    const localPath = join(fontsDir, fileName);

    if (fontCache.has(fontUrl)) {
        return fileName;
    }

    const response = await fetch(fontUrl);
    if (!response.ok) {
        throw new Error("Font download failed: HTTP " + response.status + " for " + fontUrl);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await writeFile(localPath, buffer);
    fontCache.add(fontUrl);
    console.log("[google-fonts] downloaded " + fileName);
    return fileName;
};

// Fetch CSS and download all referenced font files, rewriting URLs to local paths
const localizeCSS = async (url, fontsDir, fontsUrlPrefix) => {
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
            downloadFont(fontUrl, fontsDir).then((fileName) => fontUrls.set(fontUrl, fileName))
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

// "css" mode: inline the fetched CSS as-is
const cssShortcode = async (url) => {
    return await getCss(url);
};

// "full" mode: inline CSS with local font URLs
const fullShortcode = async (url) => {
    const fontsDir = join(process.cwd(), "_site", "assets", "fonts");
    return await localizeCSS(url, fontsDir, "/assets/fonts/");
};

export default (eleventyConfig) => {
    eleventyConfig.addAsyncShortcode("eleventyGoogleFonts", cssShortcode);
    eleventyConfig.addAsyncShortcode("eleventyGoogleFontsLocal", fullShortcode);
};