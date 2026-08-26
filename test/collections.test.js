import assert from "node:assert/strict";
import test from "node:test";
import {
    capitalize,
    collapseWhitespace,
    isHidden,
    pinnedFirstNewestFirst,
    stripTags,
    toArray
} from "../_11ty/collections.js";

test("hidden detection requires the literal boolean true", () => {
    assert.equal(isHidden({ data: { hidden: true } }), true);
    assert.equal(isHidden({ data: { hidden: false } }), false);
    assert.equal(isHidden({ data: { hidden: "true" } }), false);
    assert.equal(isHidden({}), false);
    assert.equal(isHidden(undefined), false);
});

test("array normalization handles absent, scalar, and array values", () => {
    const array = ["one", "two"];

    assert.deepEqual(toArray(undefined), []);
    assert.deepEqual(toArray(null), []);
    assert.deepEqual(toArray(false), []);
    assert.deepEqual(toArray(0), []);
    assert.deepEqual(toArray(""), []);
    assert.deepEqual(toArray("tag"), ["tag"]);
    assert.deepEqual(toArray({ tag: true }), [{ tag: true }]);
    assert.equal(toArray(array), array);
});

test("posts are sorted newest-first within pinned and regular groups", () => {
    const oldestPinned = { date: new Date("2024-01-01T00:00:00Z"), data: { pinned: true } };
    const newestRegular = { date: new Date("2025-03-01T00:00:00Z"), data: {} };
    const newestPinned = { date: new Date("2025-02-01T00:00:00Z"), data: { pinned: true } };
    const undatedRegular = { data: {} };
    const input = [oldestPinned, newestRegular, newestPinned, undatedRegular];

    assert.deepEqual(pinnedFirstNewestFirst(input), [newestPinned, oldestPinned, newestRegular, undatedRegular]);
    assert.deepEqual(input, [oldestPinned, newestRegular, newestPinned, undatedRegular]);
});

test("HTML stripping replaces each tag with a space", () => {
    assert.equal(stripTags("<p>Hello <strong>world</strong>.</p>"), " Hello  world . ");
    assert.equal(stripTags(42), "42");
    assert.equal(stripTags(), "");
});

test("whitespace collapsing trims and normalizes all whitespace runs", () => {
    assert.equal(collapseWhitespace("  alpha\n\tbeta\r\n gamma  "), "alpha beta gamma");
    assert.equal(collapseWhitespace(42), "42");
    assert.equal(collapseWhitespace(), "");
});

test("capitalization changes only the first character after string coercion", () => {
    assert.equal(capitalize("hello WORLD"), "Hello WORLD");
    assert.equal(capitalize("Already"), "Already");
    assert.equal(capitalize(42), "42");
    assert.equal(capitalize(""), "");
    assert.equal(capitalize(), "");
});
