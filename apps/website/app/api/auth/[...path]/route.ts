import { apiError, toErrorResponse } from "../../_lib/http";
import { getNeonAuth } from "@/lib/auth/server";

type AuthContext = { params: Promise<{ path: string[] }> };
type AuthMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

async function handle(method: AuthMethod, request: Request, context: AuthContext) {
  try {
    const { path } = await context.params;
    const route = path.join("/");
    const allowed =
      (method === "GET" && ["get-session", "get-access-token", "callback/google", "callback/github"].includes(route)) ||
      (method === "POST" && ["sign-in/social", "link-social", "sign-out", "refresh-token"].includes(route));
    if (!allowed) return apiError(404, "auth_route_not_found", "This application supports Google or GitHub sign-in and verified GitHub profile linking through Neon Auth only.");
    if (method === "POST" && route === "sign-in/social") {
      const payload = await request.clone().json().catch(() => null) as { provider?: unknown } | null;
      if (payload?.provider !== "google" && payload?.provider !== "github") {
        return apiError(400, "unsupported_auth_provider", "Choose Google or GitHub to sign in.");
      }
    }
    if (method === "POST" && route === "link-social") {
      const payload = await request.clone().json().catch(() => null) as { provider?: unknown } | null;
      if (payload?.provider !== "github") {
        return apiError(400, "unsupported_social_provider", "Connect a GitHub account through Neon Auth.");
      }
    }
    const handler = getNeonAuth().handler()[method];
    return await handler(request, { params: Promise.resolve({ path }) });
  } catch (error) {
    if (error instanceof TypeError && /URL/.test(error.message)) {
      return apiError(503, "auth_unavailable", "Publisher sign-in is not configured yet.");
    }
    return toErrorResponse(error);
  }
}

export const GET = (request: Request, context: AuthContext) => handle("GET", request, context);
export const POST = (request: Request, context: AuthContext) => handle("POST", request, context);
export const PUT = (request: Request, context: AuthContext) => handle("PUT", request, context);
export const DELETE = (request: Request, context: AuthContext) => handle("DELETE", request, context);
export const PATCH = (request: Request, context: AuthContext) => handle("PATCH", request, context);
