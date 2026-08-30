// Bundled by content/utils/js.njk
const escapeHtml = (value = "") => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const maxResults = 8;
const minQueryLength = 2;
let searchStrings = {};

let searchRoot = null;
let searchInput = null;
let searchResults = null;
let searchStatus = null;
let searchOpener = null;

let isInitialized = false;
let miniSearch = null;

const renderResults = (query) => {
    const q = String(query).trim();

    if (q.length < minQueryLength) {
        searchResults.innerHTML = "";
        searchStatus.textContent = "";
        return;
    }

    const found = miniSearch
        .search(q, {
            prefix: true,
            fuzzy: 0.2
        })
        .slice(0, maxResults);

    if (!found.length) {
        searchResults.innerHTML = '<div class="search-empty">' + escapeHtml(searchStrings.noResults) + "</div>";
        searchStatus.textContent = searchStrings.noResultsStatus.replace("{query}", q);
        return;
    }

    searchStatus.textContent = (found.length === 1 ? searchStrings.result : searchStrings.results)
        .replace("{count}", found.length)
        .replace("{query}", q);

    searchResults.innerHTML = found.map((result) => {
        const title = result.title;
        const excerpt = result.excerpt;
        const url = result.url;
        const tags = result.tags;
        const meta = tags.length ? tags.join(" · ") : "";

        return '<a class="search-result-item" href="' + escapeHtml(url) + '">' +
                '<div class="search-result-title">' + escapeHtml(title) + "</div>" +
                (excerpt ? '<div class="search-result-excerpt">' + escapeHtml(excerpt) + "</div>" : "") +
                (meta ? '<div class="search-result-meta">' + escapeHtml(meta) + "</div>" : "") +
            "</a>";
    }).join("");
};

const loadIndex = async () => {
    const miniSearchModule = await import(miniSearchUrl);
    const response = await fetch(indexUrl, { credentials: "same-origin" });
    const payload = await response.json();
    searchStrings = payload.strings;
    miniSearch = miniSearchModule.default.loadJS(payload.index, payload.options);
};

const initSearch = async () => {
    if (isInitialized) return;

    searchRoot = document.getElementById("search-modal");
    searchInput = document.getElementById("search-input");
    searchResults = document.getElementById("search-results");
    searchStatus = document.getElementById("search-status");

    await loadIndex();
    searchInput.setAttribute("placeholder", searchStrings.placeholder);

    searchInput.addEventListener("input", (event) => {
        renderResults(event.target.value);
    });

    isInitialized = true;
};

window.closeSearchModal = () => {
    if (searchRoot.classList.contains("hidden")) return;

    searchRoot.classList.add("hidden");
    document.body.classList.remove("search-open");
    searchOpener.focus();
    searchOpener = null;
};

window.openSearchModal = () => {
    searchOpener = document.activeElement;
    searchRoot.classList.remove("hidden");
    document.body.classList.add("search-open");
    searchInput.focus();
    searchInput.select();
};

document.addEventListener("keydown", (event) => {
    if (!searchRoot || searchRoot.classList.contains("hidden")) return;

    if (event.key === "Escape") {
        event.preventDefault();
        window.closeSearchModal();
        return;
    }

    if (event.key === "Tab") {
        const focusable = [...searchRoot.querySelectorAll(
            'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )].filter((element) => !element.hidden && element.getClientRects().length);

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;

        if (event.shiftKey && (active === first || !searchRoot.contains(active))) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && (active === last || !searchRoot.contains(active))) {
            event.preventDefault();
            first.focus();
        }
    }
});

window.searchButton = async () => {
    await initSearch();
    window.openSearchModal();
};