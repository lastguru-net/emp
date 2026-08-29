const LANGUAGE_LABELS = {
    bash: "Bash",
    css: "CSS",
    html: "HTML",
    js: "JavaScript",
    javascript: "JavaScript",
    json: "JSON",
    json5: "JSON5",
    jsx: "JSX",
    markdown: "Markdown",
    md: "Markdown",
    njk: "Nunjucks",
    nunjucks: "Nunjucks",
    sh: "Shell",
    shell: "Shell",
    text: "Text",
    ts: "TypeScript",
    tsx: "TSX",
    typescript: "TypeScript",
    xml: "XML",
    yaml: "YAML",
    yml: "YAML"
};

const METADATA_PATTERN = /(?:^|\s)(title|filename)=(?:"([^"]*)"|'([^']*)'|(\S+))/g;
const METADATA_PREFIX_PATTERN = /^(?:title|filename)=/;

export const parseFenceInfo = (value = "") => {
    const info = String(value).trim();
    const firstToken = info.match(/^\S+/)?.[0] ?? "";
    const languageSpec = METADATA_PREFIX_PATTERN.test(firstToken) ? "" : firstToken;
    const metadata = {};

    for (const match of info.matchAll(METADATA_PATTERN)) {
        metadata[match[1]] = (match[2] ?? match[3] ?? match[4] ?? "").trim();
    }

    return {
        languageSpec,
        language: languageSpec.split("/")[0],
        metadata
    };
};

const getFallbackLabel = (env = {}) => {
    const language = env.siteconfig?.lang;
    return env.sitestrings?.[language]?.code ?? env.sitestrings?.en?.code ?? "Code";
};

export const getCodeBlockLanguageLabel = (info, env = {}) => {
    const { language } = parseFenceInfo(info);

    if (!language) {
        return getFallbackLabel(env);
    }

    return LANGUAGE_LABELS[language.toLowerCase()] ?? language;
};

export const getCodeBlockMetadata = (info) => {
    const { metadata } = parseFenceInfo(info);

    for (const type of ["title", "filename"]) {
        if (metadata[type]) {
            return { type, label: metadata[type] };
        }
    }

    return null;
};

export const getCodeBlockMetadataLabel = (info) => getCodeBlockMetadata(info)?.label ?? "";

export default (md) => {
    const renderFence = md.renderer.rules.fence;

    md.renderer.rules.fence = (tokens, index, options, env, renderer) => {
        const token = tokens[index];
        const originalInfo = token.info;
        const { languageSpec } = parseFenceInfo(originalInfo);
        const languageLabel = getCodeBlockLanguageLabel(originalInfo, env);
        const metadataValue = getCodeBlockMetadata(originalInfo);
        const metadata = metadataValue
            ? `<span class="code-block-metadata code-block-${metadataValue.type}" title="${md.utils.escapeHtml(metadataValue.label)}">${md.utils.escapeHtml(metadataValue.label)}</span>\n`
            : "";
        let code;

        try {
            token.info = languageSpec || "text";
            code = renderFence(tokens, index, options, env, renderer).trimEnd();
        } finally {
            token.info = originalInfo;
        }

        return `<figure class="code-block">\n<figcaption class="code-block-header">${metadata}<span class="code-block-language">${md.utils.escapeHtml(languageLabel)}</span></figcaption>\n${code}\n</figure>\n`;
    };
};
