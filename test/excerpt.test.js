import assert from "node:assert/strict";
import test from "node:test";
import { extractExcerpt } from "../_11ty/excerpt.js";

test("empty and whitespace-only content produces no excerpt", () => {
    assert.equal(extractExcerpt(), "");
    assert.equal(extractExcerpt(""), "");
    assert.equal(extractExcerpt(" \n\t "), "");
    assert.equal(extractExcerpt("<p> </p>"), "");
});

test("HTML is stripped and remaining whitespace is collapsed", () => {
    assert.equal(
        extractExcerpt("<p>Hello <strong>world</strong>.</p>   <p>Next sentence.</p>"),
        "Hello world . Next sentence."
    );
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
