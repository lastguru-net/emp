import assert from "node:assert/strict";
import test from "node:test";
import { createMarkdownLibrary } from "../_11ty/markdown.js";

const render = (source) => createMarkdownLibrary().render(source);

test("core block and inline structures render semantic HTML", () => {
    const html = render(`
# Heading

Paragraph with *emphasis*, **strong text**, [a link](https://example.com), and \`inline code\`.

> A quoted paragraph.

- Unordered
- List

1. Ordered
2. List
   - Nested item
`);

    assert.match(html, /<h1 id="heading"[^>]*>Heading<\/h1>/);
    assert.match(html, /<p>Paragraph with <em>emphasis<\/em>, <strong>strong text<\/strong>, <a href="https:\/\/example\.com">a link<\/a>, and <code>inline code<\/code>\.<\/p>/);
    assert.match(html, /<blockquote>\s*<p>A quoted paragraph\.<\/p>\s*<\/blockquote>/);
    assert.match(html, /<ul>\s*<li>Unordered<\/li>\s*<li>List<\/li>\s*<\/ul>/);
    assert.match(html, /<ol>\s*<li>Ordered<\/li>\s*<li>List\s*<ul>\s*<li>Nested item<\/li>\s*<\/ul>\s*<\/li>\s*<\/ol>/);
});

test("images, hard breaks, and thematic breaks use XHTML endings", () => {
    const html = render([
        '![Alt text](image.png "Image title")',
        "",
        "first line  ",
        "second line",
        "",
        "---"
    ].join("\n"));

    assert.match(html, /<img src="image\.png" alt="Alt text" title="Image title" \/>/);
    assert.match(html, /first line<br \/>\nsecond line/);
    assert.match(html, /<hr \/>/);
});

test("tables preserve header and alignment semantics", () => {
    const html = render(`
| Left | Right |
| :--- | ---: |
| A | B |
`);

    assert.match(html, /<thead>[\s\S]*<th style="text-align:left">Left<\/th>[\s\S]*<th style="text-align:right">Right<\/th>[\s\S]*<\/thead>/);
    assert.match(html, /<tbody>[\s\S]*<td style="text-align:left">A<\/td>[\s\S]*<td style="text-align:right">B<\/td>[\s\S]*<\/tbody>/);
});

test("raw HTML is deliberate while Markdown text and code remain escaped", () => {
    const html = render(`
<section data-kind="raw"><strong>Raw HTML</strong></section>

Text comparison: 5 < 6 & 7 > 3.

Inline code: \`<em>&</em>\`.

\`\`\`html
<script>alert("unsafe")</script>
\`\`\`
`);

    assert.match(html, /<section data-kind="raw"><strong>Raw HTML<\/strong><\/section>/);
    assert.match(html, /Text comparison: 5 &lt; 6 &amp; 7 &gt; 3\./);
    assert.match(html, /<code>&lt;em&gt;&amp;&lt;\/em&gt;<\/code>/);
    assert.match(html, /&lt;script&gt;alert\(&quot;unsafe&quot;\)&lt;\/script&gt;/);
    assert.doesNotMatch(html, /<script>alert/);
});

test("bare URLs stay as text while explicit autolinks remain available", () => {
    const html = render("Bare https://example.com/path; explicit <https://example.org/path>.");

    assert.match(html, /Bare https:\/\/example\.com\/path; explicit <a href="https:\/\/example\.org\/path">https:\/\/example\.org\/path<\/a>\./);
    assert.doesNotMatch(html, /href="https:\/\/example\.com\/path"/);
});

test("typographic replacements are enabled", () => {
    const html = render(`"Quotes" -- ... (c) (tm)`);

    assert.match(html, new RegExp(`“Quotes” \\u2013 … © ™`));
});

test("heading anchors generate stable unique IDs for duplicates", () => {
    const html = render("## Repeat\n\n## Repeat");

    assert.match(html, /<h2 id="repeat"[^>]*>Repeat<\/h2>/);
    assert.match(html, /<h2 id="repeat-1"[^>]*>Repeat<\/h2>/);
});

test("definition lists require definition-list syntax", () => {
    const html = render(`
Term
: Definition

Ordinary term

Ordinary paragraph
`);

    assert.match(html, /<dl>\s*<dt>Term<\/dt>\s*<dd>Definition<\/dd>\s*<\/dl>/);
    assert.match(html, /<p>Ordinary term<\/p>\s*<p>Ordinary paragraph<\/p>/);
});

test("emoji aliases render while unknown aliases remain literal", () => {
    assert.equal(render("Known :smile:; unknown :not_an_emoji:").trim(),
        "<p>Known 😄; unknown :not_an_emoji:</p>");
});

test("footnotes link repeated references and emit matching backreferences", () => {
    const html = render("First[^note] and again[^note].\n\n[^note]: Footnote text.");

    assert.match(html, /<a href="#fn1" id="fnref1">\[1\]<\/a>/);
    assert.match(html, /<a href="#fn1" id="fnref1:1">\[1:1\]<\/a>/);
    assert.match(html, /<li id="fn1" class="footnote-item"><p>Footnote text\./);
    assert.match(html, /<a href="#fnref1" class="footnote-backref">↩︎<\/a> <a href="#fnref1:1" class="footnote-backref">↩︎<\/a>/);
});

test("mark, subscript, and superscript extensions enforce their boundaries", () => {
    const html = render("==marked== and == not marked ==; H~2~O and ~not valid~; x^2^ and ^not valid^");

    assert.match(html, /<mark>marked<\/mark> and == not marked ==/);
    assert.match(html, /H<sub>2<\/sub>O and ~not valid~/);
    assert.match(html, /x<sup>2<\/sup> and \^not valid\^/);
});

test("task lists distinguish checked, unchecked, and ordinary items", () => {
    const html = render(`
- [ ] Pending
- [x] Complete

- Ordinary
`);

    assert.match(html, /<ul class="contains-task-list">/);
    assert.match(html, /<input class="task-list-item-checkbox" disabled="" type="checkbox"> Pending/);
    assert.match(html, /<input class="task-list-item-checkbox" checked="" disabled="" type="checkbox"> Complete/);
    assert.match(html, /<li>\s*<p>Ordinary<\/p>\s*<\/li>/);
});

test("the production code-block plugin integrates with the configured language", () => {
    const source = `
\`inline\`

\`\`\`js filename="src/app.js"
const result = 1 < 2;
\`\`\`

\`\`\`
plain text
\`\`\`
`;
    const html = render(source);

    assert.match(html, /<p><code>inline<\/code><\/p>/);
    assert.match(html, /<span class="code-block-metadata code-block-filename" title="src\/app\.js">src\/app\.js<\/span>/);
    assert.match(html, /<span class="code-block-language">JavaScript<\/span>/);
    assert.match(html, /<code class="language-js">const result = 1 &lt; 2;/);
    assert.match(html, /<span class="code-block-language">Code<\/span>/);
});

test("a mixed document exercises the assembled plugin order", () => {
    const html = render(`
# Release :rocket:

Read ==the guide== at <https://example.com/docs>. [^source]

Status
: H~2~O is x^2^.

- [x] Published

\`\`\`json title="Manifest"
{"ready": true}
\`\`\`

[^source]: Primary source.
`);

    assert.match(html, /<h1 id="release"[^>]*>Release 🚀<\/h1>/);
    assert.match(html, /Read <mark>the guide<\/mark> at <a href="https:\/\/example\.com\/docs">https:\/\/example\.com\/docs<\/a>\. <sup class="footnote-ref">/);
    assert.match(html, /<dl>[\s\S]*H<sub>2<\/sub>O is x<sup>2<\/sup>\.[\s\S]*<\/dl>/);
    assert.match(html, /<ul class="contains-task-list">/);
    assert.match(html, /<span class="code-block-metadata code-block-title" title="Manifest">Manifest<\/span>/);
    assert.match(html, /<span class="code-block-language">JSON<\/span>/);
    assert.match(html, /<section class="footnotes">[\s\S]*Primary source\.[\s\S]*<\/section>/);
});