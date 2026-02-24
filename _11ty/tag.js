// Custom collection for double pagination
// Makes a tag collection that is paginated
// Based on the solution suggested here: https://github.com/11ty/eleventy/issues/332#issuecomment-445236776

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

import lodash from "@11ty/lodash-custom";
import siteconfig from "../content/_data/siteconfig.js";

// Collection properties
const pageSize = siteconfig?.pagination?.postsPerPage ?? 10;

// Permalink prefix for forming URLs (configured)
const rawPrefix = siteconfig?.pagination?.tagLinkPrefix ?? "/";
const linkPrefix = rawPrefix.endsWith("/") ? rawPrefix : rawPrefix + "/";

const isHidden = (item) => item?.data?.hidden === true;

const getTags = (item) => {
    const tags = item?.data?.tags ?? [];
    return Array.isArray(tags) ? tags : [tags];
};

const pinnedFirstNewestFirst = (items) => {
    const newestFirst = [...items].sort((a, b) => (b.date || 0) - (a.date || 0));
    const pinned = [];
    const regular = [];
    for (const it of newestFirst) (it?.data?.pinned === true ? pinned : regular).push(it);
    return pinned.length ? pinned.concat(regular) : regular;
};

const tagPagination = (collection) => {
    // Get unique list of tags (ignore hidden items)
    const tagSet = new Set();
    collection.getAllSorted().forEach((item) => {
        if (!isHidden(item) && ("tags" in item.data)) {
            for (const tag of getTags(item)) tagSet.add(tag);
        }
    });

    // Get each item that matches the tag
    const tagMap = [];
    const tagArray = [...tagSet];
    for (const tagName of tagArray) {
        let tagItems = collection
            .getFilteredByTag(tagName)
            .filter((item) => !isHidden(item));

        // newest-first + pinned-first
        tagItems = pinnedFirstNewestFirst(tagItems);

        const pagedItems = lodash.chunk(tagItems, pageSize);
        const hrefs = [];
        for (let pageNumber = 0, max = pagedItems.length; pageNumber < max; pageNumber++) {
            hrefs[pageNumber] = linkPrefix + tagName + "/" + (pageNumber === 0 ? "" : pageNumber + "/");
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
    eleventyConfig.addCollection("tagPagination", tagPagination);
};