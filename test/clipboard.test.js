import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../assets/js/clipboard.js", import.meta.url), "utf8");

function controls(writeText) {
    const timers = new Map();
    const copied = [];
    let initialize;
    let reject = false;
    let nextTimer = 0;
    let now = 0;
    const button = pending => ({
        disabled: true, hiddenFromAT: true, status: { textContent: "" },
        dataset: { copySuccess: "Nokopēts", copyError: "Neizdevās" },
        classes: new Set([pending, "copy-button"]),
        removeAttribute(name) { assert.equal(name, "aria-hidden"); this.hiddenFromAT = false; },
        addEventListener(event, listener) { assert.equal(event, "click"); this.click = listener; },
        get classList() { return { remove: name => this.classes.delete(name) }; }
    });
    const codes = ["first code\n", "second code"].map(textContent => {
        const control = button("code-block-copy-pending");
        control.code = { textContent };
        control.parentElement = {
            querySelector: selector => { assert.equal(selector, "[role=status]"); return control.status; },
            parentElement: { querySelector: selector => { assert.equal(selector, "pre code"); return control.code; } }
        };
        return control;
    });
    const url = button("copy-url-pending");
    const location = { href: "https://example.org/first/" };
    vm.runInNewContext(source, {
        document: {
            addEventListener(event, callback) { assert.equal(event, "DOMContentLoaded"); initialize = callback; },
            querySelectorAll: selector => { assert.equal(selector, ".code-block-copy"); return codes; },
            querySelector: selector => { assert.equal(selector, "[data-copy-url]"); return url; },
            getElementById: id => { assert.equal(id, "copy-link-status"); return url.status; }
        },
        navigator: { clipboard: { async writeText(text) { if (writeText) await writeText(text); if (reject) throw new Error("denied"); copied.push(text); } } },
        window: {
            clearTimeout: timer => timers.delete(timer),
            setTimeout: (callback, delay) => { callback.deadline = now + delay; timers.set(++nextTimer, callback); return nextTimer; }
        },
        location
    });
    return { codes, url, timers, copied, location, initialize, fail: () => { reject = true; },
        advance(milliseconds) {
            now += milliseconds;
            for (const [timer, callback] of timers) if (callback.deadline <= now) { timers.delete(timer); callback(); }
        }
    };
}

test("copy controls progressively enable and read code/current URL on click", async () => {
    const state = controls();
    state.initialize();
    for (const button of [...state.codes, state.url]) {
        assert.equal(button.disabled, false);
        assert.equal(button.hiddenFromAT, false);
        assert.equal(button.classes.has(button === state.url ? "copy-url-pending" : "code-block-copy-pending"), false);
    }
    await state.codes[0].click();
    state.codes[1].code.textContent = "updated code";
    await state.codes[1].click();
    state.location.href = "https://example.org/second/#part";
    await state.url.click();
    assert.deepEqual(state.copied, ["first code\n", "updated code", state.location.href]);
    assert.equal(state.url.status.textContent, "Nokopēts");
});

test("clipboard failure replaces only that control's feedback", async () => {
    const state = controls();
    state.initialize();
    await state.codes[0].click();
    await state.codes[1].click();
    const lifetime = [...state.timers.values()][0].deadline;
    state.advance(lifetime / 2);
    state.fail();
    await state.codes[0].click();
    assert.equal(state.codes[0].dataset.feedback, "Neizdevās");
    assert.equal(state.codes[0].status.textContent, "Neizdevās");
    assert.equal(state.codes[1].status.textContent, "Nokopēts");
    state.advance(lifetime / 2);
    assert.equal(state.codes[1].status.textContent, "");
    assert.equal(state.codes[1].dataset.feedback, undefined);
    assert.equal(state.codes[0].status.textContent, "Neizdevās");
    state.advance(lifetime / 2);
    assert.equal(state.codes[0].status.textContent, "");
    assert.equal(state.codes[0].dataset.feedback, undefined);
});

test("overlapping copy completions give replacement feedback its full lifetime", async () => {
    const pending = [];
    const state = controls(() => new Promise(resolve => pending.push(resolve)));
    state.initialize();
    const first = state.url.click();
    const second = state.url.click();
    pending[0]();
    await first;
    const lifetime = [...state.timers.values()][0].deadline;
    state.advance(lifetime / 2);
    pending[1]();
    await second;
    state.advance(lifetime / 2);
    assert.equal(state.url.status.textContent, "Nokopēts");
    assert.equal(state.url.dataset.feedback, "Nokopēts");
    state.advance(lifetime / 2);
    assert.equal(state.url.status.textContent, "");
    assert.equal(state.url.dataset.feedback, undefined);
});
