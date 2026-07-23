/** Cloudflare Worker entry point for Get Codex Theme. */
import handler from "vinext/server/app-router-entry";

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const response = await handler.fetch(request, env, ctx);

    const headers = new Headers(response.headers);
    headers.set("Content-Security-Policy", "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data: blob:; font-src 'self' data:; object-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; upgrade-insecure-requests");
    headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    headers.set("X-GetCodexTheme-Deployment", "cloudflare-owned");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("X-Frame-Options", "DENY");
    if (url.protocol === "https:") headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    if (url.pathname.startsWith("/_next/static/")) {
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
    } else if (/^\/(?:theme-packs|schema)\//.test(url.pathname)) {
      headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    }
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  },
};

export default worker satisfies ExportedHandler<Env>;
