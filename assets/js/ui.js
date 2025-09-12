const slideLeftSidebar = () => {
    const elSidebar = document.getElementById("sidebar");
    if (elSidebar) {
        elSidebar.classList.toggle("is-closed");
    }
};

export { slideLeftSidebar };