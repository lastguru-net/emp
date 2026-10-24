export default {
    template: "extensions/postlist/static/postlist.njk",
    async setup(eleventyConfig) {
        // Load on setup so watch rebuilds pick up changed renderer modules.
        const { html } = await import("../../../assets/js/html.js");
        const { createPostPropertiesRenderer } = await import("../../../assets/js/post-properties.js");
        const { createPostCardRenderer } = await import("../post-card.js");
        const { createPaginationRenderer } = await import("../pagination.js");
        const { renderProperties } = createPostPropertiesRenderer(html);
        const renderCard = createPostCardRenderer(html, renderProperties);
        const renderPagination = createPaginationRenderer(html);

        eleventyConfig.addShortcode("postCard", renderCard);
        eleventyConfig.addFilter("postPagination", (list) => renderPagination(list.pagination,
            number => list.pagination.hrefs[number - 1], list.context));
    },
};
