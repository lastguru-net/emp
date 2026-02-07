// Bundled by content/utils/js.njk
window.copyUrlToClipboard = async () => {
    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
        return Promise.reject(new Error("Clipboard API not available"));
    }
    return navigator.clipboard.writeText(location.href);
};