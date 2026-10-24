// The browser owns sign-in and sessions; the Worker only exchanges codes.
const authentication = (() => {
    const { clientId, redirectUri, exchangeUrl, scopes = [] } = authenticationOptions;
    const pendingKey = "emp.github.pending";
    const sessionKey = "emp.github.session";
    const errorKey = "emp.github.error";
    const scope = Array.isArray(scopes) ? scopes.join(" ") : scopes;
    const config = JSON.stringify([clientId, redirectUri, exchangeUrl, scope]);
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
        if (!response.ok) throw Object.assign(new Error("GitHub request failed."), { status: response.status });
        return response.json();
    };

    const profile = async accessToken => {
        const value = await request("https://api.github.com/user", {
            headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${accessToken}`, "X-GitHub-Api-Version": "2022-11-28" },
        });
        const name = typeof value?.name === "string" && value.name.trim() ? value.name : value?.login;
        if (!Number.isSafeInteger(value?.id) || value.id < 1 ||
            typeof value.login !== "string" || !value.login.trim() || typeof name !== "string" || !name.trim()) {
            throw new Error("GitHub returned an invalid profile.");
        }
        return { id: String(value.id), name: name.trim() };
    };

    const validSession = session => session?.config === config && typeof session.accessToken === "string" && session.accessToken &&
        (session.expiresAt === null || (Number.isFinite(session.expiresAt) && session.expiresAt > Date.now()));
    const credentials = stored => {
        const value = read(stored);
        if (!value || typeof value !== "object") return stored;
        const { user, ...session } = value;
        return JSON.stringify(session);
    };
    const matches = session => credentials(localStorage.getItem(sessionKey)) ===
        credentials(typeof session === "string" || session === null ? session : JSON.stringify(session));
    const cacheUser = (session, user) => {
        if (!session || !matches(session)) return;
        const stored = localStorage.getItem(sessionKey);
        const value = read(stored);
        if (!value || typeof value !== "object") return;
        if (user) value.user = { id: user.id, name: user.name };
        else delete value.user;
        const next = JSON.stringify(value);
        if (next !== stored) localStorage.setItem(sessionKey, next);
    };

    return {
        error: false,
        storageKey: sessionKey,
        cached() {
            const session = read(localStorage.getItem(sessionKey));
            const user = session?.user;
            return validSession(session) && typeof user?.id === "string" && user.id &&
                typeof user.name === "string" && user.name.trim() ? { id: user.id, name: user.name } : null;
        },
        async signIn() {
            const current = ++revision;
            this.error = false;
            sessionStorage.removeItem(errorKey);
            const callback = new URL(redirectUri);
            if (!clientId || callback.origin !== location.origin || callback.protocol !== "https:" ||
                callback.username || callback.password || callback.search || callback.hash || !callback.pathname.endsWith("/")) {
                throw new Error("Configure a GitHub clientId and an HTTPS homepage redirect URL on this site.");
            }
            const state = base64url(crypto.getRandomValues(new Uint8Array(32)));
            const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
            const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
            if (current !== revision) return null;
            sessionStorage.setItem(pendingKey, JSON.stringify({ state, verifier, createdAt: Date.now(), config, returnTo: location.href }));
            const authorize = new URL("https://github.com/login/oauth/authorize");
            authorize.search = new URLSearchParams({
                client_id: clientId, redirect_uri: redirectUri, state,
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
            if (`${callback.origin}${callback.pathname}` !== redirectUri ||
                !callback.searchParams.has("state") ||
                !(callback.searchParams.has("code") || callback.searchParams.has("error")) ||
                rawPending === null || read(rawPending)?.returnTo === callback.href) return restoreSession();
            const current = ++revision;
            const query = callback.searchParams;
            const previousSession = localStorage.getItem(sessionKey);
            history.replaceState(null, "", redirectUri);
            const pending = read(rawPending);
            sessionStorage.removeItem(pendingKey);
            // Returning to our own saved page does not depend on OAuth succeeding.
            let returnTo = redirectUri;
            try {
                const url = new URL(pending?.returnTo);
                if (url.origin === location.origin) returnTo = url.href;
            } catch {}
            try {
                if (!pending || pending.config !== config ||
                    !/^[A-Za-z0-9_-]{43}$/.test(pending.verifier) ||
                    !Number.isFinite(pending.createdAt) || pending.createdAt > Date.now() ||
                    Date.now() - pending.createdAt > 10 * 60 * 1000 ||
                    query.getAll("state").length !== 1 || !pending.state || query.get("state") !== pending.state) {
                    throw new Error("Invalid or expired GitHub sign-in state. Please try again.");
                }
                if (query.has("error")) throw new Error("GitHub sign-in was cancelled or denied.");
                if (query.getAll("code").length !== 1 || !query.get("code")) throw new Error("GitHub authorization code is missing.");
                const requestedAt = Date.now();
                const token = await request(exchangeUrl, {
                    method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
                    body: JSON.stringify({ code: query.get("code"), codeVerifier: pending.verifier }),
                });
                const expiresAt = token?.expires_in === undefined ? null : requestedAt + token.expires_in * 1000;
                if (typeof token?.access_token !== "string" || !token.access_token || typeof token.token_type !== "string" || token.token_type.toLowerCase() !== "bearer" ||
                    (expiresAt !== null && (!Number.isFinite(token.expires_in) || !Number.isSafeInteger(expiresAt) || expiresAt <= Date.now()))) {
                    throw new Error("GitHub returned an invalid token response.");
                }
                const user = await profile(token.access_token);
                // A later sign-out or login in another tab takes precedence.
                if (current !== revision || !matches(previousSession)) return null;
                if (expiresAt !== null && expiresAt <= Date.now()) throw new Error("GitHub access token has expired. Please sign in again.");
                localStorage.setItem(sessionKey, JSON.stringify({ accessToken: token.access_token, expiresAt, config, user }));
                return user;
            } catch (error) {
                if (current !== revision) return null;
                cacheUser(previousSession, null);
                sessionStorage.setItem(errorKey, "1");
                throw error;
            } finally {
                if (current === revision) location.replace(returnTo);
            }
        },

        async signOut() {
            ++revision;
            this.error = false;
            sessionStorage.removeItem(pendingKey);
            sessionStorage.removeItem(errorKey);
            localStorage.removeItem(sessionKey);
            return null;
        },
    };

    async function restoreSession() {
        const current = revision;
        const stored = localStorage.getItem(sessionKey);
        if (!stored) return null;
        const session = read(stored);
        if (!validSession(session)) {
            localStorage.removeItem(sessionKey);
            return null;
        }
        try {
            const user = await profile(session.accessToken);
            if (current !== revision || !matches(session)) return null;
            if (!validSession(session)) {
                localStorage.removeItem(sessionKey);
                return null;
            }
            cacheUser(session, user);
            return user;
        } catch (error) {
            if (current !== revision || !matches(session)) return null;
            cacheUser(session, null);
            if (error.status !== 401) throw error;
            localStorage.removeItem(sessionKey);
            return null;
        }
    }
})();
