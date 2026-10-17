const upstream = "https://github.com/login/oauth/access_token";
const maxRequestBytes = 2048;

const responseHeaders = (origin) => ({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    Vary: "Origin",
    "X-Content-Type-Options": "nosniff",
    ...(origin ? { "Access-Control-Allow-Origin": origin } : {}),
});

const reply = (status, body, origin, extra = {}) => new Response(JSON.stringify(body), {
    status,
    headers: { ...responseHeaders(origin), ...extra },
});

const readBounded = async (request) => {
    if (Number(request.headers.get("Content-Length")) > maxRequestBytes) throw new Error("too_large");
    const reader = request.body?.getReader();
    if (!reader) throw new Error("missing_body");
    const chunks = [];
    let size = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxRequestBytes) {
            await reader.cancel();
            throw new Error("too_large");
        }
        chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
};

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        if (url.pathname !== env.EXCHANGE_PATH) return env.ASSETS.fetch(request);
        const origin = request.headers.get("Origin");
        const allowed = (env.ALLOWED_ORIGINS || "").split(",").map(value => value.trim());
        if (!origin || !allowed.includes(origin)) return reply(403, { error: "origin_not_allowed" });
        if (url.search) return reply(404, { error: "not_found" }, origin);
        if (request.method === "OPTIONS") {
            return new Response(null, { status: 204, headers: {
                ...responseHeaders(origin),
                "Access-Control-Allow-Methods": "POST",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Max-Age": "600",
            } });
        }
        if (request.method !== "POST") return reply(405, { error: "method_not_allowed" }, origin, { Allow: "POST, OPTIONS" });
        if (request.headers.get("Content-Type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
            return reply(415, { error: "unsupported_media_type" }, origin);
        }
        if (!env.CLIENT_ID || !env.CLIENT_SECRET || !env.REDIRECT_URI) return reply(500, { error: "not_configured" }, origin);

        let input;
        try {
            input = await readBounded(request);
        } catch {
            return reply(400, { error: "invalid_request" }, origin);
        }
        if (!input || typeof input !== "object" || Array.isArray(input) ||
            typeof input.code !== "string" || !input.code ||
            typeof input.codeVerifier !== "string" || !/^[A-Za-z0-9._~-]{43,128}$/.test(input.codeVerifier) ||
            Object.keys(input).some(key => key !== "code" && key !== "codeVerifier")) {
            return reply(400, { error: "invalid_request" }, origin);
        }
        const body = new URLSearchParams({
            client_id: env.CLIENT_ID,
            client_secret: env.CLIENT_SECRET,
            code: input.code,
            redirect_uri: env.REDIRECT_URI,
            code_verifier: input.codeVerifier,
        });
        let result;
        try {
            result = await fetch(upstream, {
                method: "POST",
                headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
                body,
                // Workers rejects "error"; the status check below rejects redirects.
                redirect: "manual",
                signal: AbortSignal.timeout(10000),
            });
        } catch {
            return reply(502, { error: "upstream_unavailable" }, origin);
        }
        if (!result.ok) return reply(502, { error: "upstream_failed" }, origin);
        let token;
        try {
            token = await result.json();
        } catch {
            return reply(502, { error: "upstream_invalid" }, origin);
        }
        if (!token || typeof token !== "object" || Array.isArray(token)) return reply(502, { error: "upstream_invalid" }, origin);
        if (token.error) return reply(400, { error: "exchange_rejected" }, origin);
        if (typeof token.access_token !== "string" || !token.access_token || typeof token.token_type !== "string" || token.token_type.toLowerCase() !== "bearer") {
            return reply(502, { error: "upstream_invalid" }, origin);
        }
        const output = { access_token: token.access_token, token_type: token.token_type };
        if (token.expires_in !== undefined) {
            if (!Number.isFinite(token.expires_in) || token.expires_in <= 0) return reply(502, { error: "upstream_invalid" }, origin);
            output.expires_in = token.expires_in;
        }
        // A refresh token is never returned: this Worker implements code exchange only.
        return reply(200, output, origin);
    },
};
