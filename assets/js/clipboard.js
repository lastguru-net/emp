// Bundled by content/utils/js.njk
// Progressive copy controls share feedback behavior, with a timer per button.
document.addEventListener("DOMContentLoaded", () => {
    const bindCopyButton = (button, getText, status, pendingClass) => {
        let feedbackTimer;
        button.disabled = false;
        button.removeAttribute("aria-hidden");
        button.classList.remove(pendingClass);

        button.addEventListener("click", async () => {
            status.textContent = "";
            delete button.dataset.feedback;
            let message;
            try {
                await navigator.clipboard.writeText(getText());
                message = button.dataset.copySuccess;
            } catch {
                message = button.dataset.copyError;
            }
            window.clearTimeout(feedbackTimer);
            status.textContent = message;
            button.dataset.feedback = message;
            feedbackTimer = window.setTimeout(() => {
                status.textContent = "";
                delete button.dataset.feedback;
            }, 2000);
        });
    };

    for (const button of document.querySelectorAll(".code-block-copy")) {
        const header = button.parentElement;
        const code = header.parentElement.querySelector("pre code");
        bindCopyButton(button, () => code.textContent, header.querySelector("[role=status]"), "code-block-copy-pending");
    }
    for (const button of document.querySelectorAll("[data-copy-url]")) {
        bindCopyButton(button, () => location.href, document.getElementById(button.getAttribute("aria-describedby")), "copy-url-pending");
    }
});
