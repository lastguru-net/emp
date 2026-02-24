// persistent cache across calls
const inflight = new Map();
const cssCache = new Map();

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

const renderStyle = (css, url) => {
    const safeUrl = url.replace(/"/g, "&quot;");
    return '<style data-href="' + safeUrl + '">\n' + css + "\n</style>";
};

const shortcode = async (url) => {
    try {
        const css = await getCss(url);
        return css; // if css should be rendered directly in HTML, use renderStyle(css, url);
    } catch (error) {
        console.warn('[google-fonts] Failed to inline "' + url + '": ' + error.message);
        return '<link rel="stylesheet" href="' + url + '">';
    }
};

export default (eleventyConfig) => {
    eleventyConfig.addAsyncShortcode("eleventyGoogleFonts", shortcode);
};