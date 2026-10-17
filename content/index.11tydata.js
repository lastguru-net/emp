import siteconfig from "./_data/siteconfig.js";
import { loadConfig } from "../_11ty/config.js";

export default async () => ({
    pagination: {
        size: siteconfig?.pagination?.postsPerPage ?? 10,
        generatePageOnEmptyData: (await loadConfig("siteelements")).features.index === "json"
    }
});