import assert from "node:assert/strict";
import test from "node:test";
import markdownIt from "markdown-it";
import codeBlockHeaders, {
    getCodeBlockLanguageLabel,
    getCodeBlockMetadata,
    getCodeBlockMetadataLabel,
    parseFenceInfo
} from "../_11ty/code-block-headers.js";

const sitestrings = {
    en: { code: "Code" },
    lv: { code: "Kods" }
};

const render = (source, language = "en", highlighter) => {
    const md = markdownIt({
        highlight: highlighter ?? ((content, codeLanguage) => (
            `<pre class="language-${codeLanguage}"><code class="language-${codeLanguage}">${md.utils.escapeHtml(content.trimEnd())}</code></pre>`
        ))
    }).use(codeBlockHeaders);

    return md.render(source, {
        siteconfig: { lang: language },
        sitestrings
    }).trim();
};

test("fence information separates Prism language syntax from header metadata", () => {
    assert.deepEqual(parseFenceInfo('js/1,3 filename="src/example.js" title="Example"'), {
        languageSpec: "js/1,3",
        language: "js",
        metadata: {
            filename: "src/example.js",
            title: "Example"
        }
    });

    assert.deepEqual(parseFenceInfo('title="Configuration example"'), {
        languageSpec: "",
        language: "",
        metadata: { title: "Configuration example" }
    });

    assert.deepEqual(parseFenceInfo("yaml filename='site config.yml' title=Example"), {
        languageSpec: "yaml",
        language: "yaml",
        metadata: {
            filename: "site config.yml",
            title: "Example"
        }
    });
});

test("metadata labels prefer title, then filename", () => {
    assert.deepEqual(getCodeBlockMetadata('js title="Example" filename="app.js"'), {
        type: "title",
        label: "Example"
    });
    assert.deepEqual(getCodeBlockMetadata('js filename="app.js"'), {
        type: "filename",
        label: "app.js"
    });
    assert.equal(getCodeBlockMetadata("js"), null);
    assert.equal(getCodeBlockMetadataLabel('js title="Example" filename="app.js"'), "Example");
    assert.equal(getCodeBlockMetadataLabel('js filename="app.js"'), "app.js");
    assert.equal(getCodeBlockMetadataLabel("js"), "");
});

test("language labels remain independent from metadata", () => {
    assert.equal(getCodeBlockLanguageLabel('js filename="app.js"'), "JavaScript");
    assert.equal(getCodeBlockLanguageLabel("njk"), "Nunjucks");
    assert.equal(getCodeBlockLanguageLabel("custom-language"), "custom-language");
});

test("language-less blocks use the localized generic label", () => {
    assert.equal(getCodeBlockLanguageLabel("", { siteconfig: { lang: "en" }, sitestrings }), "Code");
    assert.equal(getCodeBlockLanguageLabel("", { siteconfig: { lang: "lv" }, sitestrings }), "Kods");
    assert.equal(getCodeBlockLanguageLabel("", { siteconfig: { lang: "missing" }, sitestrings }), "Code");
    assert.equal(getCodeBlockLanguageLabel(""), "Code");
});

test("every fenced block receives a header while inline code remains inline", () => {
    const html = render("Before `inline` after.\n\n```\nplain text\n```");

    assert.match(html, /<p>Before <code>inline<\/code> after\.<\/p>/);
    assert.match(html, /<figure class="code-block">/);
    assert.match(html, /<figcaption class="code-block-header"><span class="code-block-language">Code<\/span><\/figcaption>/);
    assert.match(html, /<pre class="language-text"><code class="language-text">plain text<\/code><\/pre>/);
    assert.equal(html.match(/code-block-header/g)?.length, 1);
});

test("metadata-only fences show metadata and the generic language label", () => {
    const html = render('```title="Configuration example"\nkey = value\n```');

    assert.match(html, /<span class="code-block-metadata code-block-title" title="Configuration example">Configuration example<\/span>/);
    assert.match(html, /<span class="code-block-language">Code<\/span>/);
    assert.match(html, /<pre class="language-text"><code class="language-text">key = value<\/code><\/pre>/);
});

test("metadata is escaped and removed before Prism receives the language", () => {
    let receivedLanguage;
    const html = render(
        '```js/2 title="<script>alert(1)</script>"\nalert(1);\n```',
        "en",
        (content, language) => {
            receivedLanguage = language;
            return `<pre class="language-js"><code class="language-js">${content.trimEnd()}</code></pre>`;
        }
    );

    assert.equal(receivedLanguage, "js/2");
    assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.match(html, /<span class="code-block-language">JavaScript<\/span>/);
});

test("filenames receive a distinct class for start-side truncation", () => {
    const html = render('```bash filename="scripts/status-check.sh"\nexit 0\n```');

    assert.match(html, /<span class="code-block-metadata code-block-filename" title="scripts\/status-check\.sh">scripts\/status-check\.sh<\/span>/);
    assert.match(html, /<span class="code-block-language">Bash<\/span>/);
});

test("unknown languages retain their Prism class and a safe visible label", () => {
    const html = render("```custom-language\nvalue\n```");

    assert.match(html, /<span class="code-block-language">custom-language<\/span>/);
    assert.match(html, /<pre class="language-custom-language">/);
});
