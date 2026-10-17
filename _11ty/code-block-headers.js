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

export default (md, { copyIcon, strings }) => {
    const renderFence = md.renderer.rules.fence;
    const copyControls = `<button class="code-block-copy code-block-copy-pending" type="button" aria-label="${md.utils.escapeHtml(strings.copy_code_to_clipboard)}" data-copy-success="${md.utils.escapeHtml(strings.code_copied)}" data-copy-error="${md.utils.escapeHtml(strings.code_copy_failed)}" disabled aria-hidden="true">
<svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="${copyIcon.viewBox}">
<path d="${copyIcon.path}" />
</svg>
</button>
<span class="sr-only" role="status" aria-live="polite" aria-atomic="true"></span>`;

    md.renderer.rules.fence = (tokens, index, options, env, renderer) => {
        const token = tokens[index];
        const originalInfo = token.info;
        const { languageSpec, language, metadata: fields } = parseFenceInfo(originalInfo);
        const languageLabel = language ? (languageLabels[language.toLowerCase()] ?? language) : strings.code;
        const metadataType = fields.title ? "title" : fields.filename ? "filename" : null;
        const metadata = metadataType
            ? `<span class="code-block-metadata code-block-${metadataType}" title="${md.utils.escapeHtml(fields[metadataType])}">${md.utils.escapeHtml(fields[metadataType])}</span>\n`
            : "";
        token.info = languageSpec || "text";
        const code = renderFence(tokens, index, options, env, renderer).trimEnd();
        token.info = originalInfo;

        return `<figure class="code-block">\n<figcaption class="code-block-header">${metadata}<span class="code-block-language">${md.utils.escapeHtml(languageLabel)}</span>\n${copyControls}</figcaption>\n${code}\n</figure>\n`;
    };
};