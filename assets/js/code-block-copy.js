// Bundled by content/utils/js.njk
// Progressive copy controls for fenced code blocks
document.addEventListener("DOMContentLoaded", () => {
    for (const button of document.querySelectorAll(".code-block-copy")) {
        const header = button.parentElement;
        const status = header.querySelector("[role=status]");
        const code = header.parentElement.querySelector("pre code");
        let feedbackTimer;

        button.disabled = false;
        button.removeAttribute("aria-hidden");
        button.classList.remove("code-block-copy-pending");

        button.addEventListener("click", async () => {
            window.clearTimeout(feedbackTimer);
            status.textContent = "";
            delete button.dataset.feedback;
            let message;

            try {
                await navigator.clipboard.writeText(code.textContent);
                message = button.dataset.copySuccess;
            } catch {
                message = button.dataset.copyError;
            }

            status.textContent = message;
            button.dataset.feedback = message;
            feedbackTimer = window.setTimeout(() => {
                status.textContent = "";
                delete button.dataset.feedback;
            }, 2000);
        });
    }
});