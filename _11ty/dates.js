// Date formatting filters and shortcodes
import siteconfig from "../content/_data/siteconfig.js";

const pad = (value, length = 2) => String(value).padStart(length, "0");

const toDate = (value) => {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) throw new RangeError("Invalid time value");
    return date;
};

const formatYear = (date) => {
    const year = date.getFullYear();
    if (year >= 0 && year <= 9999) return pad(year, 4);
    return `${year < 0 ? "-" : "+"}${pad(Math.abs(year), 6)}`;
};

const formatDate = (date) => {
    return `${formatYear(date)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const formatOffset = (date, separator = ":") => {
    const offset = -date.getTimezoneOffset();
    const sign = offset < 0 ? "-" : "+";
    const absoluteOffset = Math.abs(offset);
    return `${sign}${pad(Math.floor(absoluteOffset / 60))}${separator}${pad(absoluteOffset % 60)}`;
};

const formatDateTime = (date) => {
    const time = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
    return `${formatDate(date)}T${time}${formatOffset(date)}`;
};

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const formatRssYear = (date) => {
    const year = date.getFullYear();
    return `${year < 0 ? "-" : ""}${pad(Math.abs(year), 4)}`;
};

const formatRssDate = (date) => {
    const day = `${weekdays[date.getDay()]}, ${pad(date.getDate())} ${months[date.getMonth()]} ${formatRssYear(date)}`;
    const time = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    return `${day} ${time} ${formatOffset(date, "")}`;
};

export default (eleventyConfig) => {
    const readableDateFormatter = new Intl.DateTimeFormat(siteconfig.lang || "en", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });

    // ISO date (YYYY-MM-DD) for sitemaps
    eleventyConfig.addNunjucksFilter("isoDate", (value) => formatDate(toDate(value)));

    // Full ISO datetime for JSON-LD and Atom
    eleventyConfig.addNunjucksFilter("isoDateTime", (value) => formatDateTime(toDate(value)));

    // Localized readable date
    eleventyConfig.addNunjucksFilter("readableDate", (value) => readableDateFormatter.format(toDate(value)));

    // RFC 2822 date for RSS feeds
    eleventyConfig.addNunjucksFilter("rssDate", (value) => formatRssDate(toDate(value)));

    // Current year shortcode
    eleventyConfig.addShortcode("year", () => new Date().getFullYear());
};