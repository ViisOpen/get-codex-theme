"use client";

async function loadAuthClient() {
  const { createAuthClient } = await import("@neondatabase/auth/next");
  return createAuthClient();
}

let authClientPromise: ReturnType<typeof loadAuthClient> | undefined;

export function getAuthClient() {
  authClientPromise ??= loadAuthClient();
  return authClientPromise;
}
