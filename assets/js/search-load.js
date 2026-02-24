const escapeHtml = (value = "") => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

let searchRoot = null;
let searchInput = null;
let searchResults = null;

let isInitialized = false;
let miniSearch = null;

const runtimeConfig = {
    indexUrl: cfg.indexUrl,
    maxResults: 8,
    minQueryLength: 2,
    strings: {
        noResults: cfg.noResults,
        placeholder: cfg.placeholder
    }
};

const renderResults = (query) => {
    const q = String(query).trim();

    if (q.length < runtimeConfig.minQueryLength) {
        searchResults.innerHTML = "";
        return;
    }

    const found = miniSearch
        .search(q, {
            prefix: true,
            fuzzy: 0.2
        })
        .slice(0, runtimeConfig.maxResults);

    if (!found.length) {
        searchResults.innerHTML = `<div class="search-empty">${escapeHtml(runtimeConfig.strings.noResults)}</div>`;
        return;
    }

    searchResults.innerHTML = found.map((result) => {
        const title = result.title;
        const excerpt = result.excerpt;
        const url = result.url;
        const tags = result.tags;
        const meta = tags.length ? tags.join(" · ") : "";

        return `
            <a class="search-result-item" href="${escapeHtml(url)}">
                <div class="search-result-title">${escapeHtml(title)}</div>
                ${excerpt ? `<div class="search-result-excerpt">${escapeHtml(excerpt)}</div>` : ""}
                ${meta ? `<div class="search-result-meta">${escapeHtml(meta)}</div>` : ""}
            </a>
        `;
    }).join("");
};

const loadIndex = async () => {
    const miniSearchModule = await import("/assets/js/minisearch.js");
    const response = await fetch(runtimeConfig.indexUrl, { credentials: "same-origin" });
    const payload = await response.json();
    miniSearch = miniSearchModule.default.loadJS(payload.index, payload.options);
};

const initSearch = async () => {
    if (isInitialized) return;

    searchRoot = document.getElementById("search-modal");
    searchInput = document.getElementById("search-input");
    searchResults = document.getElementById("search-results");

    searchInput.setAttribute("placeholder", runtimeConfig.strings.placeholder);
    await loadIndex();

    searchInput.addEventListener("input", (event) => {
        renderResults(event.target.value);
    });

    isInitialized = true;
};

window.closeSearchModal = () => {
    searchRoot.classList.add("hidden");
    document.body.classList.remove("search-open");
};

window.openSearchModal = () => {
    searchRoot.classList.remove("hidden");
    document.body.classList.add("search-open");
    searchInput.focus();
    searchInput.select();
};

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        window.closeSearchModal();
    }
});

window.searchButton = async () => {
    await initSearch();
    window.openSearchModal();
};