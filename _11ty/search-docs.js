import { readFileSync } from "node:fs";
import path from "node:path";
import JSON5 from "json5";
import MiniSearch from "minisearch";
import siteconfig from "../content/_data/siteconfig.js";
import { extractExcerpt } from "./excerpt.js";

const stripTags = (value = "") => String(value).replace(/<[^>]*>/g, " ");
const collapseWhitespace = (value = "") => String(value).replace(/\s+/g, " ").trim();
const toArray = (value) => Array.isArray(value) ? value : (value ? [value] : []);
const stripFrontMatter = (value = "") => String(value).replace(/^---\s*[\r\n]+[\s\S]*?[\r\n]+---\s*[\r\n]*/, "");
const capitalize = (value = "") => {
	const text = String(value);
	return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
};
const stripMarkdown = (value = "") => String(value)
	.replace(/^```[\w-]*\s*$/gm, "")
	.replace(/^~~~[\w-]*\s*$/gm, "")
	.replace(/`([^`]*)`/g, "$1")
	.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
	.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
	.replace(/^\s{0,3}#{1,6}\s+/gm, "")
	.replace(/(\*\*|__)(.*?)\1/g, "$2")
	.replace(/(\*|_)(.*?)\1/g, "$2")
	.replace(/==(.*?)==/g, "$1")
	.replace(/~~(.*?)~~/g, "$1")
	.replace(/^\s{0,3}>\s?/gm, "")
	.replace(/^\s{0,3}([-*+]|\d+\.)\s+/gm, "");

const loadJson5 = (relativePath) => {
	const fullPath = path.join(process.cwd(), relativePath);
	return JSON5.parse(readFileSync(fullPath, "utf8"));
};

const baseOptions = {
	idField: "id",
	fields: ["title", "excerpt", "content", "tags"],
	storeFields: ["id", "url", "title", "excerpt", "tags", "date"]
};

export default function searchDocs(eleventyConfig) {
	const sitetags = loadJson5("content/_data/sitetags.json5") || {};
	const sitestrings = loadJson5("content/_data/sitestrings.json5") || {};

	eleventyConfig.addCollection("searchDocs", (collectionApi) => {
		const all = collectionApi.getAll() || [];

		const docs = all
			.filter((item) => {
				if (!item || item.data?.hidden === true) return false;
				const tags = toArray(item.data?.tags);
				return tags.includes("posts") || tags.includes("pages");
			})
			.map((item) => {
				const localizedStrings = sitestrings[siteconfig.lang];
				const tags = toArray(item.data?.tags)
					.filter((tag) => !sitetags.notag.includes(tag))
					.map((tag) => capitalize(localizedStrings[tag] || tag));
				const url = item.url;
				const title = item.data.title;
				const sourceContent = stripFrontMatter(item.rawInput).trim();
				const excerpt = item.data.excerpt || extractExcerpt(stripMarkdown(sourceContent), 250);
				const content = collapseWhitespace(stripMarkdown(stripTags(sourceContent)));
				const date = item.date instanceof Date ? item.date.toISOString() : item.date;

				return {
					id: url,
					url,
					title,
					excerpt,
					content,
					tags,
					date
				};
			})
			.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

		return docs;
	});

	eleventyConfig.addNunjucksFilter("buildMiniSearchPayload", (docs) => {
		const documents = Array.isArray(docs) ? docs : [];
		const miniSearch = new MiniSearch(baseOptions);
		miniSearch.addAll(documents);

		return JSON.stringify({
			options: baseOptions,
			searchOptions: {
				prefix: true,
				fuzzy: 0.2
			},
			index: miniSearch.toJSON()
		});
	});
}