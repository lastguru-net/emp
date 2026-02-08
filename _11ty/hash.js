import { readFileSync, readdirSync } from "fs";
import { dirname, join } from "path";
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

const addDirHash = async (absolutePath) => {
	let realPath = absolutePath;
	if (absolutePath.startsWith('/images')) {
		realPath = '/content' + absolutePath;
	}
	const dirKey = dirname(absolutePath);
	const cached = hashes.get(dirKey);
	if (cached) {
		return `${absolutePath}?hash=${cached}`;
	}

	const realDir = dirname(`${process.cwd()}${realPath}`);
	const entries = readdirSync(realDir, { withFileTypes: true })
		.filter(d => d.isFile())
		.map(d => d.name)
		.sort();

	const { h64 } = await getHasher();
	let combined = '';
	for (const name of entries) {
		const buf = readFileSync(join(realDir, name), { encoding: 'utf-8' });
		combined += h64(buf).toString(36) + '|';
	}
	// include siteelements.json5 just in case, as the configuration there can affect the output
	const siteElementsBuf = readFileSync(
		join(process.cwd(), 'content', '_data', 'siteelements.json5'),
		{ encoding: 'utf-8' }
	);
	combined += h64(siteElementsBuf).toString(36) + '|';

	// include package.json as dependency changes can affect the output
	const packageJsonBuf = readFileSync(
		join(process.cwd(), 'package.json'),
		{ encoding: 'utf-8' }
	);
	combined += h64(packageJsonBuf).toString(36) + '|';

	const hashBase36 = h64(combined).toString(36);
	hashes.set(dirKey, hashBase36);
	return `${absolutePath}?hash=${hashBase36}`;
};

export default eleventyConfig => {
	eleventyConfig.addNunjucksAsyncFilter("addHash", (absolutePath, callback) => {
		addHash(absolutePath)
			.then(result => callback(null, result))
			.catch(callback);
	});
	eleventyConfig.addNunjucksAsyncFilter("addDirHash", (absolutePath, callback) => {
		addDirHash(absolutePath)
			.then(result => callback(null, result))
			.catch(callback);
	});
};