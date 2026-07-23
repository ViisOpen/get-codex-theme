"use client";

import { X } from "@phosphor-icons/react";
import Image from "next/image";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AuthButtons } from "./AuthButtons";

const OPEN_AUTH_MODAL = "get-codex-theme:open-auth";

type AuthModalDetail = { returnTo?: string };

function safeReturnTo(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/account";
  return value;
}

export function AuthModalTrigger({
  children,
  className = "button button--dark",
  returnTo = "/account",
}: {
  children: ReactNode;
  className?: string;
  returnTo?: string;
}) {
  return (
    <button
      aria-haspopup="dialog"
      className={className}
      onClick={() => window.dispatchEvent(new CustomEvent<AuthModalDetail>(OPEN_AUTH_MODAL, { detail: { returnTo } }))}
      type="button"
    >
      {children}
    </button>
  );
}

export function AuthModal() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [returnTo, setReturnTo] = useState("/account");
  const [oauthError, setOauthError] = useState(false);

  const open = useCallback((nextReturnTo?: string, error = false) => {
    setReturnTo(safeReturnTo(nextReturnTo));
    setOauthError(error);
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const close = useCallback(() => {
    dialogRef.current?.close();
    setOauthError(false);
    const url = new URL(window.location.href);
    if (url.searchParams.has("auth") || url.searchParams.has("error")) {
      url.searchParams.delete("auth");
      url.searchParams.delete("error");
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const handleOpen = (event: Event) => {
      const detail = (event as CustomEvent<AuthModalDetail>).detail;
      open(detail?.returnTo);
    };
    window.addEventListener(OPEN_AUTH_MODAL, handleOpen);

    const params = new URLSearchParams(window.location.search);
    if (params.get("auth") === "sign-in") {
      queueMicrotask(() => {
        if (active) open(window.location.pathname, params.get("error") === "oauth");
      });
    }

    return () => {
      active = false;
      window.removeEventListener(OPEN_AUTH_MODAL, handleOpen);
    };
  }, [open]);

  return (
    <dialog
      aria-labelledby="auth-modal-title"
      className="auth-modal"
      onCancel={(event) => { event.preventDefault(); close(); }}
      onClick={(event) => { if (event.target === event.currentTarget) close(); }}
      ref={dialogRef}
    >
      <div className="auth-modal-shell">
        <button aria-label="Close sign in" className="auth-modal-close" onClick={close} type="button">
          <X size={18} weight="bold" />
        </button>
        <div className="auth-modal-mark" aria-hidden="true">
          <Image
            alt=""
            height={50}
            src="/brand/get-codex-theme-mark.png"
            unoptimized
            width={47}
          />
        </div>
        <span className="eyebrow">PUBLISHER ACCESS</span>
        <h2 id="auth-modal-title">Sign in to<br /><em>share your work.</em></h2>
        <p>Use an identity you already trust. We only use it for contributor attribution and publishing access.</p>
        {oauthError ? <p className="form-error" role="alert">That sign-in attempt did not complete. Choose Google or GitHub to try again.</p> : null}
        <AuthButtons returnTo={returnTo} />
      </div>
    </dialog>
  );
}
