// Bundled by content/utils/js.njk
// Sidebar toggle and swipe-to-close gesture
window.slideLeftSidebar = () => {
    const elSidebar = document.getElementById("sidebar");
    if (elSidebar) {
        elSidebar.classList.toggle("is-closed");
    }
};

document.addEventListener("DOMContentLoaded", () => {
    const elSidebar = document.getElementById("sidebar");
    if (!elSidebar) return;

    const SWIPE_THRESHOLD = 50;
    let startX = 0;
    let startY = 0;
    let tracking = false;

    const isOpenMobile = () =>
        !elSidebar.classList.contains("is-closed") &&
        window.matchMedia("(max-width: 639px)").matches;

    elSidebar.addEventListener("touchstart", (e) => {
        if (!isOpenMobile()) return;
        const t = e.touches[0];
        if (!t) return;
        startX = t.clientX;
        startY = t.clientY;
        tracking = true;
    }, { passive: true });

    elSidebar.addEventListener("touchmove", (e) => {
        if (!tracking || !isOpenMobile()) return;
        const t = e.touches[0];
        if (!t) return;
        const dx = t.clientX - startX;
        const dy = Math.abs(t.clientY - startY);
        if (dx < -SWIPE_THRESHOLD && dy < SWIPE_THRESHOLD) {
            tracking = false;
            elSidebar.classList.add("is-closed");
        }
    }, { passive: true });

    elSidebar.addEventListener("touchend", () => {
        tracking = false;
    }, { passive: true });
});