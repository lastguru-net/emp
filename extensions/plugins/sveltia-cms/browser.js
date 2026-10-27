// Shared-session adapter for Sveltia CMS. Only the stock user cache
// holds credentials; EMP retains configuration, identity and expiry metadata.
const cmsSession = (() => {
    const userKey = "sveltia-cms.user";
    const metadataKey = "emp.cms.session";
    const sessionKey = `emp.${cmsOptions.backendName}.session`;
    const context = JSON.stringify([
        "shared", cmsOptions.backendName, cmsOptions.origin, cmsOptions.clientId,
        cmsOptions.siteUrl, cmsOptions.repo, cmsOptions.branch,
        cmsOptions.scopes,
    ]);
    const guard = createCmsContext(context, sessionKey);
    const listeners = new Set();
    const notify = () => { for (const callback of listeners) callback(); };
    const read = key => {
        try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
    };
    const accountId = metadata => metadata?.accountId ?? (metadata?.session?.user ? Number(metadata.session.user.id) : undefined);
    const store = {
        refreshLock: "sveltia-cms.token-refresh",
        hold: callback => guard.hold(callback),
        getItem() {
            const metadata = read(metadataKey);
            // Existing EMP-only sessions migrate after provider validation. Never
            // treat an unbound CMS cache as evidence of the same site/issuer.
            if (!metadata) return localStorage.getItem(userKey) === null ? localStorage.getItem(sessionKey) : null;
            const cached = read(userKey);
            if (metadata.context !== context || !metadata.session || cached?.backendName !== cmsOptions.backendName ||
                typeof cached.token !== "string" || !cached.token ||
                cached.id !== accountId(metadata)) return null;
            return JSON.stringify({
                ...metadata.session,
                accessToken: cached.token,
                ...(cmsOptions.backendName === "gitlab" ? { refreshToken: cached.refreshToken } : {}),
            });
        },
        setItem(_key, value, profileValidated = false, isCurrent = () => true) {
            const { accessToken, refreshToken, ...session } = JSON.parse(value);
            const metadata = read(metadataKey);
            // Failed identity checks and pre-profile rotations must not migrate
            // an EMP-only login into CMS before the provider validates its owner.
            if (!profileValidated && (metadata?.context !== context || !metadata.session)) {
                if (!isCurrent()) return false;
                if (localStorage.getItem(sessionKey) !== null) localStorage.setItem(sessionKey, value);
                return;
            }
            return guard.write(() => {
                if (!isCurrent()) return false;
                const previous = read(userKey);
                const current = read(metadataKey);
                const owned = current?.context === context;
                const id = session.user ? Number(session.user.id) : accountId(current);
                const cached = {
                    ...(owned && previous?.id === id ? previous : {}),
                    backendName: cmsOptions.backendName,
                    id,
                    ...(session.user ? { name: session.user.name } : {}),
                    token: accessToken,
                    ...(cmsOptions.backendName === "gitlab" ? { refreshToken } : {}),
                };
                localStorage.setItem(metadataKey, JSON.stringify({ context, accountId: id, session }));
                localStorage.setItem(userKey, JSON.stringify(cached));
                localStorage.removeItem(sessionKey);
                notify();
            }).catch(error => {
                if (!isCurrent()) return false;
                throw error;
            });
        },
        removeItem() {
            localStorage.removeItem(sessionKey);
            if (read(metadataKey)?.context !== context) return;
            // Tombstones reject late CMS refreshes and stale EMP copies.
            localStorage.setItem(metadataKey, JSON.stringify({ context, session: null }));
            localStorage.setItem(userKey, "{}");
            notify();
        },
        isCurrent(userId) {
            const session = this.getItem();
            return Boolean(session && (userId === undefined || String(accountId(read(metadataKey))) === userId));
        },
        clearIfSignedOut() {
            const metadata = read(metadataKey);
            if (metadata?.context !== context || !metadata.session || read(userKey)?.token) return false;
            store.removeItem();
            return true;
        },
        onChange(callback) {
            listeners.add(callback);
        },
    };
    window.addEventListener("storage", event => {
        if (![userKey, metadataKey, sessionKey, null].includes(event.key)) return;
        if (!store.clearIfSignedOut()) notify();
    });
    return store;
})();
