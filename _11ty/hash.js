import { readFileSync } from "fs";
import xxhash from "xxhash-wasm";

// persistent cache across calls
const hashes = new Map();

let hasherPromise = null;
const getHasher = async () => {
	if (!hasherPromise) {
		hasherPromise = xxhash();
	}
	return hasherPromise;
};

// Add custom hash for cache busting
const addHash = async (absolutePath) => {
	let realPath = absolutePath;
	if (absolutePath.startsWith('/images')) {
		realPath = '/content' + absolutePath;
	}
	const cached = hashes.get(absolutePath);
	if (cached) {
		return `${absolutePath}?hash=${cached}`;
	}
	const fileBuffer = readFileSync(`${process.cwd()}${realPath}`, {encoding: 'utf-8'});
	const { h64 } = await getHasher();
	const hashBigInt = h64(fileBuffer);
	const hashBase36 = hashBigInt.toString(36);
	hashes.set(absolutePath, hashBase36);
	return `${absolutePath}?hash=${hashBase36}`;
};

export default eleventyConfig => {
	eleventyConfig.addNunjucksAsyncFilter("addHash", (absolutePath, callback) => {
		addHash(absolutePath)
			.then(result => callback(null, result))
			.catch(callback);
	});
};