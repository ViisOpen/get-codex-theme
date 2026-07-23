import { env } from "cloudflare:workers";
import { RequestError, json, readJsonObject, toErrorResponse } from "../../_lib/http";
import { themeAssets } from "../../_lib/assets";
import {
  buildCodexBuildPrompt,
  createPublishSession,
  listPublishSessions,
  publicPublishSession,
} from "../../_lib/publish-sessions";
import { requireTrustedBrowserMutation, safeOrigin } from "../../_lib/security";
import { requirePublisher } from "@/lib/auth/server";
import { requireConnectedSocialProfile } from "@/lib/auth/social-profiles";

export async function GET() {
  try {
    const publisher = await requirePublisher();
    const sessions = await listPublishSessions(publisher.id);
    const expiredQuarantine = sessions.filter((session) => session.status === "expired" && session.archiveKey?.startsWith("quarantine/")).map((session) => session.archiveKey as string);
    if (expiredQuarantine.length) await themeAssets().delete(expiredQuarantine).catch(() => undefined);
    return json({ sessions: sessions.map(publicPublishSession) });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const origin = safeOrigin(request, env.SITE_URL);
    requireTrustedBrowserMutation(request, origin);
    const publisher = await requirePublisher();
    const payload = await readJsonObject(request, 8_192);
    const authorPlatform = typeof payload.authorPlatform === "string" ? payload.authorPlatform : "";
    const authorProfile = await requireConnectedSocialProfile(publisher.id, authorPlatform);
    const idempotencyKey = request.headers.get("idempotency-key");
    if (idempotencyKey && !/^[A-Za-z0-9_-]{16,128}$/.test(idempotencyKey)) {
      throw new RequestError(400, "invalid_idempotency_key", "The idempotency key must be 16 to 128 URL-safe characters.");
    }
    const { session, code } = await createPublishSession(publisher, {
      category: "aesthetic",
      authorPlatform: authorProfile.platform,
      authorUrl: authorProfile.url,
      authorProfilesJson: JSON.stringify([authorProfile]),
      idempotencyKey,
    });
    return json({
      session: publicPublishSession(session),
      capability: "build",
      capabilityCode: code,
      prompt: buildCodexBuildPrompt(origin, code, session.buildTokenExpiresAt, [authorProfile]),
    }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
