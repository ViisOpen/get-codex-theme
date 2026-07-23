import { createNeonAuth } from "@neondatabase/auth/next/server";
import { env } from "cloudflare:workers";
import { RequestError } from "@/app/api/_lib/http";

type NeonAuth = ReturnType<typeof createNeonAuth>;

let authInstance: NeonAuth | undefined;

export function neonAuthConfigured() {
  return Boolean(env.NEON_AUTH_BASE_URL && env.NEON_AUTH_COOKIE_SECRET && env.NEON_AUTH_COOKIE_SECRET.length >= 32);
}

export function getNeonAuth() {
  if (authInstance) return authInstance;
  if (!env.NEON_AUTH_BASE_URL || !env.NEON_AUTH_COOKIE_SECRET || env.NEON_AUTH_COOKIE_SECRET.length < 32) {
    throw new RequestError(503, "auth_unavailable", "Publisher sign-in is not configured yet.");
  }
  const baseUrl = new URL(env.NEON_AUTH_BASE_URL);
  if (baseUrl.protocol !== "https:") {
    throw new RequestError(503, "auth_unavailable", "Publisher sign-in is not configured securely.");
  }
  authInstance = createNeonAuth({
    baseUrl: baseUrl.toString(),
    cookies: {
      secret: env.NEON_AUTH_COOKIE_SECRET,
      sameSite: "lax",
      sessionDataTtl: 300,
    },
    logLevel: env.ENVIRONMENT === "production" ? "error" : "warn",
  });
  return authInstance;
}

export async function requirePublisher() {
  const { data: session, error } = await getNeonAuth().getSession();
  if (error) throw new RequestError(401, "invalid_session", "Your sign-in session could not be verified.");
  const user = session?.user;
  if (!user?.id || !user.email) throw new RequestError(401, "sign_in_required", "Sign in with Google or GitHub to continue.");
  return { id: user.id, email: user.email, name: user.name ?? user.email };
}

export async function getOptionalPublisher() {
  if (!neonAuthConfigured()) return null;
  const { data: session, error } = await getNeonAuth().getSession();
  if (error || !session?.user?.id) return null;
  const user = session.user;
  return { id: user.id, email: user.email ?? "", name: user.name ?? user.email ?? "Community member" };
}
