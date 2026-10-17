// Collection building: tag pagination, author pagination, curated posts
// Based on: https://github.com/11ty/eleventy/issues/332#issuecomment-445236776

import lodash from "@11ty/lodash-custom";
import siteconfig from "../content/_data/siteconfig.js";
import { toArray, empSlugify } from "./filters.js";

// True when an item is marked as hidden in front matter
export const isHidden = (item) => item?.data?.hidden === true;

// Sort items newest-first, then move pinned items to the front
export const pinnedFirstNewestFirst = (items) => {
    const newestFirst = [...items].sort((a, b) => (b.date || 0) - (a.date || 0));
    const pinned = [];
    const regular = [];
    for (const it of newestFirst) (it?.data?.pinned === true ? pinned : regular).push(it);
    return pinned.length ? pinned.concat(regular) : regular;
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
        items: [], // array of current page items
        hrefs: [], // array of all page hrefs (in order)
        href: {
            first: "...", // link to the first page (0)
            previous: "...", // link to the previous page (0)
            next: "...", // link to the next page (1)
            last: "...", // link to the last page (1)
        }
    },{
        tagName: "tag1",
        pageNumber: 1,
        items: [], // array of current page items
        hrefs: [], // array of all page hrefs (in order)
        href: {
            first: "...", // link to the first page (0)
            previous: "...", // link to the previous page (0)
            next: "...", // link to the next page (1)
            last: "...", // link to the last page (1)
        }
    },{
        tagName: "tag2",
        pageNumber: 0,
        items: [], // array of current page items
        hrefs: [], // array of all page hrefs (in order)
        href: {
            first: "...", // link to the first page (0)
            previous: "...", // link to the previous page (0)
            next: "...", // link to the next page (0)
            last: "...", // link to the last page (0)
        }
    }]
*/

const pageSize = siteconfig?.pagination?.postsPerPage ?? 10;
const tagLinkPrefix = normalizePrefix(siteconfig?.pagination?.tagLinkPrefix);
const authorLinkPrefix = normalizePrefix(siteconfig?.pagination?.authorLinkPrefix, "/author/");

const getTags = (item) => toArray(item?.data?.tags);

// Build paginated entries for a single group (tag or author)
const buildPages = (groupItems, groupName, linkPrefix) => {
    const slug = empSlugify(groupName);
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
    const authors = Map.groupBy(
        collection.getAllSorted().filter(item => !isHidden(item) && item.data.author),
        item => item.data.author
    );
    return [...authors].flatMap(([author, items]) =>
        buildPages(pinnedFirstNewestFirst(items), author, authorLinkPrefix));
};

// --- Plugin registration ---

export default (eleventyConfig) => {
    eleventyConfig.addCollection("tagPagination", tagPagination);
    eleventyConfig.addCollection("authorPagination", authorPagination);

    eleventyConfig.addCollection("empPosts", (collectionApi) => {
        const items = collectionApi.getFilteredByTag("posts") || [];
        return pinnedFirstNewestFirst(items.filter((item) => !isHidden(item)));
    });
};