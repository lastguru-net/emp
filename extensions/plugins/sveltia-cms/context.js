// Stock Sveltia's cache identifies the provider and user, but not its issuer.
// Keep incompatible contexts out of that cache while an editor remains alive.
const createCmsContext = (context, providerSessionKey) => {
    const metadataKey = "emp.cms.session";
    const userKey = "sveltia-cms.user";
    const read = () => {
        try { return JSON.parse(localStorage.getItem(metadataKey)); } catch { return null; }
    };
    return {
        isCurrent: () => read()?.context === context,
        async write(save) {
            const same = read()?.context === context;
            const keys = [metadataKey, userKey, ...(providerSessionKey ? [providerSessionKey] : [])];
            const snapshot = key => {
                const raw = localStorage.getItem(key);
                if (!same) return raw;
                try {
                    const value = JSON.parse(raw);
                    if (key === userKey) return JSON.stringify([value?.backendName, value?.id, value?.token, value?.refreshToken]);
                    const session = key === metadataKey ? value?.session : value;
                    if (!session || typeof session !== "object") return raw;
                    const { user, ...credentials } = session;
                    return JSON.stringify(key === metadataKey ? { ...value, session: credentials } : credentials);
                } catch { return raw; }
            };
            const before = keys.map(snapshot);
            // Even same-context writes join the lock: otherwise an incompatible
            // writer in another tab could replace the context between reads.
            return navigator.locks.request("emp.cms.active", { mode: same ? "shared" : "exclusive", ifAvailable: true }, lock => {
                if (!lock) {
                    sessionStorage.setItem("emp.cms.error", "busy");
                    throw Object.assign(new Error("Close other content-manager tabs before changing the CMS configuration."), { code: "CMS_CONTEXT_BUSY" });
                }
                if (keys.some((key, index) => snapshot(key) !== before[index])) {
                    throw new Error("The sign-in session changed. Please try again.");
                }
                return save();
            });
        },
        hold(callback) {
            return navigator.locks.request("emp.cms.active", { mode: "shared" }, async () => {
                if (read()?.context !== context) return false;
                await callback();
                // A frozen history entry must not resume outside the lock.
                // Keep exclusion while frozen, then reload on restoration.
                window.addEventListener("pageshow", event => { if (event.persisted) location.reload(); });
                await new Promise(resolve => window.addEventListener("pagehide", event => {
                    if (!event.persisted) resolve();
                }));
                return true;
            });
        },
    };
};
