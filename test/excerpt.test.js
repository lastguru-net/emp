import assert from "node:assert/strict";
import test from "node:test";
import { extractExcerpt } from "../_11ty/excerpt.js";
import { createMarkdownLibrary } from "../_11ty/markdown.js";

test("empty and whitespace-only content produces no excerpt", () => {
    assert.equal(extractExcerpt(), "");
    assert.equal(extractExcerpt(""), "");
    assert.equal(extractExcerpt(" \n\t "), "");
    assert.equal(extractExcerpt("<p> </p>"), "");
});

test("rendered Markdown excerpts preserve visible characters and inline words", () => {
    const html = createMarkdownLibrary().render('Fish & chips with **salt**, un**believ**able &copy; and `x < y`.');
    assert.equal(extractExcerpt(html), "Fish & chips with salt, unbelievable © and x < y.");
});

test("only the first source line is used when one is present", () => {
    assert.equal(extractExcerpt("First line\nSecond line"), "First line…");
    assert.equal(extractExcerpt("First line\r\nSecond line"), "First line…");
});

test("long excerpts prefer the last word boundary within the limit", () => {
    assert.equal(extractExcerpt("alpha beta gamma delta", 15), "alpha beta…");
    assert.equal(extractExcerpt("abcdefghijklmnopqr", 10), "abcdefghij…");
});

test("ellipsis appears only when source content remains", () => {
    assert.equal(extractExcerpt("alpha beta", 10), "alpha beta");
    assert.equal(extractExcerpt("alpha beta", 9), "alpha…");
    assert.equal(extractExcerpt("alpha beta\n", 20), "alpha beta");
});