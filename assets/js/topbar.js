// Bundled by content/utils/js.njk
// Hide the top bar when the window is scrolled at least 45 pixels
document.addEventListener("DOMContentLoaded", () => {
    const barEl = document.getElementById("top-bar");
    if (!barEl) return;

    const syncState = () => barEl.classList.toggle("hide", window.scrollY >= 45);
    syncState();

    // rAF-based throttling to reduce work on frequent scroll events
    let ticking = false;
    window.addEventListener(
        "scroll",
        () => {
            if (!ticking) {
                ticking = true;
                window.requestAnimationFrame(() => {
                    syncState();
                    ticking = false;
                });
            }
        },
        { passive: true }
    );
});