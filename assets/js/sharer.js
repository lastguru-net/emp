// Bundled by content/utils/js.njk
// Share button: copy current URL to clipboard with accessible feedback
document.addEventListener("DOMContentLoaded", () => {
    const button = document.querySelector("[data-copy-url]");

    if (button) {
        button.disabled = false;
        button.removeAttribute("aria-hidden");
        button.classList.remove("copy-url-pending");
    }
});

let copyUrlFeedbackTimer;

window.copyUrlToClipboard = async (button) => {
    const status = document.getElementById("copy-link-status");

    window.clearTimeout(copyUrlFeedbackTimer);
    status.textContent = "";
    delete button.dataset.feedback;
    let message;

    try {
        await navigator.clipboard.writeText(location.href);
        message = button.dataset.copySuccess;
    } catch {
        message = button.dataset.copyError;
    }

    status.textContent = message;
    button.dataset.feedback = message;
    copyUrlFeedbackTimer = window.setTimeout(() => {
        status.textContent = "";
        delete button.dataset.feedback;
    }, 2000);
};