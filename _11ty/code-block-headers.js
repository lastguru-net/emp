const languageLabels = {
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

const metadataPattern = /(?:^|\s)(title|filename)=(?:"([^"]*)"|'([^']*)'|(\S+))/g;
const metadataPrefixPattern = /^(?:title|filename)=/;

const parseFenceInfo = (value) => {
    const info = value.trim();
    const firstToken = info.match(/^\S+/)?.[0] ?? "";
    const languageSpec = metadataPrefixPattern.test(firstToken) ? "" : firstToken;
    const metadata = {};

    for (const match of info.matchAll(metadataPattern)) {
        metadata[match[1]] = (match[2] ?? match[3] ?? match[4]).trim();
    }

    return {
        languageSpec,
        language: languageSpec.split("/")[0],
        metadata
    };
};

const getCodeBlockLanguageLabel = (info, codeLabel) => {
    const { language } = parseFenceInfo(info);

    if (!language) {
        return codeLabel;
    }

    return languageLabels[language.toLowerCase()] ?? language;
};

const getCodeBlockMetadata = (info) => {
    const { metadata } = parseFenceInfo(info);

    for (const type of ["title", "filename"]) {
        if (metadata[type]) {
            return { type, label: metadata[type] };
        }
    }

    return null;
};

export default (md, { strings }) => {
    const renderFence = md.renderer.rules.fence;

    md.renderer.rules.fence = (tokens, index, options, env, renderer) => {
        const token = tokens[index];
        const originalInfo = token.info;
        const { languageSpec } = parseFenceInfo(originalInfo);
        const languageLabel = getCodeBlockLanguageLabel(originalInfo, strings.code);
        const metadataValue = getCodeBlockMetadata(originalInfo);
        const metadata = metadataValue
            ? `<span class="code-block-metadata code-block-${metadataValue.type}" title="${md.utils.escapeHtml(metadataValue.label)}">${md.utils.escapeHtml(metadataValue.label)}</span>\n`
            : "";
        token.info = languageSpec || "text";
        const code = renderFence(tokens, index, options, env, renderer).trimEnd();
        token.info = originalInfo;

        return `<figure class="code-block">\n<figcaption class="code-block-header">${metadata}<span class="code-block-language">${md.utils.escapeHtml(languageLabel)}</span></figcaption>\n${code}\n</figure>\n`;
    };
};