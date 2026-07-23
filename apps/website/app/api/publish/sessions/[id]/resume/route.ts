import { env } from "cloudflare:workers";
import { themeAssets } from "../../../../_lib/assets";
import { json, toErrorResponse } from "../../../../_lib/http";
import {
  buildCodexBuildPrompt,
  publicPublishSession,
  publishSessionAuthorProfiles,
  resumePublishSession,
} from "../../../../_lib/publish-sessions";
import { requireTrustedBrowserMutation, safeOrigin } from "../../../../_lib/security";
import { requirePublisher } from "@/lib/auth/server";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const origin = safeOrigin(request, env.SITE_URL);
    requireTrustedBrowserMutation(request, origin);
    const publisher = await requirePublisher();
    const { id } = await context.params;
    const edit = new URL(request.url).searchParams.get("mode") === "edit";
    const { session, code, discardedDraftKeys, discardedArchiveKey } = await resumePublishSession(id, publisher.id, { edit });
    const discardedAssets = [...discardedDraftKeys, ...(discardedArchiveKey ? [discardedArchiveKey] : [])];
    if (discardedAssets.length) await themeAssets().delete(discardedAssets).catch(() => undefined);
    return json({
      session: publicPublishSession(session),
      ...(code ? {
        capability: "build" as const,
        capabilityCode: code,
        prompt: buildCodexBuildPrompt(origin, code, session.buildTokenExpiresAt, publishSessionAuthorProfiles(session)),
      } : {}),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
