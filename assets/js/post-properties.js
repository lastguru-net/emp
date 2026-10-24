// Bind shared HTML helpers for build-time and browser rendering.
export const createPostPropertiesRenderer = ({ escapeHtml, renderIcon }) => {
    const formatNumber = (value, lang) => new Intl.NumberFormat(lang || "en").format(value);

    const renderDecorations = ({ badges = [], metrics = [], actions = [] }, context, item) => {
        const postUrl = item.url;
        const dynamic = Boolean(context.siteelements?.features?.liveMetricsActions && postUrl);
        if (!badges.length && !metrics.length && !actions.length && !dynamic) return "";

        const badgeMarkup = badges.length
            ? `<div class="postbadges">${badges.map((badge) => `<span class="postbadge" data-variant="${escapeHtml(badge?.variant || "neutral")}">${escapeHtml(badge?.label)}</span>`).join(" ")}</div>`
            : "";

        const liveMarkup = dynamic ? "" : renderMetricsActions({ metrics, actions }, context);
        const binding = dynamic ? ` data-metrics-actions-url="${escapeHtml((context.siteconfig?.jsonReadPrefix || "").replace(/\/+$/, "") + postUrl)}"` : "";
        const className = badgeMarkup || liveMarkup ? ' class="postdecorations"' : "";
        return `<div${className}${binding}>${badgeMarkup}${liveMarkup}</div>`;
    };

    const renderMetricsActions = ({ metrics = [], actions = [] }, context = {}) => {
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
                if (action.href && !action.disabled) return `<a class="postaction" href="${escapeHtml(action.href)}"${action.external ? ' target="_blank" rel="noopener"' : ""} data-variant="${variant}">${contents}</a>`;
                return `<button class="postaction" type="button" data-variant="${variant}"${action?.disabled ? " disabled" : ""}>${contents}</button>`;
            }).join(" ")}</div>`
            : "";

        return metricMarkup + actionMarkup;
    };

    const renderProperties = (item = {}, context = {}) => {
        const properties = item.properties || {};
        const { author, place, tags = [], readingTime } = properties;
        const strings = context?.sitestrings?.[context?.siteconfig?.lang] || {};

        const dateMarkup = properties.date
            ? `<div class="postdate">${renderIcon("calendar", context.inlinesvg)}${escapeHtml(properties.date)}</div>`
            : "";
        const authorMarkup = author?.name && author.url
            ? `<div class="postauthor"><a href="${escapeHtml(author.url)}" aria-label="${escapeHtml(strings.posts_by)} ${escapeHtml(author.name)}">${renderIcon("author", context.inlinesvg)}${escapeHtml(author.name)}</a></div>`
            : "";
        const placeMarkup = place?.name
            ? `<div class="postplace${place.address ? " placetip" : ""}"${place.address ? ` data-address="${escapeHtml(place.address)}"` : ""}>${renderIcon("map", context.inlinesvg)}${escapeHtml(place.name)}</div>`
            : "";
        const tagMarkup = tags.map((tag) => {
            return `<div class="posttag"><a href="${escapeHtml(tag.url)}" aria-label="${escapeHtml(strings.posts_tagged)} ${escapeHtml(tag.name)}">${renderIcon(tag.icon || "hashtag", context.inlinesvg)}${escapeHtml(tag.name)}</a></div>`;
        }).join("");
        const readingTimeMarkup = readingTime?.label
            ? `<div class="readingtime"${readingTime.wordsLabel ? ` data-words="${escapeHtml(readingTime.wordsLabel)}"` : ""}>${renderIcon("readingTime", context.inlinesvg)}${escapeHtml(readingTime.label)}</div>`
            : "";
        const propertyMarkup = `<div class="postproperties">${dateMarkup}${authorMarkup}${placeMarkup}${tagMarkup}${readingTimeMarkup}</div>`;

        return propertyMarkup + renderDecorations(properties.decorations || {}, context, item);
    };

    return { renderProperties, renderMetricsActions };
};
