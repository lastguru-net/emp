// Date formatting filters and shortcodes
import siteconfig from "../content/_data/siteconfig.js";

export const toDate = (value) => {
    // Match Eleventy's UTC default for timezone-less ISO datetimes.
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}[Tt ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(value)) value += "Z";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) throw new RangeError("Invalid time value");
    return date;
};

const getLatestModifiedDate = (items = []) => {
    return items.reduce((latest, item) => {
        const date = toDate(item.data.updated || item.date);
        return !latest || date > latest ? date : latest;
    }, undefined);
};

export default (eleventyConfig) => {
    const readableDateFormatter = new Intl.DateTimeFormat(siteconfig.lang || "en", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC"
    });

    // ISO date (YYYY-MM-DD) in UTC for sitemaps
    eleventyConfig.addNunjucksFilter("isoDate", (value) => toDate(value).toISOString().split("T")[0]);

    // Full ISO datetime in UTC for feeds and metadata
    eleventyConfig.addNunjucksFilter("isoDateTime", (value) => toDate(value).toISOString());

    // Localized readable date in UTC
    eleventyConfig.addNunjucksFilter("readableDate", (value) => readableDateFormatter.format(toDate(value)));

    // Localized readable date and time in UTC
    eleventyConfig.addNunjucksFilter("readableDateTime", (value, lang = siteconfig.lang || "en") =>
        new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short", hourCycle: "h23", timeZone: "UTC" }).format(toDate(value)));

    // RFC 2822 date in GMT for RSS feeds
    eleventyConfig.addNunjucksFilter("rssDate", (value) => toDate(value).toUTCString());

    // Latest effective modification date across content items
    eleventyConfig.addNunjucksFilter("latestModifiedDate", getLatestModifiedDate);

    // Current UTC year shortcode
    eleventyConfig.addShortcode("year", () => new Date().getUTCFullYear());
};