import { env } from "cloudflare:workers";
import { apiError, toErrorResponse } from "../../../../_lib/http";
import { parseStoredGalleryAssets } from "../../../../_lib/gallery-assets";
import { safeOrigin } from "../../../../_lib/security";
import { findPublishedSubmission } from "../../../../_lib/submissions";
import { themeAssets } from "../../../../_lib/assets";
import { getTheme } from "@/lib/themes";
import { GALLERY_ASSET_NAMES, type GalleryAssetName } from "../../../../_lib/submission-validator";

const STATIC_PATHS: Record<GalleryAssetName, string> = {
  preview: "assets/preview.jpg",
  screenshotHome: "screenshots/home.jpg",
  screenshotTask: "screenshots/task.jpg",
  screenshotNarrow: "screenshots/narrow.jpg",
  background16x9: "assets/background-16x9.jpg",
};

export async function GET(request: Request, context: { params: Promise<{ slug: string; asset: string }> }) {
  try {
    const { slug, asset } = await context.params;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !(GALLERY_ASSET_NAMES as readonly string[]).includes(asset)) {
      return apiError(404, "theme_asset_not_found", "Theme asset not found.");
    }
    const name = asset as GalleryAssetName;
    if (getTheme(slug)) {
      const location = new URL(`/theme-packs/${encodeURIComponent(slug)}/${STATIC_PATHS[name]}`, safeOrigin(request, env.SITE_URL));
      return Response.redirect(location, 307);
    }
    const submission = await findPublishedSubmission(slug);
    if (!submission) return apiError(404, "theme_not_found", "Theme not found.");
    const stored = parseStoredGalleryAssets(submission.galleryAssetsJson)[name];
    if (!stored) return apiError(404, "theme_asset_not_found", "Theme asset not found.");
    const object = await themeAssets().get(stored.key);
    if (!object) return apiError(404, "theme_asset_not_found", "Theme asset not found.");
    return new Response(object.body, {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
        "Content-Length": String(object.size),
        "Content-Type": stored.contentType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
