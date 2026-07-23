"use client";

import { Heart, SpinnerGap } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

export function ThemeLikeButton({ slug, initialCount, compact = false }: { slug: string; initialCount: number; compact?: boolean }) {
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/themes/${encodeURIComponent(slug)}/like`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json() as { liked?: boolean; likeCount?: number };
        if (response.ok && typeof payload.liked === "boolean" && typeof payload.likeCount === "number") {
          setLiked(payload.liked);
          setCount(payload.likeCount);
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [slug]);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/themes/${encodeURIComponent(slug)}/like`, { method: "POST" });
      const payload = await response.json() as { liked?: boolean; likeCount?: number; error?: { message?: string } };
      if (!response.ok || typeof payload.likeCount !== "number") throw new Error(payload.error?.message ?? "Could not save your like.");
      setLiked(Boolean(payload.liked));
      setCount(payload.likeCount);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save your like.");
    } finally { setBusy(false); }
  }

  return (
    <span className={`theme-like-wrap ${compact ? "theme-like-wrap--compact" : ""}`}>
      <button aria-label={`${liked ? "Remove like from" : "Like"} this theme. ${count} likes.`} aria-pressed={liked} className="theme-like-button" disabled={busy} onClick={() => void toggle()} type="button">
        {busy ? <SpinnerGap className="spin" size={compact ? 15 : 18} /> : <Heart size={compact ? 15 : 18} weight={liked ? "fill" : "regular"} />}
        <span>{count}</span>
      </button>
      {message ? <span className="theme-like-error" role="status">{message}</span> : null}
    </span>
  );
}
