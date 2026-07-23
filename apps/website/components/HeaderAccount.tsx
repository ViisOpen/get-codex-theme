"use client";

import Link from "next/link";
import { usePublisherSession } from "./usePublisherSession";

function accountLabel(name: string | null | undefined, email: string) {
  return name?.trim() || email;
}

export function HeaderAccount() {
  const session = usePublisherSession();

  if (!session.user) {
    return (
      <Link className="button button--light header-cta" href="/account">
        Creator Account <span aria-hidden="true">↗</span>
      </Link>
    );
  }

  const label = accountLabel(session.user.name, session.user.email);
  const initial = label.charAt(0).toUpperCase();

  return (
    <Link
      aria-label={`Open creator account for ${label}`}
      className="header-account header-cta"
      href="/account"
    >
      <span aria-hidden="true" className="header-account-avatar">{initial}</span>
      <span className="header-account-copy">
        <small>Creator account</small>
        <strong>{label}</strong>
      </span>
    </Link>
  );
}
