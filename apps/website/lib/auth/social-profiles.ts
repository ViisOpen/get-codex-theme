import { RequestError } from "@/app/api/_lib/http";
import { env } from "cloudflare:workers";
import { getNeonAuth } from "./server";

export type SocialPlatform = "github" | "x";
export type ConnectedSocialProfile = {
  platform: SocialPlatform;
  provider: "github" | "x";
  username: string;
  displayName: string;
  url: string;
};

const GITHUB_USERNAME_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
const X_USERNAME_RE = /^[A-Za-z0-9_]{1,15}$/;
const X_PROFILE_HOSTS = new Set(["x.com", "www.x.com", "twitter.com", "www.twitter.com"]);
const X_RESERVED_PATHS = new Set([
  "compose", "explore", "hashtag", "home", "i", "intent", "login", "messages",
  "notifications", "search", "settings", "share", "signup",
]);

export function socialUsernameFromUrl(platform: SocialPlatform, rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    const host = platform === "github" ? "github.com" : "x.com";
    const parts = url.pathname.split("/").filter(Boolean);
    if (url.protocol !== "https:" || url.hostname.toLowerCase() !== host || parts.length !== 1) return null;
    const username = parts[0];
    const valid = platform === "github" ? GITHUB_USERNAME_RE.test(username) : X_USERNAME_RE.test(username);
    return valid ? username : null;
  } catch {
    return null;
  }
}

export function socialDisplayName(username: string) {
  return `@${username}`;
}

export function parseXProfileInput(rawInput: string) {
  const input = rawInput.trim();
  if (!input || input.length > 512) {
    throw new RequestError(400, "x_profile_invalid", "Enter a valid X profile link, such as https://x.com/username.");
  }

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new RequestError(400, "x_profile_invalid", "Enter the full X profile link, such as https://x.com/username.");
  }

  const parts = url.pathname.split("/").filter(Boolean);
  const username = parts[0] ?? "";
  if (
    url.protocol !== "https:" ||
    !X_PROFILE_HOSTS.has(url.hostname.toLowerCase()) ||
    Boolean(url.username || url.password || url.port || url.search || url.hash) ||
    parts.length !== 1 ||
    !X_USERNAME_RE.test(username) ||
    X_RESERVED_PATHS.has(username.toLowerCase())
  ) {
    throw new RequestError(400, "x_profile_invalid", "Enter an X profile link, not a post or another X page.");
  }

  return {
    platform: "x" as const,
    provider: "x" as const,
    username,
    displayName: socialDisplayName(username),
    url: `https://x.com/${username}`,
  };
}

export async function saveXProfile(db: D1Database, publisherId: string, rawProfileUrl: string) {
  const profile = parseXProfileInput(rawProfileUrl);
  await db.prepare(`INSERT INTO publisher_social_profiles
    (id, publisher_id, platform, username, display_name, profile_url, verified_at)
    VALUES (?, ?, 'x', ?, ?, ?, NULL)
    ON CONFLICT(publisher_id, platform) DO UPDATE SET
      username = excluded.username,
      display_name = excluded.display_name,
      profile_url = excluded.profile_url,
      verified_at = NULL,
      updated_at = CURRENT_TIMESTAMP`)
    .bind(crypto.randomUUID(), publisherId, profile.username, profile.displayName, profile.url)
    .run();
  return profile;
}

export async function listStoredXProfiles(db: D1Database, publisherId: string): Promise<ConnectedSocialProfile[]> {
  const result = await db.prepare(`SELECT username, profile_url
    FROM publisher_social_profiles
    WHERE publisher_id = ? AND platform = 'x'
    LIMIT 1`)
    .bind(publisherId)
    .all<{ username: string; profile_url: string }>();
  return result.results.flatMap((row) => {
    try {
      const profile = parseXProfileInput(row.profile_url);
      return profile.username.toLowerCase() === row.username.toLowerCase() ? [profile] : [];
    } catch {
      return [];
    }
  });
}

export async function listConnectedSocialProfiles(publisherId: string): Promise<ConnectedSocialProfile[]> {
  const auth = getNeonAuth();
  const [accountsResult, storedXProfiles] = await Promise.all([
    auth.listAccounts(),
    listStoredXProfiles(env.DB, publisherId),
  ]);

  const githubProfiles: Array<ConnectedSocialProfile | null> = await Promise.all((accountsResult.data ?? [])
    .filter((account) => account.providerId === "github")
    .map(async (account): Promise<ConnectedSocialProfile | null> => {
      const infoResult = await auth.accountInfo({ query: { accountId: account.accountId } });
      if (infoResult.error || !infoResult.data?.data) return null;
      const providerData = infoResult.data.data as Record<string, unknown>;
      const username = typeof providerData.login === "string" ? providerData.login : "";
      if (!GITHUB_USERNAME_RE.test(username)) return null;
      return {
        platform: "github" as const,
        provider: "github" as const,
        username,
        displayName: socialDisplayName(username),
        url: `https://github.com/${username}`,
      };
    }));

  return [...githubProfiles.filter((profile): profile is ConnectedSocialProfile => profile !== null), ...storedXProfiles]
    .sort((left, right) => left.platform.localeCompare(right.platform));
}

export async function requireConnectedSocialProfile(publisherId: string, platform: string) {
  if (platform !== "github" && platform !== "x") {
    throw new RequestError(400, "invalid_social_platform", "Choose a connected GitHub or X account.");
  }
  const profile = (await listConnectedSocialProfiles(publisherId)).find((item) => item.platform === platform);
  if (!profile) {
    throw new RequestError(403, "social_profile_required", platform === "x"
      ? "Add your public X profile before publishing."
      : "Connect your GitHub account before publishing.");
  }
  return profile;
}

export async function requireConnectedSocialProfiles(publisherId: string, rawPlatforms: unknown) {
  if (!Array.isArray(rawPlatforms) || rawPlatforms.length !== 1) {
    throw new RequestError(400, "invalid_social_platforms", "Choose exactly one connected GitHub or X account.");
  }
  const requested = ["github", "x"].filter((platform): platform is SocialPlatform => rawPlatforms.includes(platform));
  if (requested.length !== rawPlatforms.length || new Set(rawPlatforms).size !== rawPlatforms.length) {
    throw new RequestError(400, "invalid_social_platforms", "Choose each connected profile at most once.");
  }
  const connected = await listConnectedSocialProfiles(publisherId);
  return requested.map((platform) => {
    const profile = connected.find((item) => item.platform === platform);
    if (!profile) {
      throw new RequestError(403, "social_profile_required", platform === "x"
        ? "Add your public X profile before selecting X."
        : "Connect your GitHub account before selecting GitHub.");
    }
    return profile;
  });
}
