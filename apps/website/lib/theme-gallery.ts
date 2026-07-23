import type { CodexTheme } from "./themes";
import { CLI_COMMAND } from "./distribution.ts";

export const themeCategories = [
  { id: "characters", label: "Characters" },
  { id: "brands", label: "Tech brands" },
  { id: "gaming", label: "Gaming" },
  { id: "culture", label: "Culture" },
  { id: "aesthetic", label: "Aesthetic" },
] as const;

export type ThemeCategory = (typeof themeCategories)[number]["id"];
export type AuthorPlatform = "github" | "x";
export type AuthorProfile = {
  platform: AuthorPlatform;
  username: string;
  displayName: string;
  url: string;
};

export type GalleryTheme = CodexTheme & {
  version: string;
  category: ThemeCategory;
  authorName: string;
  authorUrl: string;
  authorPlatform: AuthorPlatform;
  authors: AuthorProfile[];
  source: "first-party" | "community";
  license: string;
  likeCount: number;
  publishedAt?: string | null;
  previewUrl: string;
  previewMetadata: { kind: "illustrative" | "verified-capture"; label: string; renderer?: "html-css" | "native-capture" | "artwork"; platform?: "macos" | "windows"; codexVersion?: string };
  coverage: { profile: "focused" | "complete"; effectiveScore: number; enabled: string[] };
};

export function isThemeCategory(value: string): value is ThemeCategory {
  return themeCategories.some((category) => category.id === value);
}

export function inferThemeCategory(theme: { id?: unknown; name?: unknown; description?: unknown; tagline?: unknown; tags?: unknown }): ThemeCategory {
  const text = [
    theme.id,
    theme.name,
    theme.description,
    theme.tagline,
    ...(Array.isArray(theme.tags) ? theme.tags : []),
  ].filter((value): value is string => typeof value === "string").join(" ").toLowerCase();
  const signals: Array<[ThemeCategory, RegExp]> = [
    ["brands", /\b(brand|branded|company|corporate|product|workspace-suite|tech-brand)\b/],
    ["gaming", /\b(game|gaming|gamer|esports|rpg|arcade|cyberpunk)\b/],
    ["characters", /\b(character|hero|villain|anime|mascot|creature|persona)\b/],
    ["culture", /\b(culture|cultural|heritage|music|cinema|film|literature|museum|festival)\b/],
  ];
  return signals.find(([, pattern]) => pattern.test(text))?.[0] ?? "aesthetic";
}

export function normalizeAuthorProfile(platform: string, rawUrl: string) {
  const profile = authorProfileFromUrl(platform, rawUrl);
  return profile ? { platform: profile.platform, url: profile.url } : null;
}

export function authorProfileFromUrl(platform: string, rawUrl: string): AuthorProfile | null {
  if (platform !== "github" && platform !== "x") return null;
  let url: URL;
  try { url = new URL(rawUrl); }
  catch { return null; }
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.search || url.hash) return null;
  const expectedHost = platform === "github" ? "github.com" : "x.com";
  if (url.hostname.toLowerCase() !== expectedHost) return null;
  const parts = url.pathname.split("/").filter(Boolean);
  const usernamePattern = platform === "github"
    ? /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/
    : /^[A-Za-z0-9_]{1,15}$/;
  if (parts.length !== 1 || !usernamePattern.test(parts[0])) return null;
  const username = parts[0];
  return { platform, username, displayName: `@${username}`, url: `https://${expectedHost}/${username}` };
}

export function parseAuthorProfiles(rawJson: string, fallback?: { platform: string; url: string }) {
  let values: unknown = [];
  try { values = JSON.parse(rawJson); }
  catch { /* Fall through to the legacy profile. */ }
  const parsed = Array.isArray(values) ? values.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const record = value as Record<string, unknown>;
    const profile = authorProfileFromUrl(typeof record.platform === "string" ? record.platform : "", typeof record.url === "string" ? record.url : "");
    return profile ? [profile] : [];
  }) : [];
  const unique = parsed.filter((profile, index) => parsed.findIndex((candidate) => candidate.platform === profile.platform) === index).slice(0, 2);
  if (unique.length) return unique;
  const legacy = fallback ? authorProfileFromUrl(fallback.platform, fallback.url) : null;
  return legacy ? [legacy] : [];
}

export function authorDisplayName(profiles: AuthorProfile[]) {
  return [...new Set(profiles.map((profile) => profile.displayName))].join(" & ");
}

export function firstPartyGalleryTheme(theme: CodexTheme, likeCount = 0): GalleryTheme {
  const authorUrl = theme.registry?.authorUrl ?? "https://github.com/ViisOpen/get-codex-theme";
  const authorName = theme.registry?.authorName ?? "Get Codex Theme";
  const normalizedAuthor = authorProfileFromUrl("github", authorUrl);
  const authors = [{
    platform: "github" as const,
    username: normalizedAuthor?.username ?? "ViisOpen",
    displayName: authorName,
    url: authorUrl,
  }];
  return {
    ...theme,
    version: theme.registry?.version ?? "1.0.0",
    category: theme.registry?.category ?? "aesthetic",
    authorName,
    authorUrl,
    authorPlatform: "github",
    authors,
    source: "first-party",
    license: theme.registry?.license ?? "CC BY 4.0",
    likeCount,
    previewUrl: `/theme-packs/${theme.slug}/assets/preview.jpg`,
    previewMetadata: theme.registry?.previewMetadata ?? { kind: "illustrative", label: "Illustrative concept preview — not a live Codex capture" },
    coverage: { profile: "complete", effectiveScore: 100, enabled: ["foundation", "buttons", "icons", "overlaysAndForms", "taskArtifacts", "feedback", "utilityRoutes"] },
  };
}

export function installCommand(slug: string, version?: string) {
  const specifier = version ? `${slug}@${version}` : slug;
  return `${CLI_COMMAND} use ${specifier}`;
}
