// Cache-busting hash filters (single file and directory)
import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import xxhash from "xxhash-wasm";

// persistent cache across calls
const hashes = new Map();

let hasherPromise = null;
const getHasher = async () => {
    if (!hasherPromise) hasherPromise = xxhash();
    return hasherPromise;
};

// Map /images/* paths to /content/images/* on disk
const resolvePath = (urlPath) => {
    if (urlPath.startsWith("/images")) return "/content" + urlPath;
    return urlPath;
};

// Single-file content hash for cache busting
const addHash = async (absolutePath) => {
    const cached = hashes.get(absolutePath);
    if (cached) return absolutePath + "?hash=" + cached;

    const realPath = resolvePath(absolutePath);
    const content = await readFile(join(process.cwd(), realPath), "utf8");
    const { h64 } = await getHasher();
    const hash = h64(content).toString(36);
    hashes.set(absolutePath, hash);
    return absolutePath + "?hash=" + hash;
};

// Combined hash of all files in a directory (for bundled assets)
const addDirHash = async (absolutePath) => {
    const dirKey = dirname(absolutePath);
    const cached = hashes.get(dirKey);
    if (cached) return absolutePath + "?hash=" + cached;

    const realPath = resolvePath(absolutePath);
    const realDir = dirname(join(process.cwd(), realPath));
    const entries = (await readdir(realDir, { withFileTypes: true }))
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name)
        .sort();

    const { h64 } = await getHasher();
    let combined = "";
    for (const name of entries) {
        const buf = await readFile(join(realDir, name), "utf8");
        combined += h64(buf).toString(36) + "|";
    }

    // Include config files that can affect build output
    const configPaths = [
        join(process.cwd(), "content", "_data", "siteelements.json5"),
        join(process.cwd(), "package.json")
    ];
    for (const configPath of configPaths) {
        combined += h64(await readFile(configPath, "utf8")).toString(36) + "|";
    }

    const hash = h64(combined).toString(36);
    hashes.set(dirKey, hash);
    return absolutePath + "?hash=" + hash;
};

export default (eleventyConfig) => {
    eleventyConfig.addNunjucksAsyncFilter("addHash", (absolutePath, callback) => {
        addHash(absolutePath).then((result) => callback(null, result)).catch(callback);
    });
    eleventyConfig.addNunjucksAsyncFilter("addDirHash", (absolutePath, callback) => {
        addDirHash(absolutePath).then((result) => callback(null, result)).catch(callback);
    });
};