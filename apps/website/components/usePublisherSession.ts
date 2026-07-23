"use client";

import { useCallback, useEffect, useState } from "react";

export type PublisherUser = { id: string; email: string; name?: string | null; image?: string | null };
type PublisherSessionPayload = { user?: PublisherUser | null } | null;

async function readSession(response: Response) {
  if (!response.ok) return null;
  const payload = await response.json() as PublisherSessionPayload;
  return payload?.user ?? null;
}

export function usePublisherSession() {
  const [user, setUser] = useState<PublisherUser | null>(null);
  const [isPending, setPending] = useState(true);

  const refetch = useCallback(async () => {
    setPending(true);
    try {
      const response = await fetch("/api/auth/get-session", { cache: "no-store" });
      setUser(await readSession(response));
    } catch { setUser(null); }
    finally { setPending(false); }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/get-session", { cache: "no-store" })
      .then(readSession)
      .then((nextUser) => { if (active) setUser(nextUser); })
      .catch(() => { if (active) setUser(null); })
      .finally(() => { if (active) setPending(false); });
    return () => { active = false; };
  }, []);

  return { user, isPending, refetch };
}
