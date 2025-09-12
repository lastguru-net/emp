const copyUrlToClipboard = async () => {
    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
        return Promise.reject(new Error("Clipboard API not available"));
    }
    return navigator.clipboard.writeText(location.href);
};

export { copyUrlToClipboard };