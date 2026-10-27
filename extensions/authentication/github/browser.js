// The browser owns sign-in and sessions; the Worker only exchanges codes.
const authentication = (() => {
    const { clientId, redirectUri, exchangeUrl, scopes } = authenticationOptions;
    const pendingKey = "emp.github.pending";
    const sessionKey = "emp.github.session";
    let sessions = globalThis.localStorage;
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
        return JSON.stringify(Object.keys(session).sort().map(key => [key, session[key]]));
    };
    const matches = session => credentials(sessions.getItem(sessionKey)) ===
        credentials(typeof session === "string" || session === null ? session : JSON.stringify(session));
    // Preserve the pre-navigation session guard without copying credentials into the handoff.
    const fingerprint = async stored => base64url(new Uint8Array(await crypto.subtle.digest(
        "SHA-256", new TextEncoder().encode(credentials(stored) ?? ""),
    )));
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
            const pending = read(rawPending);
            const returning = typeof pending?.callback === "string" && pending.returnTo === callback.href;
            if (!returning && (`${callback.origin}${callback.pathname}` !== redirectUri ||
                !callback.searchParams.has("state") ||
                !(callback.searchParams.has("code") || callback.searchParams.has("error")) ||
                rawPending === null || pending?.returnTo === callback.href || pending?.callback)) return restoreSession();
            const current = ++revision;
            const query = new URLSearchParams(returning ? pending.callback : callback.search);
            const previousSession = sessions.getItem(sessionKey);
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
                    throw new Error("Invalid or expired GitHub sign-in state. Please try again.");
                }
                if (query.has("error")) throw new Error("GitHub sign-in was cancelled or denied.");
                if (query.getAll("code").length !== 1 || !query.get("code")) throw new Error("GitHub authorization code is missing.");
                if (navigate) {
                    // Carry only this tab's one-use callback; no provider request blocks returning.
                    const sessionFingerprint = await fingerprint(previousSession);
                    if (current !== revision) return null;
                    sessionStorage.setItem(pendingKey, JSON.stringify({ ...pending, returnTo, callback: query.toString(), sessionFingerprint }));
                    return null;
                }
                if (returning && pending.sessionFingerprint !== await fingerprint(previousSession)) return null;
                if (current !== revision || !matches(previousSession)) return null;
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
                const saved = await sessions.setItem(sessionKey, JSON.stringify({ accessToken: token.access_token, expiresAt, config, user }),
                    true, () => current === revision && matches(previousSession));
                if (saved === false || current !== revision) return null;
                return user;
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
        const stored = sessions.getItem(sessionKey);
        if (!stored) return null;
        const session = read(stored);
        if (!validSession(session)) {
            sessions.removeItem(sessionKey);
            return null;
        }
        try {
            const user = await profile(session.accessToken);
            if (current !== revision || !matches(session)) return null;
            if (!validSession(session)) {
                sessions.removeItem(sessionKey);
                return null;
            }
            if (await cacheUser(session, user) === false || current !== revision) return null;
            return user;
        } catch (error) {
            if (current !== revision || !matches(session)) return null;
            await cacheUser(session, null);
            if (current !== revision || !matches(session)) return null;
            if (error.status !== 401) throw error;
            sessions.removeItem(sessionKey);
            return null;
        }
    }
})();
