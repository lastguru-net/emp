import assert from "node:assert/strict";
import test from "node:test";
import markdownIt from "markdown-it";
import codeBlockHeaders from "../_11ty/code-block-headers.js";

const strings = {
    copy_code_to_clipboard: "Copy code to clipboard",
    code_copied: "Code copied",
    code_copy_failed: "The code could not be copied",
    code: "Code"
};
const copyIcon = { viewBox: "0 0 24 24", path: "" };

const render = (source, highlighter) => {
    const md = markdownIt({
        highlight: highlighter ?? ((content, codeLanguage) => (
            `<pre class="language-${codeLanguage}"><code class="language-${codeLanguage}">${md.utils.escapeHtml(content.trimEnd())}</code></pre>`
        ))
    }).use(codeBlockHeaders, { copyIcon, strings });

    return md.render(source).trim();
};

test("code-copy controls remain inactive until JavaScript enhancement", () => {
    const html = render("```\nplain text\n```");

    assert.match(html, /class="code-block-copy code-block-copy-pending"[^>]+disabled aria-hidden="true"/);
    assert.doesNotMatch(html, /class="code-block-copy[^>]+ hidden/);
});

test("metadata-only fences show the preferred title and generic language label", () => {
    const html = render('```filename="config.txt" title="Configuration example"\nkey = value\n```');

    assert.match(html, /<span class="code-block-metadata code-block-title" title="Configuration example">Configuration example<\/span>/);
    assert.match(html, /<span class="code-block-language">Code<\/span>/);
});

test("metadata is escaped and removed before the highlighter receives the language", () => {
    let receivedLanguage;
    const html = render(
        '```js/2 title="<script>alert(1)</script>"\nalert(1);\n```',
        (content, language) => {
            receivedLanguage = language;
            return `<pre class="language-js"><code class="language-js">${content.trimEnd()}</code></pre>`;
        }
    );

    assert.equal(receivedLanguage, "js/2");
    assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.match(html, /<span class="code-block-language">JavaScript<\/span>/);
});

test("unknown languages retain their language class and visible label", () => {
    const html = render("```custom-language\nvalue\n```");

    assert.match(html, /<span class="code-block-language">custom-language<\/span>/);
    assert.match(html, /<pre class="language-custom-language">/);
});