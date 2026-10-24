// Both postlist providers use the same card markup.
export const createPostCardRenderer = ({ escapeHtml, renderIcon }, renderProperties) => {
    const renderThumbnail = (item, context) => {
        const thumbnail = item.thumbnail;
        const sizes = thumbnail.sizes || "(max-width: 640px) 100vw, 480px";
        const sources = (thumbnail.sources || []).map((source) =>
            `<source type="${escapeHtml(source.type)}" srcset="${escapeHtml(source.srcset)}" sizes="${escapeHtml(sizes)}">`
        ).join("");
        const { src, srcset, width, height } = thumbnail;
        const dimensions = `${width ? ` width="${escapeHtml(width)}"` : ""}${height ? ` height="${escapeHtml(height)}"` : ""}`;
        const lqip = context.siteelements?.features?.lqip && thumbnail.lqip != null;
        const img = `<img class="postthumb${lqip ? " lqip" : ""}"${lqip ? ` style="--lqip:${escapeHtml(thumbnail.lqip)}"` : ""} src="${escapeHtml(src)}"${srcset ? ` srcset="${escapeHtml(srcset)}" sizes="${escapeHtml(sizes)}"` : ""}${dimensions} alt="${escapeHtml(item.title)}" loading="lazy" decoding="async" eleventy:ignore>`;
        const picture = sources ? `<picture>${sources}${img}</picture>` : img;
        return `<a class="postthumblink" href="${escapeHtml(item.url)}" aria-label="${escapeHtml(item.title)}">${picture}</a>`;
    };

    const renderCard = (item = {}, context = {}) => {
        const features = context?.siteelements?.features || {};
        const thumbnailEnabled = Boolean(features.postlistThumbnail && item.thumbnail);
        const thumbnailRight = features.postlistThumbnail === "right";
        const cardClasses = `postlistitem${item.pinned ? " pinned" : ""}${thumbnailRight ? " thumb-right" : ""}`;
        const pinned = item.pinned
            ? `<span class="pinned-badge">${renderIcon("pin", context.inlinesvg, "pin-icon")}<span class="sr-only">${escapeHtml(context?.sitestrings?.[context?.siteconfig?.lang]?.pinned_badge)}</span></span>`
            : "";
        const heading = `<div class="postlistheading"><a href="${escapeHtml(item.url)}" aria-label="${escapeHtml(item.title)}">${pinned}${pinned ? " " : ""}${escapeHtml(item.title)}</a></div>`;
        const excerpt = `<div class="postexcerpt">${escapeHtml(item.excerpt)}</div>`;
        const properties = features.postproperties ? renderProperties(item, context) : "";

        if (!thumbnailEnabled) return `<div class="${cardClasses}">${heading}${excerpt}${properties}</div>`;
        const rowClasses = `postlistrow${thumbnailRight ? " thumb-right" : ""}`;
        return `<div class="${cardClasses}">${heading}<div class="${rowClasses}">${renderThumbnail(item, context)}<div class="postlistside">${excerpt}${properties}</div></div></div>`;
    };

    return renderCard;
};
