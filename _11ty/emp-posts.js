export default (eleventyConfig) => {
    eleventyConfig.addCollection("empPosts", (collectionApi) => {
        // NOTE: In a config-time collection callback you don't have template context (`collections.posts`).
        // Derive from the tag instead (avoids circular deps and works reliably at build time).
        const items = collectionApi.getFilteredByTag("posts") || [];

        // newest first (don’t rely on implicit ordering)
        const newestFirst = [...items]
            .filter((item) => !(item?.data?.hidden === true))
            .sort((a, b) => (b.date || 0) - (a.date || 0));

        const pinned = [];
        const regular = [];
        for (const item of newestFirst) (item?.data?.pinned === true ? pinned : regular).push(item);

        // If nothing is pinned, `regular` already contains the full sorted list.
        return pinned.length ? [...pinned, ...regular] : regular;
    });
};