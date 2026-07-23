import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Publisher Sign In", robots: { index: false, follow: false } };

function safeReturnTo(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/account";
  return value;
}

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string; returnTo?: string }> }) {
  const params = await searchParams;
  const returnTo = safeReturnTo(params.returnTo);
  const query = new URLSearchParams({ auth: "sign-in" });
  if (params.error === "oauth") query.set("error", "oauth");
  redirect(`${returnTo}?${query.toString()}`);
}
