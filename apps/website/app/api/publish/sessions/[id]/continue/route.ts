import { RequestError, json, toErrorResponse } from "../../../../_lib/http";
import { authenticateBuildCapability, publicPublishSession } from "../../../../_lib/publish-sessions";

const AUTHORIZED_STATUSES = new Set(["publish_token_issued", "preflight_passed", "uploaded", "validating"]);
const TERMINAL_STATUSES = new Set(["published", "failed", "expired", "revoked"]);

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const session = await authenticateBuildCapability(request, id, { allowConsumed: true });
    const headers = { "Cache-Control": "private, no-store" };

    if (TERMINAL_STATUSES.has(session.status)) {
      return json({ state: "complete", session: publicPublishSession(session) }, { headers });
    }
    if (session.status === "draft_ready" || session.status === "author_confirmed") {
      return json({ state: "waiting_for_confirmation", session: publicPublishSession(session) }, { status: 202, headers });
    }
    if (AUTHORIZED_STATUSES.has(session.status)) {
      if (!session.publishTokenEnvelope || !session.agentPublicKeyJson) {
        throw new RequestError(409, "agent_continuation_unavailable", "This legacy draft requires the separate Publish prompt shown in the portal.");
      }
      return json({
        state: "authorized",
        algorithm: "RSA-OAEP-256",
        envelope: session.publishTokenEnvelope,
        session: publicPublishSession(session),
      }, { headers });
    }
    throw new RequestError(409, "invalid_publish_state", `The publishing agent cannot continue while the session is ${session.status}.`);
  } catch (error) {
    return toErrorResponse(error);
  }
}
