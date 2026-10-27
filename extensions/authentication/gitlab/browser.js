// GitLab's public-client flow runs entirely in the browser.
const authentication = (() => {
    const { clientId, redirectUri, scopes, origin = "https://gitlab.com" } = authenticationOptions;
    const pendingKey = "emp.gitlab.pending";
    const sessionKey = "emp.gitlab.session";
    let sessions = globalThis.localStorage;
    const errorKey = "emp.gitlab.error";
    const scope = Array.isArray(scopes) ? scopes.join(" ") : scopes;
    const config = JSON.stringify([origin, clientId, redirectUri, scope]);
    const base64url = bytes => btoa(String.fromCharCode(...bytes))
        .replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
    let revision = 0;
    const read = value => {
        try {
            return JSON.parse(value);
        } catch {
            return null;
        }
    };

    const request = async (url, options) => {
        const response = await fetch(url, {
            cache: "no-store", signal: AbortSignal.timeout(10000), ...options,
        });
        if (!response.ok) throw Object.assign(new Error("GitLab request failed."), { status: response.status });
        return response.json();
    };

    const exchange = async parameters => {
        const requestedAt = Date.now();
        const token = await request(`${origin}/oauth/token`, {
            method: "POST",
            body: new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, ...parameters }),
        });
        const expiresAt = requestedAt + token?.expires_in * 1000;
        if (typeof token?.access_token !== "string" || !token.access_token ||
            typeof token.refresh_token !== "string" || !token.refresh_token || typeof token.token_type !== "string" || token.token_type.toLowerCase() !== "bearer" ||
            !Number.isFinite(token.expires_in) || !Number.isSafeInteger(expiresAt) || expiresAt <= Date.now()) {
            throw new Error("GitLab returned an invalid token response.");
        }
        return { accessToken: token.access_token, refreshToken: token.refresh_token, expiresAt, config };
    };

    const profile = async accessToken => {
        const value = await request(`${origin}/api/v4/user`, { headers: { Authorization: `Bearer ${accessToken}` } });
        const name = typeof value?.name === "string" && value.name.trim() ? value.name : value?.username;
        if (!Number.isSafeInteger(value?.id) || value.id < 1 ||
            typeof value.username !== "string" || !value.username.trim() || typeof name !== "string" || !name.trim()) {
            throw new Error("GitLab returned an invalid profile.");
        }
        return { id: String(value.id), name: name.trim() };
    };

    const validSession = session => session?.config === config && typeof session.accessToken === "string" && session.accessToken &&
        typeof session.refreshToken === "string" && session.refreshToken && Number.isFinite(session.expiresAt);
    const credentials = stored => {
        const value = read(stored);
        if (!value || typeof value !== "object") return stored;
        const { user, ...session } = value;
        return JSON.stringify(Object.keys(session).sort().map(key => [key, session[key]]));
    };
    const matches = session => credentials(sessions.getItem(sessionKey)) ===
        credentials(typeof session === "string" || session === null ? session : JSON.stringify(session));
    const cacheUser = async (session, user, current = revision) => {
        if (!session || !matches(session)) return;
        const stored = sessions.getItem(sessionKey);
        const value = read(stored);
        if (!value || typeof value !== "object") return;
        if (user) value.user = { id: user.id, name: user.name };
        else delete value.user;
        const next = JSON.stringify(value);
        if (next !== stored || (user && sessions !== globalThis.localStorage)) {
            return sessions.setItem(sessionKey, next, Boolean(user), () => current === revision && matches(session));
        }
    };
    const withSessionLock = action => navigator.locks.request(sessions.refreshLock ?? sessionKey, { signal: AbortSignal.timeout(10000) }, action);

    return {
        error: false,
        useSessionStorage(storage) { sessions = storage; },
        storageKey: sessionKey,
        cached() {
            const session = read(sessions.getItem(sessionKey));
            const user = session?.user;
            return validSession(session) && typeof user?.id === "string" && user.id &&
                typeof user.name === "string" && user.name.trim() ? { id: user.id, name: user.name } : null;
        },
        async signIn() {
            const current = ++revision;
            this.error = false;
            sessionStorage.removeItem(pendingKey);
            sessionStorage.removeItem(errorKey);
            const callback = new URL(redirectUri);
            if (!clientId || callback.origin !== location.origin || callback.protocol !== "https:" ||
                callback.username || callback.password || callback.search || callback.hash || !callback.pathname.endsWith("/")) {
                throw new Error("Configure a GitLab clientId and an HTTPS homepage redirect URL on this site.");
            }
            const provider = new URL(origin);
            if (provider.protocol !== "https:" || provider.username || provider.password ||
                provider.pathname !== "/" || provider.search || provider.hash || /[/?#]$/.test(origin)) {
                throw new Error("Configure a GitLab HTTPS origin without a path or trailing slash.");
            }
            const state = base64url(crypto.getRandomValues(new Uint8Array(32)));
            const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
            const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
            if (current !== revision) return null;
            sessionStorage.setItem(pendingKey, JSON.stringify({ state, verifier, createdAt: Date.now(), config, returnTo: location.href }));
            const authorize = new URL(`${origin}/oauth/authorize`);
            authorize.search = new URLSearchParams({
                client_id: clientId, redirect_uri: redirectUri, response_type: "code", state,
                scope,
                code_challenge: base64url(new Uint8Array(digest)), code_challenge_method: "S256",
            });
            location.assign(authorize.href);
            return null;
        },

        async restore() {
            this.error = Boolean(sessionStorage.getItem(errorKey));
            sessionStorage.removeItem(errorKey);
            const callback = new URL(location.href);
            const rawPending = sessionStorage.getItem(pendingKey);
            const pending = read(rawPending);
            const returning = typeof pending?.callback === "string" && pending.returnTo === callback.href;
            if (!returning && (`${callback.origin}${callback.pathname}` !== redirectUri ||
                !callback.searchParams.has("state") ||
                !(callback.searchParams.has("code") || callback.searchParams.has("error")) ||
                rawPending === null || pending?.returnTo === callback.href || pending?.callback)) return restoreSession();
            const current = ++revision;
            const query = new URLSearchParams(returning ? pending.callback : callback.search);
            let previousSession = sessions.getItem(sessionKey);
            if (!returning) history.replaceState(null, "", redirectUri);
            sessionStorage.removeItem(pendingKey);
            // Returning to our own saved page does not depend on OAuth succeeding.
            let returnTo = redirectUri;
            try {
                const url = new URL(pending?.returnTo);
                if (url.origin === location.origin) returnTo = url.href;
            } catch {}
            const destination = new URL(returnTo);
            const navigate = !returning && (destination.pathname !== callback.pathname || Boolean(destination.search));
            // A homepage fragment is a same-document navigation, so finish here.
            if (!returning && !navigate && destination.hash) location.replace(returnTo);
            try {
                if (!pending || pending.config !== config ||
                    !/^[A-Za-z0-9_-]{43}$/.test(pending.verifier) ||
                    !Number.isFinite(pending.createdAt) || pending.createdAt > Date.now() ||
                    Date.now() - pending.createdAt > 10 * 60 * 1000 ||
                    query.getAll("state").length !== 1 || !pending.state || query.get("state") !== pending.state) {
                    throw new Error("Invalid or expired GitLab sign-in state. Please try again.");
                }
                if (query.has("error")) throw new Error("GitLab sign-in was cancelled or denied.");
                if (query.getAll("code").length !== 1 || !query.get("code")) throw new Error("GitLab authorization code is missing.");
                if (navigate) {
                    // Carry only this tab's one-use callback; no provider request blocks returning.
                    // Remember presence, not tokens: another tab may rotate them before we take the lock.
                    sessionStorage.setItem(pendingKey, JSON.stringify({ ...pending, returnTo, callback: query.toString(), hadSession: Boolean(previousSession) }));
                    return null;
                }
                if (returning && pending.hadSession && !previousSession) return null;
                return await withSessionLock(async () => {
                    if (current !== revision) return null;
                    // A completed rotation before lock acquisition is not a competing login.
                    const sessionBeforeLock = previousSession;
                    previousSession = sessions.getItem(sessionKey);
                    if (sessionBeforeLock && !previousSession) return null;
                    const session = await exchange({
                        grant_type: "authorization_code", code: query.get("code"), code_verifier: pending.verifier,
                    });
                    const user = await profile(session.accessToken);
                    // Logout is immediate and does not wait for the network lock.
                    if (current !== revision || !matches(previousSession)) return null;
                    const saved = await sessions.setItem(sessionKey, JSON.stringify({ ...session, user }),
                        true, () => current === revision && matches(previousSession));
                    if (saved === false || current !== revision) return null;
                    return user;
                });
            } catch (error) {
                if (current !== revision) return null;
                await cacheUser(previousSession, null);
                if (current !== revision) return null;
                this.error = true;
                if (navigate) sessionStorage.setItem(errorKey, "1");
                throw error;
            } finally {
                if (current === revision && navigate) location.replace(returnTo);
            }
        },

        async signOut() {
            ++revision;
            this.error = false;
            sessionStorage.removeItem(pendingKey);
            sessionStorage.removeItem(errorKey);
            sessions.removeItem(sessionKey);
            return null;
        },
    };

    async function restoreSession() {
        const current = revision;
        let session = read(sessions.getItem(sessionKey));
        try {
            // Rotation invalidates the old access token too: profile lookup shares the lock.
            return await withSessionLock(async () => {
                if (current !== revision) return null;
                session = read(sessions.getItem(sessionKey));
                if (!session) {
                    sessions.removeItem(sessionKey);
                    return null;
                }
                if (!validSession(session)) {
                    sessions.removeItem(sessionKey);
                    return null;
                }
                const refreshToken = async () => {
                    let next;
                    try {
                        next = await exchange({ grant_type: "refresh_token", refresh_token: session.refreshToken });
                    } catch (error) {
                        // Only token-endpoint rejection establishes an invalid refresh grant.
                        if (error.status === 400 || error.status === 401) error.invalidGrant = true;
                        throw error;
                    }
                    if (!matches(session)) return false;
                    // Keep accepted rotation even if a new sign-in started meanwhile.
                    // Its old refresh token has already been spent.
                    const user = read(sessions.getItem(sessionKey))?.user;
                    session = { ...next, ...(user ? { user } : {}) };
                    await sessions.setItem(sessionKey, JSON.stringify(session));
                    return true;
                };
                let refreshed = false;
                // Stock CMS refreshes omit expiry metadata; validate its current token first.
                if (!sessions.refreshLock && session.expiresAt <= Date.now() + 30000) {
                    if (!await refreshToken()) return null;
                    refreshed = true;
                }
                if (current !== revision || !matches(session)) return null;
                let user;
                try {
                    user = await profile(session.accessToken);
                } catch (error) {
                    if (error.status !== 401 || refreshed) throw error;
                    if (current !== revision || !matches(session) || !await refreshToken()) return null;
                    if (current !== revision) return null;
                    user = await profile(session.accessToken);
                }
                if (current !== revision || !matches(session)) return null;
                if (await cacheUser(session, user) === false || current !== revision) return null;
                return user;
            });
        } catch (error) {
            if (current !== revision || !matches(session)) return null;
            await cacheUser(session, null);
            if (current !== revision || !matches(session)) return null;
            if (!error.invalidGrant && error.status !== 401) throw error;
            sessions.removeItem(sessionKey);
            return null;
        }
    }
})();
