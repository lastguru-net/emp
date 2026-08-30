// Bundled by content/utils/js.njk
// Share button: copy current URL to clipboard with accessible feedback
document.addEventListener("DOMContentLoaded", () => {
    document.querySelector("[data-copy-url]").hidden = false;
});

window.copyUrlToClipboard = async (button) => {
    const status = document.getElementById("copy-link-status");

    status.textContent = "";
    button.removeAttribute("data-feedback");

    try {
        await navigator.clipboard.writeText(location.href);
        status.textContent = button.dataset.copySuccess;
        button.setAttribute("data-feedback", button.dataset.copySuccess);
    } catch {
        status.textContent = button.dataset.copyError;
        button.setAttribute("data-feedback", button.dataset.copyError);
    }
};