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

// Collection properties that must be hardcoded here
// Page size
const pageSize = 10;
// Permalink prefix for forming URLs
const linkPrefix = '/';

const tagPagination = (collection) => {
    // Get unique list of tags
    let tagSet = new Set();
    collection.getAllSorted().map(function(item) {
        if ("tags" in item.data) {
            let tags = item.data.tags;
            for (let tag of tags) {
                tagSet.add(tag);
            }
        }
    });

    // Get each item that matches the tag
    let tagMap = [];
    let tagArray = [...tagSet];
    for (let tagName of tagArray) {
        let tagItems = collection.getFilteredByTag(tagName).reverse();
        let pagedItems = lodash.chunk(tagItems, pageSize);
        let hrefs = [];
        for (let pageNumber = 0, max = pagedItems.length; pageNumber < max; pageNumber++) {
            hrefs[pageNumber] = linkPrefix + tagName + '/' + (pageNumber == 0 ? '' : pageNumber + '/');
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
    eleventyConfig.addCollection("tagPagination", tagPagination);
};