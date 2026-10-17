import assert from "node:assert/strict";
import test from "node:test";
import { pinnedFirstNewestFirst } from "../_11ty/collections.js";

test("posts are sorted newest-first within pinned and regular groups", () => {
    const oldestPinned = { date: new Date("2024-01-01T00:00:00Z"), data: { pinned: true } };
    const newestRegular = { date: new Date("2025-03-01T00:00:00Z"), data: {} };
    const newestPinned = { date: new Date("2025-02-01T00:00:00Z"), data: { pinned: true } };
    const oldestRegular = { date: new Date("2024-02-01T00:00:00Z"), data: {} };
    const input = [oldestRegular, oldestPinned, newestRegular, newestPinned];

    assert.deepEqual(pinnedFirstNewestFirst(input), [newestPinned, oldestPinned, newestRegular, oldestRegular]);
    assert.deepEqual(input, [oldestRegular, oldestPinned, newestRegular, newestPinned]);
});