import { env } from "cloudflare:workers";
import { buildCommunityRegistryThemePack, buildRegistryThemePack } from "../../../_lib/registry-pack";
import { apiError, toErrorResponse } from "../../../_lib/http";
import { safeOrigin } from "../../../_lib/security";
import { findPublishedSubmission } from "../../../_lib/submissions";
import { themeAssets } from "../../../_lib/assets";

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return apiError(404, "theme_not_found", "Theme not found.");
    const requestedVersion = new URL(request.url).searchParams.get("version");
    const origin = safeOrigin(request, env.SITE_URL);
    const requestUrl = new URL(request.url);
    const isLocalRequest = ["localhost", "127.0.0.1", "::1"].includes(requestUrl.hostname);
    const assetOrigin = isLocalRequest ? requestUrl.origin : origin;
    const fetchAsset: typeof fetch = env.ASSETS
      ? async (input, init) => {
          const response = await env.ASSETS!.fetch(input, init);
          const assetUrl = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
          if (response.status === 404 && ["localhost", "127.0.0.1", "::1"].includes(assetUrl.hostname)) {
            return fetch(input, init);
          }
          return response;
        }
      : fetch;
    let pack = await buildRegistryThemePack(slug, assetOrigin, fetchAsset);
    if (!pack) {
      const submission = await findPublishedSubmission(slug, requestedVersion);
      if (!submission) return apiError(404, "theme_not_found", "Theme not found.");
      const archive = await themeAssets().get(submission.archiveKey);
      if (!archive) return apiError(404, "theme_archive_not_found", "The published theme archive is unavailable.");
      pack = await buildCommunityRegistryThemePack(await archive.arrayBuffer());
    }
    if (requestedVersion && requestedVersion !== pack.version) {
      return apiError(404, "theme_version_not_found", "That theme version is not available.");
    }
    return new Response(pack.bytes.buffer as ArrayBuffer, {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=3600",
        "Content-Disposition": `attachment; filename="${pack.filename}"`,
        "Content-Length": String(pack.bytes.byteLength),
        "Content-Type": "application/zip",
        "X-Content-Type-Options": "nosniff",
        "X-Theme-SHA256": pack.sha256,
        "X-Theme-Version": pack.version,
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
