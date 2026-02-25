// Bundled by content/utils/js.njk
// Auto-hide top bar on scroll (document-level scroll everywhere)
document.addEventListener("DOMContentLoaded", () => {
    const barEl = document.getElementById("top-bar");
    if (!barEl) return;

    // rAF-based throttling to reduce work on frequent scroll events
    let ticking = false;
    window.addEventListener(
        "scroll",
        () => {
            if (!ticking) {
                ticking = true;
                window.requestAnimationFrame(() => {
                    if (window.scrollY >= 45) {
                        barEl.classList.add("hide");
                    } else {
                        barEl.classList.remove("hide");
                    }
                    ticking = false;
                });
            }
        },
        { passive: true }
    );
});