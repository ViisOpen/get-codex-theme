import { env } from "cloudflare:workers";
import { RequestError, json, toErrorResponse } from "../../../_lib/http";
import { themeAssets } from "../../../_lib/assets";
import { draftAssetKeys } from "../../../_lib/publishing-draft";
import { archivePublishSession, findPublisherSession, publicPublishSession } from "../../../_lib/publish-sessions";
import { requireTrustedBrowserMutation, safeOrigin } from "../../../_lib/security";
import { requirePublisher } from "@/lib/auth/server";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const publisher = await requirePublisher();
    const { id } = await context.params;
    const session = await findPublisherSession(id, publisher.id);
    if (!session) throw new RequestError(404, "publish_session_not_found", "Publishing session not found.");
    if (session.status === "expired" && session.archiveKey?.startsWith("quarantine/")) {
      await themeAssets().delete(session.archiveKey).catch(() => undefined);
    }
    return json({ session: publicPublishSession(session) });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    requireTrustedBrowserMutation(request, safeOrigin(request, env.SITE_URL));
    const publisher = await requirePublisher();
    const { id } = await context.params;
    const session = await archivePublishSession(id, publisher.id);
    if (session?.archiveKey?.startsWith("quarantine/")) await themeAssets().delete(session.archiveKey).catch(() => undefined);
    const draftKeys = session ? draftAssetKeys(session.draftPreviewJson) : [];
    if (draftKeys.length) await themeAssets().delete(draftKeys).catch(() => undefined);
    return json({ session: publicPublishSession(session) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
