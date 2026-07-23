import { env } from "cloudflare:workers";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { contentReportRateLimits, contentReports, type CONTENT_REPORT_KIND_IDS } from "@/db/schema";
import { RequestError } from "./http";

export type ContentReportKind = (typeof CONTENT_REPORT_KIND_IDS)[number];

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function reportSourceHash(request: Request) {
  const configured = env.LIKE_HASH_SECRET;
  if (!configured && env.ENVIRONMENT === "production") {
    throw new RequestError(503, "reports_unavailable", "Private reports are temporarily unavailable.");
  }
  let address = request.headers.get("cf-connecting-ip")?.trim();
  if (!address) {
    const hostname = new URL(request.url).hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
      address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    }
  }
  if (!address) throw new RequestError(400, "report_identity_unavailable", "We could not verify this report request.");
  const secret = configured ?? "local-development-report-secret-not-for-production";
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`content-report:${address}`));
  return bytesToHex(new Uint8Array(signature));
}

async function consumeWindow(sourceKeyHash: string, windowSeconds: number, limit: number, now: number) {
  const resetBefore = now - windowSeconds;
  const [row] = await getDb().insert(contentReportRateLimits).values({
    sourceKeyHash,
    windowSeconds,
    windowStartedAt: now,
    requestCount: 1,
  }).onConflictDoUpdate({
    target: [contentReportRateLimits.sourceKeyHash, contentReportRateLimits.windowSeconds],
    set: {
      windowStartedAt: sql`CASE WHEN ${contentReportRateLimits.windowStartedAt} <= ${resetBefore} THEN ${now} ELSE ${contentReportRateLimits.windowStartedAt} END`,
      requestCount: sql`CASE WHEN ${contentReportRateLimits.windowStartedAt} <= ${resetBefore} THEN 1 ELSE ${contentReportRateLimits.requestCount} + 1 END`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    },
  }).returning({ requestCount: contentReportRateLimits.requestCount, windowStartedAt: contentReportRateLimits.windowStartedAt });
  if (!row || row.requestCount > limit) {
    const retryAfter = row ? Math.max(1, row.windowStartedAt + windowSeconds - now) : windowSeconds;
    throw new RequestError(429, "report_rate_limited", `Too many reports were submitted. Try again in ${retryAfter} seconds.`);
  }
}

export async function createContentReport(request: Request, values: {
  kind: ContentReportKind;
  themeId: string | null;
  themeVersion: string | null;
  reporterEmail: string | null;
  details: string;
  evidenceUrl: string | null;
}) {
  const sourceKeyHash = await reportSourceHash(request);
  const now = Math.floor(Date.now() / 1000);
  await consumeWindow(sourceKeyHash, 3_600, 5, now);
  await consumeWindow(sourceKeyHash, 86_400, 20, now);
  const id = crypto.randomUUID();
  await getDb().insert(contentReports).values({ id, sourceKeyHash, ...values });
  return { id, reference: `GCT-${id.replaceAll("-", "").slice(0, 12).toUpperCase()}` };
}
