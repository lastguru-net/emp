// Custom collection for double pagination
// Makes an author collection that is paginated like with tags
// Based on the solution suggested here: https://github.com/11ty/eleventy/issues/332#issuecomment-445236776
// A version of tag.js from this repository

import lodash from "@11ty/lodash-custom";
import slugify from "@sindresorhus/slugify";
import siteconfig from "../content/_data/siteconfig.js";

// Collection properties
const pageSize = siteconfig?.pagination?.postsPerPage ?? 10;

// Permalink prefix for forming URLs (configured)
const rawPrefix = siteconfig?.pagination?.authorLinkPrefix ?? "/author/";
const linkPrefix = rawPrefix.endsWith("/") ? rawPrefix : (rawPrefix + "/");

const isHidden = (item) => item?.data?.hidden === true;
const pinnedFirstNewestFirst = (items) => {
	const newestFirst = [...items].sort((a, b) => (b.date || 0) - (a.date || 0));
	const pinned = [];
	const regular = [];
	for (const it of newestFirst) ((it?.data?.pinned === true) ? pinned : regular).push(it);
	return pinned.length ? pinned.concat(regular) : regular;
};

const authorPagination = (collection) => {
    // Get unique list of authors as tags (ignore hidden items)
    let tagSet = new Set();
    collection.getAllSorted().map(function(item) {
        if (!isHidden(item) && item.data.author) {
            tagSet.add(item.data.author);
        }
    });

    // Cache the full sorted collection once (we'll sort per-author explicitly below)
    const allItems = collection.getAllSorted();

    // Get each item that matches the author
    let tagMap = [];
    let tagArray = [...tagSet];
    for (let tagName of tagArray) {
        let tagItems = allItems.filter(function (item) {
            return !isHidden(item) && item.data.author && (item.data.author === tagName);
        });

        // newest-first + pinned-first
        tagItems = pinnedFirstNewestFirst(tagItems);

        let pagedItems = lodash.chunk(tagItems, pageSize);
        let hrefs = [];
        for (let pageNumber = 0, max = pagedItems.length; pageNumber < max; pageNumber++) {
            hrefs[pageNumber] = linkPrefix + slugify(tagName) + '/' + (pageNumber == 0 ? '' : pageNumber + '/');
        }
        for (let pageNumber = 0, max = pagedItems.length; pageNumber < max; pageNumber++) {
            tagMap.push({
                tagName: tagName,
                pageNumber: pageNumber,
                items: pagedItems[pageNumber],
                hrefs: hrefs,
                href: {
                    first: hrefs[0],
                    previous: (pageNumber > 0 ? hrefs[pageNumber-1] : hrefs[0]),
                    next: (pageNumber < pagedItems.length - 1 ? hrefs[pageNumber + 1] : hrefs[pagedItems.length - 1]),
                    last: hrefs[pagedItems.length - 1],
                }
            });
        }
    }

    return tagMap;
};

export default eleventyConfig => {
    eleventyConfig.addCollection("authorPagination", authorPagination);
};