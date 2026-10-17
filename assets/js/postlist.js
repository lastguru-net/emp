export const validatePostlist = (data) => {
    const pagination = data?.pagination;
    if (!data || !Array.isArray(data.items) || !pagination || !Number.isSafeInteger(pagination.totalPages) || pagination.totalPages < 0) {
        throw new Error("Invalid postlist response");
    }
    const { page, totalPages } = pagination;
    if (totalPages === 0 ? page !== null || data.items.length !== 0 : !Number.isSafeInteger(page) || page < 1 || page > totalPages || data.items.length === 0) {
        throw new Error("Invalid postlist pagination");
    }
    for (const item of data.items) {
        if (!item || typeof item.title !== "string" || typeof item.url !== "string" || !item.url) {
            throw new Error("Invalid postlist item");
        }
    }
    return data;
};

export const mountPostlist = (root, renderCard, renderPagination) => {
    const context = JSON.parse(root.querySelector(".postlist-options").textContent);
    const strings = context.sitestrings[context.siteconfig.lang];
    const status = root.querySelector(".postlist-status");
    const items = root.querySelector(".postlist-items");
    const nav = root.querySelector(".postpagination");
    let pending = null;
    let controller;

    const pageUrl = (number) => {
        const url = new URL(location.href);
        url.searchParams.set("page", number);
        return url.pathname + url.search + url.hash;
    };

    const selectedPage = () => {
        const page = Number(new URL(location.href).searchParams.get("page"));
        return Number.isSafeInteger(page) && page > 0 ? page : Number(root.dataset.initialPage);
    };

    const show = async (page, focus = false, updateHistory = true) => {
        if (pending === page) return;
        controller?.abort();
        const request = controller = new AbortController();
        pending = page;
        status.hidden = true;
        try {
            // The build supplies the read directory with its trailing slash.
            const response = await fetch(root.dataset.postlistUrl + page + ".json", { signal: request.signal });
            if (!response.ok) throw new Error("Postlist HTTP " + response.status);
            const data = validatePostlist(await response.json());
            if (request.signal.aborted) return;
            // Render cards and pagination before updating the page, so a rendering error leaves it intact.
            const html = data.items.map((item) => renderCard(item, context)).join("");
            const controls = renderPagination(data.pagination, pageUrl, context);
            const destination = pageUrl(data.pagination.page ?? 1);
            if (updateHistory && destination !== location.pathname + location.search + location.hash) {
                history.pushState(null, "", destination);
            } else if (!updateHistory && data.pagination.page !== page && new URL(location.href).searchParams.has("page")) {
                history.replaceState(history.state, "", destination);
            }
            items.innerHTML = html;
            nav.innerHTML = controls;
            status.textContent = data.items.length ? "" : strings.postlist_empty;
            status.hidden = Boolean(data.items.length);
            if (focus) items.focus();
        } catch {
            if (request.signal.aborted) return;
            status.textContent = strings.postlist_error;
            status.hidden = false;
        } finally {
            if (!request.signal.aborted) pending = null;
        }
    };
    const navigate = (event) => {
        const link = event.target.closest("a");
        if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        show(Number(new URL(link.href).searchParams.get("page")), true);
    };
    nav.addEventListener("click", navigate);
    window.addEventListener("popstate", () => show(selectedPage(), true, false));
    show(selectedPage(), false, false);
};
