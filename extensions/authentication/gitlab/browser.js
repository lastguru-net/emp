// GitLab's public-client flow runs entirely in the browser.
const authentication = (() => {
    const { clientId, redirectUri, scopes = "read_user", origin = "https://gitlab.com" } = authenticationOptions;
    const pendingKey = "emp.gitlab.pending";
    const sessionKey = "emp.gitlab.session";
    const errorKey = "emp.gitlab.error";
    const scope = Array.isArray(scopes) ? scopes.join(" ") : scopes;
    const config = JSON.stringify([origin, clientId, redirectUri, scope]);
    const base64url = bytes => btoa(String.fromCharCode(...bytes))
        .replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
    const read = value => {
        try {
            return JSON.parse(value);
        } catch {
            return null;
        }
    };

    const request = async (path, options) => {
        const response = await fetch(`${origin}${path}`, {
            cache: "no-store", ...options,
        });
        if (!response.ok) throw Object.assign(new Error("GitLab request failed."), { status: response.status });
        return response.json();
    };

    const exchange = async parameters => {
        const token = await request("/oauth/token", {
            method: "POST",
            body: new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, ...parameters }),
        });
        const expiresAt = Date.now() + Number(token?.expires_in) * 1000;
        if (typeof token?.access_token !== "string" || !token.access_token ||
            typeof token.refresh_token !== "string" || !token.refresh_token || String(token.token_type).toLowerCase() !== "bearer" ||
            !Number.isSafeInteger(expiresAt) || expiresAt <= Date.now()) {
            throw Object.assign(new Error("GitLab returned an invalid token response."), { status: 400 });
        }
        return { accessToken: token.access_token, refreshToken: token.refresh_token, expiresAt, config };
    };

    const profile = async accessToken => {
        const value = await request("/api/v4/user", { headers: { Authorization: `Bearer ${accessToken}` } });
        const name = value?.name || value?.username;
        if (!Number.isSafeInteger(value?.id) || value.id <= 0 || typeof name !== "string" || !name.trim()) {
            throw Object.assign(new Error("GitLab returned an invalid user profile."), { status: 401 });
        }
        return { id: String(value.id), name: name.trim() };
    };

    return {
        error: false,
        async signIn() {
            this.error = false;
            sessionStorage.removeItem(errorKey);
            if (!clientId || new URL(redirectUri).origin !== location.origin) {
                throw new Error("Configure a GitLab clientId and a redirect URL on this site.");
            }
            const state = base64url(crypto.getRandomValues(new Uint8Array(32)));
            const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
            const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
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
            if (`${callback.origin}${callback.pathname}` !== redirectUri ||
                !callback.searchParams.has("state") ||
                !(callback.searchParams.has("code") || callback.searchParams.has("error")) ||
                rawPending === null || read(rawPending)?.returnTo === callback.href) return restoreSession();
            const query = callback.searchParams;
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
                if (!pending) throw new Error("GitLab sign-in state has expired. Please try again.");
                if (pending.config !== config ||
                    !/^[A-Za-z0-9_-]{43}$/.test(pending.verifier) ||
                    !Number.isFinite(pending.createdAt) || pending.createdAt > Date.now() ||
                    Date.now() - pending.createdAt > 10 * 60 * 1000 ||
                    query.getAll("state").length !== 1 || !pending.state || query.get("state") !== pending.state) {
                    throw new Error("Invalid GitLab sign-in state. Please try again.");
                }
                if (query.has("error")) throw new Error("GitLab sign-in was cancelled or denied.");
                if (query.getAll("code").length !== 1 || !query.get("code")) throw new Error("GitLab authorization code is missing.");
                const previousSession = localStorage.getItem(sessionKey);
                const session = await exchange({
                    grant_type: "authorization_code", code: query.get("code"), code_verifier: pending.verifier,
                });
                const user = await profile(session.accessToken);
                // A later sign-out or login in another tab takes precedence.
                if (localStorage.getItem(sessionKey) !== previousSession) return null;
                localStorage.setItem(sessionKey, JSON.stringify(session));
                return user;
            } catch (error) {
                sessionStorage.setItem(errorKey, "1");
                throw error;
            } finally {
                location.replace(returnTo);
            }
        },

        async signOut() {
            this.error = false;
            sessionStorage.removeItem(pendingKey);
            sessionStorage.removeItem(errorKey);
            localStorage.removeItem(sessionKey);
            return null;
        },
    };

    async function restoreSession() {
        // Read and refresh under one lock so tabs cannot rotate the same token twice.
        return navigator.locks.request(sessionKey, async () => {
            let stored = localStorage.getItem(sessionKey);
            if (!stored) return null;
            let session = read(stored);
            if (session?.config !== config || typeof session.accessToken !== "string" || !session.accessToken ||
                typeof session.refreshToken !== "string" || !session.refreshToken ||
                !Number.isFinite(session.expiresAt)) {
                localStorage.removeItem(sessionKey);
                return null;
            }
            try {
                if (session.expiresAt <= Date.now() + 30000) {
                    session = await exchange({ grant_type: "refresh_token", refresh_token: session.refreshToken });
                    // A sign-out or new login during the request takes precedence.
                    if (localStorage.getItem(sessionKey) !== stored) return null;
                    stored = JSON.stringify(session);
                    localStorage.setItem(sessionKey, stored);
                }
                const user = await profile(session.accessToken);
                return localStorage.getItem(sessionKey) === stored ? user : null;
            } catch (error) {
                if (![400, 401].includes(error.status)) throw error;
                if (localStorage.getItem(sessionKey) === stored) localStorage.removeItem(sessionKey);
                return null;
            }
        });
    }
})();
