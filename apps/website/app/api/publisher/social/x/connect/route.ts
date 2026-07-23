import { env } from "cloudflare:workers";
import { json, readJsonObject, toErrorResponse } from "../../../../_lib/http";
import { requireTrustedBrowserMutation, safeOrigin } from "../../../../_lib/security";
import { requirePublisher } from "@/lib/auth/server";
import { saveXProfile } from "@/lib/auth/social-profiles";

export async function POST(request: Request) {
  try {
    requireTrustedBrowserMutation(request, safeOrigin(request, env.SITE_URL));
    const publisher = await requirePublisher();
    const payload = await readJsonObject(request, 2_048);
    const profileUrl = typeof payload.profileUrl === "string" ? payload.profileUrl : "";
    const profile = await saveXProfile(env.DB, publisher.id, profileUrl);
    return json({ profile }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return toErrorResponse(error);
  }
}
