// Custom collection for double pagination
// Makes an author collection that is paginated like with tags
// Based on the solution suggested here: https://github.com/11ty/eleventy/issues/332#issuecomment-445236776
// A version of tag.js from this repository

import lodash from "@11ty/lodash-custom";
import slugify from "@sindresorhus/slugify";

// Collection properties that must be hardcoded here
// Page size
const pageSize = 10;
// Permalink prefix for forming URLs
const linkPrefix = "/author/";

const authorPagination = (collection) => {
    // Get unique list of authors as tags
    let tagSet = new Set();
    collection.getAllSorted().map(function(item) {
        if (item.data.author) {
            tagSet.add(item.data.author);
        }
    });

    // Cache the reversed collection once
    const reversedCollection = collection.getAllSorted().reverse();

    // Get each item that matches the tag
    let tagMap = [];
    let tagArray = [...tagSet];
    for (let tagName of tagArray) {
        let tagItems = reversedCollection.filter(function (item) {
            return item.data.author && (item.data.author === tagName);
        });
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