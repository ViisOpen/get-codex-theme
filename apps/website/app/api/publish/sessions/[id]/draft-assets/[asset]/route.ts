import { RequestError, toErrorResponse } from "../../../../../_lib/http";
import { themeAssets } from "../../../../../_lib/assets";
import { DRAFT_PREVIEW_KEYS, type DraftPreviewKey, type DraftPreviewRecord } from "../../../../../_lib/publishing-draft";
import { findPublisherSession } from "../../../../../_lib/publish-sessions";
import { requirePublisher } from "@/lib/auth/server";

export async function GET(_request: Request, context: { params: Promise<{ id: string; asset: string }> }) {
  try {
    const publisher = await requirePublisher();
    const { id, asset } = await context.params;
    if (!(DRAFT_PREVIEW_KEYS as readonly string[]).includes(asset)) throw new RequestError(404, "draft_asset_not_found", "Draft preview not found.");
    const session = await findPublisherSession(id, publisher.id);
    if (!session) throw new RequestError(404, "publish_session_not_found", "Publishing draft not found.");
    const previews = JSON.parse(session.draftPreviewJson) as Partial<Record<DraftPreviewKey, DraftPreviewRecord>>;
    const record = previews[asset as DraftPreviewKey];
    if (!record?.key || !record.key.startsWith(`drafts/${publisher.id}/${id}/`)) throw new RequestError(404, "draft_asset_not_found", "Draft preview not found.");
    const object = await themeAssets().get(record.key);
    if (!object) throw new RequestError(404, "draft_asset_not_found", "Draft preview not found.");
    return new Response(object.body, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": record.contentType,
        "Content-Length": String(object.size),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
