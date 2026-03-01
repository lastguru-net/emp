// Collection building: tag pagination, author pagination, curated posts
// Based on: https://github.com/11ty/eleventy/issues/332#issuecomment-445236776

import lodash from "@11ty/lodash-custom";
import baseSlugify from "@sindresorhus/slugify";
import siteconfig from "../content/_data/siteconfig.js";

const slugify = (value) => baseSlugify(value, { preserveCharacters: ['.'] });

// True when an item is marked as hidden in front matter
export const isHidden = (item) => item?.data?.hidden === true;

// Normalise a value to an array (handles undefined, single values and arrays)
export const toArray = (value) => Array.isArray(value) ? value : (value ? [value] : []);

// Sort items newest-first, then move pinned items to the front
export const pinnedFirstNewestFirst = (items) => {
    const newestFirst = [...items].sort((a, b) => (b.date || 0) - (a.date || 0));
    const pinned = [];
    const regular = [];
    for (const it of newestFirst) (it?.data?.pinned === true ? pinned : regular).push(it);
    return pinned.length ? pinned.concat(regular) : regular;
};

// Strip HTML tags, replacing them with spaces
export const stripTags = (value = "") => String(value).replace(/<[^>]*>/g, " ");

// Collapse consecutive whitespace into a single space and trim
export const collapseWhitespace = (value = "") => String(value).replace(/\s+/g, " ").trim();

// Upper-case the first character of a string
export const capitalize = (value = "") => {
    const text = String(value);
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
};

// Ensure a link prefix ends with "/"
const normalizePrefix = (prefix, fallback = "/") => {
    const raw = prefix || fallback;
    return raw.endsWith("/") ? raw : raw + "/";
};

// --- Tag pagination ---

/* return data looks like:
    [{
        tagName: "tag1",
        pageNumber: 0,
        items: [] // array of current page items
        hrefs: [] // array of all page hrefs (in order)
        href: {
            first: "...", // link to the first page (0)
            previous: "...", // link to the previous page (0)
            next: "...", // link to the next page (1)
            last: "...", link to the last page (1)
        }
    },{
        tagName: "tag1",
        pageNumber: 1,
        items: [] // array of current page items
        hrefs: [] // array of all page hrefs (in order)
        href: {
            first: "...", // link to the first page (0)
            previous: "...", // link to the previous page (0)
            next: "...", // link to the next page (1)
            last: "...", link to the last page (1)
        }
    },{
        tagName: "tag2",
        pageNumber: 0,
        items: [] // array of current page items
        hrefs: [] // array of all page hrefs (in order)
        href: {
            first: "...", // link to the first page (0)
            previous: "...", // link to the previous page (0)
            next: "...", // link to the next page (0)
            last: "...", link to the last page (0)
        }
    }]
*/

const pageSize = siteconfig?.pagination?.postsPerPage ?? 10;
const tagLinkPrefix = normalizePrefix(siteconfig?.pagination?.tagLinkPrefix);
const authorLinkPrefix = normalizePrefix(siteconfig?.pagination?.authorLinkPrefix, "/author/");

const getTags = (item) => toArray(item?.data?.tags);

// Build paginated entries for a single group (tag or author)
const buildPages = (groupItems, groupName, linkPrefix) => {
    const slug = slugify(groupName);
    const pagedItems = lodash.chunk(groupItems, pageSize);
    const hrefs = [];
    for (let pageNumber = 0, max = pagedItems.length; pageNumber < max; pageNumber++) {
        hrefs[pageNumber] = linkPrefix + slug + "/" + (pageNumber === 0 ? "" : pageNumber + "/");
    }
    const entries = [];
    for (let pageNumber = 0, max = pagedItems.length; pageNumber < max; pageNumber++) {
        entries.push({
            tagName: groupName,
            pageNumber,
            items: pagedItems[pageNumber],
            hrefs,
            href: {
                first: hrefs[0],
                previous: pageNumber > 0 ? hrefs[pageNumber - 1] : hrefs[0],
                next: pageNumber < pagedItems.length - 1 ? hrefs[pageNumber + 1] : hrefs[pagedItems.length - 1],
                last: hrefs[pagedItems.length - 1]
            }
        });
    }
    return entries;
};

const tagPagination = (collection) => {
    // Collect unique tags (ignoring hidden items)
    const tagSet = new Set();
    collection.getAllSorted().forEach((item) => {
        if (!isHidden(item) && ("tags" in item.data)) {
            for (const tag of getTags(item)) tagSet.add(tag);
        }
    });

    // Build paginated entries per tag
    const tagMap = [];
    for (const tagName of tagSet) {
        const tagItems = pinnedFirstNewestFirst(
            collection.getFilteredByTag(tagName).filter((item) => !isHidden(item))
        );
        tagMap.push(...buildPages(tagItems, tagName, tagLinkPrefix));
    }

    return tagMap;
};

// Author pagination (same structure as tag pagination)

const authorPagination = (collection) => {
    // Collect unique authors (ignoring hidden items)
    const authorSet = new Set();
    collection.getAllSorted().forEach((item) => {
        if (!isHidden(item) && item.data.author) {
            authorSet.add(item.data.author);
        }
    });

    // Cache the full sorted collection once
    const allItems = collection.getAllSorted();

    // Build paginated entries per author
    const tagMap = [];
    for (const authorName of authorSet) {
        const tagItems = pinnedFirstNewestFirst(
            allItems.filter((item) => !isHidden(item) && item.data.author === authorName)
        );
        tagMap.push(...buildPages(tagItems, authorName, authorLinkPrefix));
    }

    return tagMap;
};

// --- Plugin registration ---

export default (eleventyConfig) => {
    eleventyConfig.addCollection("tagPagination", tagPagination);
    eleventyConfig.addCollection("authorPagination", authorPagination);

    eleventyConfig.addCollection("empPosts", (collectionApi) => {
        const items = collectionApi.getFilteredByTag("posts") || [];
        return pinnedFirstNewestFirst(items.filter((item) => !isHidden(item)));
    });

    // Slugify that preserves dots (for tag/author URLs only)
    eleventyConfig.addFilter("empSlugify", (value) => slugify(value));

};