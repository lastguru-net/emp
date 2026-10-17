const validateMetricsActions = (data) => {
    if (!data || !Array.isArray(data.metrics) || !Array.isArray(data.actions)) {
        throw new Error("Invalid metrics/actions response");
    }
    for (const item of [...data.metrics, ...data.actions]) {
        if (!item || typeof item.label !== "string") {
            throw new Error("Invalid metric/action item");
        }
    }
    return data;
};

// Initialize each static region once; refreshes use the same fetch/render path.
export const mountMetricsActions = (root, renderMetricsActions, context) => {
    const endpoint = root.dataset.metricsActionsUrl.split(/[?#]/, 1)[0].replace(/\/$/, "") + "/metrics-actions.json";
    let revision = 0;
    const refresh = async () => {
        const current = ++revision;
        if (!root.isConnected) return;
        try {
            const response = await fetch(endpoint);
            if (!response.ok) throw new Error("Metrics/actions HTTP " + response.status);
            const data = validateMetricsActions(await response.json());
            if (current !== revision || !root.isConnected) return;
            const html = renderMetricsActions(data, context);
            root.querySelectorAll(":scope > .postmetrics, :scope > .postactions").forEach(group => group.remove());
            root.insertAdjacentHTML("beforeend", html);
            root.classList.toggle("postdecorations", root.children.length > 0);
        } catch {
            // Keep the last valid presentation, or the empty initial region.
        }
    };
    root.addEventListener("metricsactions:refresh", refresh);
    refresh();
};
