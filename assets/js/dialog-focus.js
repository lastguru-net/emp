// Native dialogs make the page inert, but Tab can still move into browser chrome.
document.addEventListener("keydown", (event) => {
    if (event.key !== "Tab" || event.ctrlKey || event.altKey || event.metaKey) return;
    const dialog = event.target.closest("dialog:modal");
    if (!dialog) return;

    const controls = [...dialog.querySelectorAll("a[href], button, input, select, textarea, [tabindex]")]
        .filter(control => control.tabIndex >= 0 && !control.matches(":disabled") && control.getClientRects().length);
    const first = controls[0];
    const last = controls.at(-1);
    if (event.target === (event.shiftKey ? first : last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
    }
});
