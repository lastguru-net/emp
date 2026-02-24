// Bundled by content/utils/js.njk
document.addEventListener("DOMContentLoaded", () => {
    const areaEl = document.getElementById("right-area");
    const barEl = document.getElementById("top-bar");
    if (!areaEl || !barEl) return;

    // rAF-based throttling to reduce work on frequent scroll events
    let ticking = false;
    areaEl.addEventListener(
        "scroll",
        () => {
            if (!ticking) {
                ticking = true;
                window.requestAnimationFrame(() => {
                    // read scrollTop here so we get the latest value at frame time
                    const scrollTop = areaEl.scrollTop;
                    if (scrollTop >= 45) {
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