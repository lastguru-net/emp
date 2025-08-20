import { slideLeftSidebar } from "./ui";
import { copyUrlToClipboard } from "./utils";

window.slideLeftSidebar = function () {
    slideLeftSidebar();
};

window.copyUrlToClipboard = function () {
    copyUrlToClipboard();
};

document.addEventListener("DOMContentLoaded", function () {
    const sections = document.querySelectorAll(".content h2,.content h3");
    const hash = window.location.hash;

    document
        .getElementById("right-area")
        .addEventListener("scroll", function () {
            {
                const areaEl = document.getElementById("right-area");
                const barEl = document.getElementById("top-bar");
                const scrollTop = areaEl.scrollTop;

                const currentHeading =
                    sections.length -
                    [...sections].reverse().findIndex((section) => {
                        return section.offsetTop - 45 <= scrollTop;
                    }) -
                    1;

                if (scrollTop >= 45) {
                    barEl.classList.add("hide");
                } else {
                    barEl.classList.remove("hide");
                }
            }
        });
});