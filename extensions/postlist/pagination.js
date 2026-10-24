// pageUrl returns an HTML page URL, not a JSON data URL.
export const createPaginationRenderer = ({ escapeHtml, renderIcon }) => ({ page, totalPages }, pageUrl, context) => {
    if (totalPages < 2) return "";
    const strings = context.sitestrings[context.siteconfig.lang];
    const links = [];
    const add = (number, label, icon) => {
        const current = number === page;
        links.push(`<li><div${current ? ' class="active"' : ""}><a class="${icon ? "chevron-icon" : "page-number"}" href="${escapeHtml(pageUrl(number))}" aria-label="${escapeHtml(label)}">${icon ? renderIcon(icon, context.inlinesvg) || number : number}</a></div></li>`);
    };
    if (page > 1) {
        add(1, strings.first_page, "chevronDoubleLeft");
        add(page - 1, strings.previous_page, "chevronLeft");
    }
    const start = Math.max(1, page - 2);
    const end = Math.min(start + 4, totalPages);
    for (let number = start; number <= end; number++) add(number, strings.go_to_page + " " + number);
    if (end < totalPages) {
        add(page + 1, strings.next_page, "chevronRight");
        add(totalPages, strings.last_page, "chevronDoubleRight");
    }
    return `<ul class="pagination">${links.join("")}</ul>`;
};
