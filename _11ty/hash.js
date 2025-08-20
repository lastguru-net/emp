import { readFileSync } from "fs";
import { createHash } from "node:crypto";

// Add custom hash for cache busting
const addHash = (absolutePath) => {
    const hashes = new Map();
    let realPath = absolutePath;
    if (absolutePath.startsWith('/images')) {
        realPath = '/content' + absolutePath;
    }
    const cached = hashes.get(absolutePath);
    if (cached) {
        return `${absolutePath}?hash=${cached}`;
    }
    const fileContent = readFileSync(`${process.cwd()}${realPath}`, {
        encoding: "utf-8"
    }).toString();
    const hash = createHash('md5').update(fileContent).digest('hex');
    hashes.set(absolutePath, hash);
    return `${absolutePath}?hash=${hash}`;
};

export default eleventyConfig => {
    eleventyConfig.addNunjucksFilter("addHash", addHash); 
};