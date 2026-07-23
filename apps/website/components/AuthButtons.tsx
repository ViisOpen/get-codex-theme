"use client";

import { GithubLogo, GoogleLogo, SpinnerGap } from "@phosphor-icons/react";
import { useState } from "react";
import { getAuthClient } from "@/lib/auth/client";

export function AuthButtons({ returnTo = "/account" }: { returnTo?: string }) {
  const [pending, setPending] = useState<"google" | "github" | null>(null);
  const [error, setError] = useState("");

  async function signIn(provider: "google" | "github") {
    setPending(provider);
    setError("");
    try {
      const authClient = await getAuthClient();
      const separator = returnTo.includes("?") ? "&" : "?";
      const errorCallbackURL = `${returnTo}${separator}auth=sign-in&error=oauth`;
      const result = await authClient.signIn.social({ provider, callbackURL: returnTo, errorCallbackURL });
      if (result.error) throw new Error(result.error.message || "Sign-in could not start.");
    } catch (cause) {
      setPending(null);
      setError(cause instanceof Error ? cause.message : "Sign-in could not start.");
    }
  }

  return (
    <div className="auth-actions">
      <button className="oauth-button" disabled={pending !== null} onClick={() => signIn("google")} type="button">
        {pending === "google" ? <SpinnerGap className="spin" size={20} /> : <GoogleLogo size={20} weight="bold" />}
        Continue with Google
      </button>
      <button className="oauth-button oauth-button--dark" disabled={pending !== null} onClick={() => signIn("github")} type="button">
        {pending === "github" ? <SpinnerGap className="spin" size={20} /> : <GithubLogo size={20} weight="fill" />}
        Continue with GitHub
      </button>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <p className="auth-note">No password or email registration. Your provider verifies your identity.</p>
    </div>
  );
}
