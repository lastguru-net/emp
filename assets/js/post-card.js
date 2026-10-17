// Public paths already include the deployment prefix.
export const jsonReadUrl = (url, prefix = "") => prefix.replace(/\/+$/, "") + url;

const HTML_ESCAPES = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
};

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);

const safeUrl = (value, { allowMailto = false } = {}) => {
    if (typeof value !== "string") return "";
    const url = value.trim();
    if (!url || /[\u0000-\u001f\u007f]/.test(url) || url.includes("\\")) return "";
    if (url.startsWith("//")) return "";
    if (/^https?:\/\//i.test(url)) return url;
    if (allowMailto && /^mailto:/i.test(url)) return url;
    if (/^[a-z][a-z\d+.-]*:/i.test(url)) return "";
    return url;
};

const isPathWithin = (pathname, basePathname) => {
    const base = basePathname.replace(/\/+$/, "") || "/";
    return base === "/" || pathname === base || pathname.startsWith(base + "/");
};

const isExternalUrl = (href, context) => {
    if (!/^https?:\/\//i.test(href)) return false;
    let target;
    try {
        target = new URL(href);
    } catch {
        return false;
    }

    const internalUrls = [context?.siteconfig?.url, ...(Array.isArray(context?.siteconfig?.internalUrls) ? context.siteconfig.internalUrls : [])];
    return !internalUrls.some((candidate) => {
        if (typeof candidate !== "string" || !candidate) return false;
        try {
            const internal = new URL(candidate);
            return target.origin === internal.origin && isPathWithin(target.pathname, internal.pathname);
        } catch {
            return false;
        }
    });
};

const linkAttributes = (value, context, { fallback = "", allowMailto = true } = {}) => {
    const href = safeUrl(value, { allowMailto }) || fallback;
    if (!href) return "";
    const external = isExternalUrl(href, context) ? ' target="_blank" rel="noopener"' : "";
    return ` href="${escapeHtml(href)}"${external}`;
};

const safeSrcset = (value) => {
    if (typeof value !== "string") return "";
    const candidates = value.split(",").map((candidate) => {
        const parts = candidate.trim().split(/\s+/);
        if (parts.length < 1 || parts.length > 2) return "";
        const url = safeUrl(parts[0]);
        if (!url || (parts[1] && !/^\d+(?:\.\d+)?[wx]$/.test(parts[1]))) return "";
        return parts[1] ? `${url} ${parts[1]}` : url;
    }).filter(Boolean);
    return candidates.join(", ");
};

const renderIcon = (name, icons, className = "") => {
    if (typeof name !== "string" || !icons || typeof icons !== "object") return "";
    const icon = icons[name];
    if (!icon || typeof icon !== "object" || typeof icon.viewBox !== "string" || typeof icon.path !== "string") return "";
    const classAttribute = className ? ` class="${escapeHtml(className)}"` : "";
    return `<svg${classAttribute} aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="${escapeHtml(icon.viewBox)}"><path d="${escapeHtml(icon.path)}" /></svg>`;
};

const formatNumber = (value, lang) => new Intl.NumberFormat(lang || "en").format(value);

// pageUrl returns an HTML page URL, not a JSON data URL.
export const renderPagination = ({ page, totalPages }, pageUrl, context) => {
    if (totalPages < 2) return "";
    const strings = context.sitestrings[context.siteconfig.lang];
    const links = [];
    const add = (number, label, icon) => {
        const current = number === page;
        links.push(`<li><div${current ? ' class="active"' : ""}><a class="${icon ? "chevron-icon" : "page-number"}"${linkAttributes(pageUrl(number), context)} aria-label="${escapeHtml(label)}">${icon ? renderIcon(icon, context.inlinesvg) || number : number}</a></div></li>`);
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

const renderDecorations = (decorations = {}, context, item) => {
    const badges = Array.isArray(decorations.badges) ? decorations.badges : [];
    const metrics = Array.isArray(decorations.metrics) ? decorations.metrics : [];
    const actions = Array.isArray(decorations.actions) ? decorations.actions : [];
    const postUrl = safeUrl(item.url);
    const dynamic = Boolean(context.siteelements?.features?.liveMetricsActions && postUrl);
    if (!badges.length && !metrics.length && !actions.length && !dynamic) return "";

    const badgeMarkup = badges.length
        ? `<div class="postbadges">${badges.map((badge) => `<span class="postbadge" data-variant="${escapeHtml(badge?.variant || "neutral")}">${escapeHtml(badge?.label)}</span>`).join(" ")}</div>`
        : "";

    const liveMarkup = dynamic ? "" : renderMetricsActions({ metrics, actions }, context);
    const binding = dynamic ? ` data-metrics-actions-url="${escapeHtml(jsonReadUrl(postUrl, context.siteconfig?.jsonReadPrefix))}"` : "";
    const className = badgeMarkup || liveMarkup ? ' class="postdecorations"' : "";
    return `<div${className}${binding}>${badgeMarkup}${liveMarkup}</div>`;
};

export const renderMetricsActions = ({ metrics = [], actions = [] }, context = {}) => {
    const metricMarkup = metrics.length
        ? `<dl class="postmetrics">${metrics.map((metric) => {
            const hasValue = Number.isFinite(metric?.value);
            const hasMax = Number.isFinite(metric?.max);
            const values = `${hasValue ? formatNumber(metric.value, context?.siteconfig?.lang) : ""}${hasValue && hasMax ? " / " : ""}${hasMax ? formatNumber(metric.max, context?.siteconfig?.lang) : ""}`;
            let progress = "";
            if (metric?.progress && hasValue && hasMax && metric.max > 0) {
                const progressValue = Math.min(Math.max(metric.value, 0), metric.max);
                progress = `<progress value="${escapeHtml(progressValue)}" max="${escapeHtml(metric.max)}" aria-label="${escapeHtml(metric.label)}"></progress>`;
            }
            return `<div class="postmetric"><dt>${escapeHtml(metric?.label)}</dt><dd>${values}${progress}</dd></div>`;
        }).join(" ")}</dl>`
        : "";

    const actionMarkup = actions.length
        ? `<div class="postactions">${actions.map((action) => {
            const variant = escapeHtml(action?.variant || "neutral");
            const icon = renderIcon(action?.icon, context?.inlinesvg);
            const contents = `${icon}<span>${escapeHtml(action?.label)}</span>`;
            const hrefAttributes = action?.disabled ? "" : linkAttributes(action?.href, context);
            if (hrefAttributes) return `<a class="postaction"${hrefAttributes} data-variant="${variant}">${contents}</a>`;
            return `<button class="postaction" type="button" data-variant="${variant}"${action?.disabled ? " disabled" : ""}>${contents}</button>`;
        }).join(" ")}</div>`
        : "";

    return metricMarkup + actionMarkup;
};

export const renderProperties = (item = {}, context = {}) => {
    const properties = item?.properties && typeof item.properties === "object" ? item.properties : {};
    const author = properties.author;
    const place = properties.place;
    const tags = Array.isArray(properties.tags) ? properties.tags : [];
    const readingTime = properties.readingTime;
    const strings = context?.sitestrings?.[context?.siteconfig?.lang] || {};

    const dateMarkup = properties.date
        ? `<div class="postdate">${renderIcon("calendar", context.inlinesvg)}${escapeHtml(properties.date)}</div>`
        : "";
    const authorHref = linkAttributes(author?.url, context);
    const authorMarkup = author?.name && authorHref
        ? `<div class="postauthor"><a${authorHref} aria-label="${escapeHtml(strings.posts_by)} ${escapeHtml(author.name)}">${renderIcon("author", context.inlinesvg)}${escapeHtml(author.name)}</a></div>`
        : "";
    const placeMarkup = place?.name
        ? `<div class="postplace${place.address ? " placetip" : ""}"${place.address ? ` data-address="${escapeHtml(place.address)}"` : ""}>${renderIcon("map", context.inlinesvg)}${escapeHtml(place.name)}</div>`
        : "";
    const tagMarkup = tags.map((tag) => {
        const href = linkAttributes(tag?.url, context);
        if (!tag?.name || !href) return "";
        return `<div class="posttag"><a${href} aria-label="${escapeHtml(strings.posts_tagged)} ${escapeHtml(tag.name)}">${renderIcon(tag.icon || "hashtag", context.inlinesvg)}${escapeHtml(tag.name)}</a></div>`;
    }).join("");
    const readingTimeMarkup = readingTime?.label
        ? `<div class="readingtime"${readingTime.wordsLabel ? ` data-words="${escapeHtml(readingTime.wordsLabel)}"` : ""}>${renderIcon("readingTime", context.inlinesvg)}${escapeHtml(readingTime.label)}</div>`
        : "";
    const propertyMarkup = `<div class="postproperties">${dateMarkup}${authorMarkup}${placeMarkup}${tagMarkup}${readingTimeMarkup}</div>`;

    return propertyMarkup + renderDecorations(properties.decorations || {}, context, item);
};

const renderThumbnail = (item, context) => {
    const thumbnail = item?.thumbnail;
    if (!thumbnail || typeof thumbnail !== "object") return "";
    const src = safeUrl(thumbnail.src);
    if (!src) return "";
    const sizes = typeof thumbnail.sizes === "string" ? thumbnail.sizes : "(max-width: 640px) 100vw, 480px";
    const sources = Array.isArray(thumbnail.sources) ? thumbnail.sources.map((source) => {
        const srcset = safeSrcset(source?.srcset);
        if (!srcset || typeof source?.type !== "string" || !/^image\/[a-z\d.+-]+$/i.test(source.type)) return "";
        return `<source type="${escapeHtml(source.type)}" srcset="${escapeHtml(srcset)}" sizes="${escapeHtml(sizes)}">`;
    }).join("") : "";
    const srcset = safeSrcset(thumbnail.srcset);
    const dimensions = `${Number.isInteger(thumbnail.width) && thumbnail.width > 0 ? ` width="${thumbnail.width}"` : ""}${Number.isInteger(thumbnail.height) && thumbnail.height > 0 ? ` height="${thumbnail.height}"` : ""}`;
    const lqip = context.siteelements?.features?.lqip && Number.isSafeInteger(thumbnail.lqip);
    const img = `<img class="postthumb${lqip ? " lqip" : ""}"${lqip ? ` style="--lqip:${thumbnail.lqip}"` : ""} src="${escapeHtml(src)}"${srcset ? ` srcset="${escapeHtml(srcset)}" sizes="${escapeHtml(sizes)}"` : ""}${dimensions} alt="${escapeHtml(item.title)}" loading="lazy" decoding="async" eleventy:ignore>`;
    const picture = sources ? `<picture>${sources}${img}</picture>` : img;
    return `<a class="postthumblink"${linkAttributes(item.url, context, { fallback: "#" })} aria-label="${escapeHtml(item.title)}">${picture}</a>`;
};

export const renderCard = (item = {}, context = {}) => {
    const features = context?.siteelements?.features || {};
    const thumbnailEnabled = Boolean(features.postlistThumbnail && item.thumbnail);
    const thumbnailRight = features.postlistThumbnail === "right";
    const cardClasses = `postlistitem${item.pinned ? " pinned" : ""}${thumbnailRight ? " thumb-right" : ""}`;
    const pinned = item.pinned
        ? `<span class="pinned-badge">${renderIcon("pin", context.inlinesvg, "pin-icon")}<span class="sr-only">${escapeHtml(context?.sitestrings?.[context?.siteconfig?.lang]?.pinned_badge)}</span></span>`
        : "";
    const heading = `<div class="postlistheading"><a${linkAttributes(item.url, context, { fallback: "#" })} aria-label="${escapeHtml(item.title)}">${pinned}${pinned ? " " : ""}${escapeHtml(item.title)}</a></div>`;
    const excerpt = `<div class="postexcerpt">${escapeHtml(item.excerpt)}</div>`;
    const properties = features.postproperties ? renderProperties(item, context) : "";

    if (!thumbnailEnabled) return `<div class="${cardClasses}">${heading}${excerpt}${properties}</div>`;
    const rowClasses = `postlistrow${thumbnailRight ? " thumb-right" : ""}`;
    return `<div class="${cardClasses}">${heading}<div class="${rowClasses}">${renderThumbnail(item, context)}<div class="postlistside">${excerpt}${properties}</div></div></div>`;
};
