// Cache-busting hash filters (single file and directory)
import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import xxhash from "xxhash-wasm";
import siteconfig from "../content/_data/siteconfig.js";
import { renderAuthenticationMethod } from "./authentication.js";
import { renderPlugins } from "./plugins.js";

// Cache pending and completed computations across calls.
const hashes = new Map();
const getHash = (key, calculate) => {
    if (!hashes.has(key)) {
        hashes.set(key, calculate().catch((error) => {
            hashes.delete(key);
            throw error;
        }));
    }
    return hashes.get(key);
};

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
const calculateHash = async (absolutePath) => {
    const realPath = resolvePath(absolutePath);
    const content = await readFile(join(process.cwd(), realPath), "utf8");
    const { h64 } = await getHasher();
    return h64(content).toString(36);
};

// Hash asset sources and the configuration/templates used to build each bundle.
const calculateDirHash = async (absolutePath) => {
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
    if (absolutePath.startsWith("/assets/js/")) {
        configPaths.push(
            join(process.cwd(), "content", "_data", "siteconfig.js"),
            join(process.cwd(), "content", "_data", "inlinesvg.json5"),
            join(process.cwd(), "content", "utils", "js.njk")
        );
    } else if (absolutePath.startsWith("/assets/css/")) {
        // Match the Nunjucks sources scanned by the Tailwind transform.
        const templates = await readdir(join(process.cwd(), "content"), { recursive: true, withFileTypes: true });
        configPaths.push(...templates
            .filter((entry) => entry.isFile() && entry.name.endsWith(".njk"))
            .map((entry) => join(entry.parentPath, entry.name))
            .sort());
    }
    for (const configPath of configPaths) {
        combined += h64(await readFile(configPath, "utf8")).toString(36) + "|";
    }

    // The generated JavaScript bundle also includes the selected auth method.
    if (absolutePath.startsWith("/assets/js/")) {
        combined += h64(await renderAuthenticationMethod(siteconfig.authentication, siteconfig.url)).toString(36) + "|";
    } else if (absolutePath.startsWith("/assets/css/")) {
        combined += h64(await renderPlugins("css")).toString(36) + "|";
    }

    return h64(combined).toString(36);
};

const addHash = async (absolutePath) =>
    absolutePath + "?hash=" + await getHash(absolutePath, () => calculateHash(absolutePath));
const addDirHash = async (absolutePath) =>
    absolutePath + "?hash=" + await getHash(dirname(absolutePath), () => calculateDirHash(absolutePath));

export default (eleventyConfig) => {
    eleventyConfig.on("eleventy.before", () => hashes.clear());
    eleventyConfig.addNunjucksAsyncFilter("addHash", (absolutePath, callback) => {
        addHash(absolutePath).then((result) => callback(null, result)).catch(callback);
    });
    eleventyConfig.addNunjucksAsyncFilter("addDirHash", (absolutePath, callback) => {
        addDirHash(absolutePath).then((result) => callback(null, result)).catch(callback);
    });
};