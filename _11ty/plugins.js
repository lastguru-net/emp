import siteconfig from "../content/_data/siteconfig.js";

const loadPlugin = async (name) => {
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) throw new TypeError(`Invalid plugin name: ${name}`);
    return (await import(`../extensions/plugins/${name}/index.js`)).default;
};

export const renderPlugins = async (hook) => {
    const fragments = [];
    for (const [name, config] of Object.entries(siteconfig.plugins ?? {})) {
        if (config == null || config === false) continue;
        const provider = await loadPlugin(name);
        const fragment = await provider[hook]?.(config === true ? {} : config);
        if (fragment) fragments.push(fragment);
    }
    return fragments.join("\n");
};

export default async (eleventyConfig) => {
    for (const [name, config] of Object.entries(siteconfig.plugins ?? {})) {
        if (config == null || config === false) continue;
        const provider = await loadPlugin(name);
        await provider.setup?.(eleventyConfig, config === true ? {} : config);
    }

    const shortcodes = {
        opengraph: "pluginsOpengraph",
        head: "pluginsHead",
        bodyStart: "pluginsBodyStart",
        css: "pluginsCss",
    };
    for (const [hook, shortcode] of Object.entries(shortcodes)) {
        eleventyConfig.addNunjucksAsyncShortcode(shortcode, () => renderPlugins(hook));
    }
};
