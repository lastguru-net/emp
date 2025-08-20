import siteconfig from "../content/_data/siteconfig.js";
import { Duration } from "luxon";

export default eleventyConfig => {
    // Extract reading time
    eleventyConfig.addNunjucksFilter("readingTime", (wordcount) => {
        let readingTime = Math.ceil(wordcount / 250);
        const dur = Duration.fromObject({ minutes: readingTime }).reconfigure({ locale: (siteconfig.lang || "en") });
        return dur.toHuman();
    });

    // Extract word count
    eleventyConfig.addNunjucksFilter("formatWords", (wordcount) => {
        return wordcount.toLocaleString(siteconfig.lang || "en");
    });
};