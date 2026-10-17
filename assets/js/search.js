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
let initialization = null;
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

        return '<a class="dialog-item" href="' + escapeHtml(url) + '">' + escapeHtml(title) +
                (excerpt ? '<div class="search-result-excerpt">' + escapeHtml(excerpt) + "</div>" : "") +
                (meta ? '<div class="search-result-meta">' + escapeHtml(meta) + "</div>" : "") +
            "</a>";
    }).join("");
};

const initSearch = () => {
    if (initialization) return initialization;

    initialization = (async () => {
        searchRoot = document.getElementById("search-modal");
        searchInput = document.getElementById("search-input");
        searchResults = document.getElementById("search-results");
        searchStatus = document.getElementById("search-status");

        const [miniSearchModule, response] = await Promise.all([
            import(miniSearchUrl),
            fetch(indexUrl, { credentials: "same-origin" }),
        ]);
        const payload = await response.json();
        searchStrings = payload.strings;
        miniSearch = miniSearchModule.default.loadJS(payload.index, payload.options);
        searchInput.setAttribute("placeholder", searchStrings.placeholder);
        searchInput.addEventListener("input", (event) => {
            renderResults(event.target.value);
        });
        // Search inputs otherwise consume Escape to clear the query first.
        searchInput.addEventListener("keydown", (event) => {
            if (event.key !== "Escape") return;
            event.preventDefault();
            searchRoot.close();
        });
    })().catch((error) => {
        initialization = null;
        throw error;
    });
    return initialization;
};

window.searchButton = async () => {
    await initSearch();
    if (searchRoot.open) return;
    searchRoot.showModal();
    searchInput.select();
};
