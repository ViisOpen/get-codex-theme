import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getNeonAuth, neonAuthConfigured } from "@/lib/auth/server";

const OAUTH_SESSION_VERIFIER = "neon_auth_session_verifier";

export async function proxy(request: NextRequest) {
  if (!request.nextUrl.searchParams.has(OAUTH_SESSION_VERIFIER)) {
    return NextResponse.next();
  }

  if (!neonAuthConfigured()) {
    const fallback = new URL("/account?auth=sign-in&error=oauth", request.url);
    return NextResponse.redirect(fallback);
  }

  return getNeonAuth().middleware({ loginUrl: "/auth/sign-in" })(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|_vinext/image|favicon.ico).*)"],
};
