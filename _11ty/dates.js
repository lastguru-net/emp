// Date formatting filters and shortcodes
import { DateTime } from "luxon";
import siteconfig from "../content/_data/siteconfig.js";

// Convert any date value to a Luxon DateTime
const toDateTime = (date) => {
    if (!(date instanceof Date)) date = new Date(date);
    return DateTime.fromISO(date.toISOString());
};

export default (eleventyConfig) => {
    // ISO date (YYYY-MM-DD) for sitemaps
    eleventyConfig.addNunjucksFilter("isoDate", (date) => toDateTime(date).toISODate());

    // Full ISO datetime for JSON-LD and Atom
    eleventyConfig.addNunjucksFilter("isoDateTime", (date) => toDateTime(date).toISO());

    // Localized readable date
    eleventyConfig.addNunjucksFilter("readableDate", (date) => {
        return toDateTime(date).setLocale(siteconfig.lang || "en").toLocaleString(DateTime.DATE_MED);
    });

    // RFC 2822 date for RSS feeds
    eleventyConfig.addNunjucksFilter("rssDate", (date) => toDateTime(date).toRFC2822());

    // Current year shortcode
    eleventyConfig.addShortcode("year", () => new Date().getFullYear());
};