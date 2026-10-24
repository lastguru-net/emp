const HTML_ESCAPES = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
};

export const html = {
    escapeHtml: (value) => String(value ?? "").replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]),

    renderIcon: (name, icons, className = "") => {
        const icon = icons?.[name];
        if (!icon) return "";
        const classAttribute = className ? ` class="${html.escapeHtml(className)}"` : "";
        return `<svg${classAttribute} aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="${html.escapeHtml(icon.viewBox)}"><path d="${html.escapeHtml(icon.path)}" /></svg>`;
    }
};
