export const loadAuthenticationMethod = async (config) => {
    const name = config?.method;
    if (name == null || name === "" || name === false) return null;
    if (typeof name !== "string" || !/^[a-zA-Z0-9_-]+$/.test(name)) {
        throw new TypeError(`Invalid authentication method: ${String(name)}`);
    }
    return (await import(`../extensions/authentication/${name}/index.js`)).default;
};

export const renderAuthenticationMethod = async (config, siteUrl) => {
    const provider = await loadAuthenticationMethod(config);
    return provider ? provider.browser(config.options ?? {}, siteUrl) : "";
};

export default (eleventyConfig) => {
    eleventyConfig.addNunjucksAsyncShortcode("authenticationMethod", renderAuthenticationMethod);
};
