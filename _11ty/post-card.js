import { renderCard, renderProperties, renderPagination } from "../assets/js/post-card.js";
import { prepareThumbnail } from "./post-card-image.js";

// Nunjucks prepares card data; the shortcodes and pagination filter render it
export default (eleventyConfig) => {
    eleventyConfig.addNunjucksFilter("postPagination", function (pagination) {
        return renderPagination({ page: pagination.pageNumber + 1, totalPages: pagination.hrefs.length },
            number => eleventyConfig.getFilter("url")(pagination.hrefs[number - 1]), this.ctx);
    });
    eleventyConfig.addShortcode("postCard", function (card) {
        return renderCard(card, this.ctx);
    });
    eleventyConfig.addShortcode("postProperties", function (card) {
        return renderProperties(card, this.ctx);
    });
    eleventyConfig.addFilter("postThumbnail", async (src, lqip) => prepareThumbnail(src, {
        urlFilter: eleventyConfig.getFilter("url"),
        lqip
    }));
};
