import { env } from "cloudflare:workers";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { themeLikeRateLimits, themeLikes } from "@/db/schema";
import { RequestError } from "./http";
import { getOptionalPublisher } from "@/lib/auth/server";

type LikeActor = { kind: "anonymous" | "user"; keyHash: string };

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hmac(value: string) {
  const configured = env.LIKE_HASH_SECRET;
  if (!configured && env.ENVIRONMENT === "production") throw new RequestError(503, "likes_unavailable", "Likes are temporarily unavailable.");
  const secret = configured ?? "local-development-like-secret-not-for-production";
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return bytesToHex(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))));
}

export async function resolveLikeActor(request: Request): Promise<LikeActor> {
  const publisher = await getOptionalPublisher();
  if (publisher) return { kind: "user", keyHash: await hmac(`user:${publisher.id}`) };
  let address = request.headers.get("cf-connecting-ip")?.trim();
  if (!address) {
    const hostname = new URL(request.url).hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  }
  if (!address) throw new RequestError(400, "anonymous_identity_unavailable", "We could not verify this anonymous like request.");
  return { kind: "anonymous", keyHash: await hmac(`ip:${address}`) };
}

async function consumeWindow(actor: LikeActor, windowSeconds: number, limit: number, now: number) {
  const resetBefore = now - windowSeconds;
  const [row] = await getDb().insert(themeLikeRateLimits).values({
    actorKind: actor.kind,
    actorKeyHash: actor.keyHash,
    windowSeconds,
    windowStartedAt: now,
    requestCount: 1,
  }).onConflictDoUpdate({
    target: [themeLikeRateLimits.actorKind, themeLikeRateLimits.actorKeyHash, themeLikeRateLimits.windowSeconds],
    set: {
      windowStartedAt: sql`CASE WHEN ${themeLikeRateLimits.windowStartedAt} <= ${resetBefore} THEN ${now} ELSE ${themeLikeRateLimits.windowStartedAt} END`,
      requestCount: sql`CASE WHEN ${themeLikeRateLimits.windowStartedAt} <= ${resetBefore} THEN 1 ELSE ${themeLikeRateLimits.requestCount} + 1 END`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    },
  }).returning({ requestCount: themeLikeRateLimits.requestCount, windowStartedAt: themeLikeRateLimits.windowStartedAt });
  if (!row || row.requestCount > limit) {
    const retryAfter = row ? Math.max(1, row.windowStartedAt + windowSeconds - now) : windowSeconds;
    throw new RequestError(429, "like_rate_limited", `Too many like requests. Try again in ${retryAfter} seconds.`);
  }
}

export async function enforceLikeRateLimit(actor: LikeActor) {
  const now = Math.floor(Date.now() / 1000);
  const limits = actor.kind === "user" ? [[60, 30], [3600, 180]] : [[60, 10], [3600, 40]];
  for (const [seconds, limit] of limits) await consumeWindow(actor, seconds, limit, now);
}

export async function toggleThemeLike(themeId: string, actor: LikeActor) {
  const inserted = await getDb().insert(themeLikes).values({ id: crypto.randomUUID(), themeId, actorKind: actor.kind, actorKeyHash: actor.keyHash })
    .onConflictDoNothing().returning({ id: themeLikes.id });
  const liked = inserted.length > 0;
  if (!liked) {
    await getDb().delete(themeLikes).where(and(eq(themeLikes.themeId, themeId), eq(themeLikes.actorKind, actor.kind), eq(themeLikes.actorKeyHash, actor.keyHash)));
  }
  const [count] = await getDb().select({ value: sql<number>`count(*)` }).from(themeLikes).where(eq(themeLikes.themeId, themeId));
  return { liked, likeCount: Number(count?.value ?? 0) };
}

export async function getThemeLikeState(themeId: string, actor: LikeActor) {
  const [liked, count] = await Promise.all([
    getDb().select({ id: themeLikes.id }).from(themeLikes).where(and(eq(themeLikes.themeId, themeId), eq(themeLikes.actorKind, actor.kind), eq(themeLikes.actorKeyHash, actor.keyHash))).limit(1),
    getDb().select({ value: sql<number>`count(*)` }).from(themeLikes).where(eq(themeLikes.themeId, themeId)),
  ]);
  return { liked: liked.length > 0, likeCount: Number(count[0]?.value ?? 0) };
}
