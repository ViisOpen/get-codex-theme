import { env } from "cloudflare:workers";
import { apiError, json, RequestError, toErrorResponse } from "../../../_lib/http";
import { enforceLikeRateLimit, getThemeLikeState, resolveLikeActor, toggleThemeLike } from "../../../_lib/likes";
import { safeOrigin } from "../../../_lib/security";
import { findPublishedSubmission } from "../../../_lib/submissions";
import { getTheme } from "@/lib/themes";

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return apiError(404, "theme_not_found", "Theme not found.");
    if (!getTheme(slug) && !(await findPublishedSubmission(slug))) return apiError(404, "theme_not_found", "Theme not found.");
    const actor = await resolveLikeActor(request);
    return json(await getThemeLikeState(slug, actor));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return apiError(404, "theme_not_found", "Theme not found.");
    const site = request.headers.get("sec-fetch-site");
    if (site === "cross-site") throw new RequestError(403, "cross_site_request", "Cross-site like requests are not allowed.");
    const origin = request.headers.get("origin");
    if (origin && origin !== safeOrigin(request, env.SITE_URL)) throw new RequestError(403, "invalid_origin", "This like request came from an untrusted origin.");
    if (!getTheme(slug) && !(await findPublishedSubmission(slug))) return apiError(404, "theme_not_found", "Theme not found.");
    const actor = await resolveLikeActor(request);
    await enforceLikeRateLimit(actor);
    const result = await toggleThemeLike(slug, actor);
    return json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
