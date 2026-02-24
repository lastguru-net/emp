// Cached JSON5 config loader for content/_data files
import { readFile } from "node:fs/promises";
import path from "node:path";
import JSON5 from "json5";

const cache = new Map();

export const loadConfig = async (name) => {
    if (cache.has(name)) return cache.get(name);
    const filePath = path.join(process.cwd(), "content", "_data", name + ".json5");
    const data = JSON5.parse(await readFile(filePath, "utf8"));
    cache.set(name, data);
    return data;
};