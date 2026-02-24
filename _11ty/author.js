// Double-paginated author collection (same structure as tag.js)
// Based on: https://github.com/11ty/eleventy/issues/332#issuecomment-445236776

import lodash from "@11ty/lodash-custom";
import slugify from "@sindresorhus/slugify";
import siteconfig from "../content/_data/siteconfig.js";

// Collection properties
const pageSize = siteconfig?.pagination?.postsPerPage ?? 10;

// Permalink prefix for forming URLs (configured)
const rawPrefix = siteconfig?.pagination?.authorLinkPrefix ?? "/author/";
const linkPrefix = rawPrefix.endsWith("/") ? rawPrefix : rawPrefix + "/";

const isHidden = (item) => item?.data?.hidden === true;

const pinnedFirstNewestFirst = (items) => {
    const newestFirst = [...items].sort((a, b) => (b.date || 0) - (a.date || 0));
    const pinned = [];
    const regular = [];
    for (const it of newestFirst) (it?.data?.pinned === true ? pinned : regular).push(it);
    return pinned.length ? pinned.concat(regular) : regular;
};

const authorPagination = (collection) => {
    // Collect unique authors (ignoring hidden items)
    const tagSet = new Set();
    collection.getAllSorted().forEach((item) => {
        if (!isHidden(item) && item.data.author) {
            tagSet.add(item.data.author);
        }
    });

    // Cache the full sorted collection once (we'll sort per-author explicitly below)
    const allItems = collection.getAllSorted();

    // Build paginated entries per author
    const tagMap = [];
    const tagArray = [...tagSet];
    for (const tagName of tagArray) {
        let tagItems = allItems.filter((item) => {
            return !isHidden(item) && item.data.author && item.data.author === tagName;
        });

        // newest-first + pinned-first
        tagItems = pinnedFirstNewestFirst(tagItems);

        const pagedItems = lodash.chunk(tagItems, pageSize);
        const hrefs = [];
        for (let pageNumber = 0, max = pagedItems.length; pageNumber < max; pageNumber++) {
            hrefs[pageNumber] = linkPrefix + slugify(tagName) + "/" + (pageNumber === 0 ? "" : pageNumber + "/");
        }
        for (let pageNumber = 0, max = pagedItems.length; pageNumber < max; pageNumber++) {
            tagMap.push({
                tagName,
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
    }

    return tagMap;
};

export default (eleventyConfig) => {
    eleventyConfig.addCollection("authorPagination", authorPagination);
};