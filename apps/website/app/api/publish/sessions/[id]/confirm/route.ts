import { env } from "cloudflare:workers";
import { RequestError, json, readJsonObject, toErrorResponse } from "../../../../_lib/http";
import { buildCodexPublishPrompt, confirmPublishSession, findPublisherSession, publicPublishSession } from "../../../../_lib/publish-sessions";
import { requireTrustedBrowserMutation, safeOrigin } from "../../../../_lib/security";
import { requirePublisher } from "@/lib/auth/server";

const SHA256_RE = /^[0-9a-f]{64}$/;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const origin = safeOrigin(request, env.SITE_URL);
    requireTrustedBrowserMutation(request, origin);
    const publisher = await requirePublisher();
    const { id } = await context.params;
    const payload = await readJsonObject(request, 8_192);
    if (payload.publicCopyConfirmed !== true) throw new RequestError(400, "public_copy_confirmation_required", "Confirm that the displayed public copy and previews are accurate.");
    if (payload.rightsConfirmed !== true) throw new RequestError(400, "rights_confirmation_required", "Confirm that you have the right to redistribute every asset in this theme pack.");
    if (payload.termsAccepted !== true) throw new RequestError(400, "terms_acceptance_required", "Accept the current publishing terms before generating a publish code.");
    const draftDigest = typeof payload.draftDigest === "string" ? payload.draftDigest.toLowerCase() : "";
    if (!SHA256_RE.test(draftDigest)) throw new RequestError(400, "invalid_draft_digest", "The confirmed draft digest is invalid.");
    const current = await findPublisherSession(id, publisher.id);
    if (!current) throw new RequestError(404, "publish_session_not_found", "Publishing draft not found.");
    if (payload.termsVersion !== current.termsVersion) throw new RequestError(409, "terms_changed", "The publishing terms changed. Read and accept the current version.");
    const { session, code, agentContinuation } = await confirmPublishSession(id, publisher.id, draftDigest);
    return json({
      session: publicPublishSession(session),
      continuation: agentContinuation ? "agent" : "manual",
      ...(agentContinuation ? {} : {
        capability: "publish",
        capabilityCode: code,
        prompt: buildCodexPublishPrompt(origin, code, session.publishTokenExpiresAt as string, draftDigest),
      }),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
