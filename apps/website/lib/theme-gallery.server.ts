import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { themeLikes, themeSubmissions, type ThemeSubmission } from "@/db/schema";
import { authorDisplayName, firstPartyGalleryTheme, isThemeCategory, parseAuthorProfiles, type GalleryTheme } from "./theme-gallery";
import { getTheme, themes } from "./themes";

type SubmittedManifest = {
  tags?: unknown;
  tagline?: unknown;
  designStory?: unknown;
  palette?: Record<string, unknown>;
  layout?: Record<string, unknown>;
  previewMetadata?: unknown;
};

function parseCommunityTheme(submission: ThemeSubmission, likeCount: number): GalleryTheme | null {
  try {
    const manifest = JSON.parse(submission.manifestJson) as SubmittedManifest;
    const palette = manifest.palette ?? {};
    const layout = manifest.layout ?? {};
    const rawPreview = manifest.previewMetadata as Record<string, unknown> | undefined;
    const previewMetadata: GalleryTheme["previewMetadata"] = rawPreview && (rawPreview.kind === "illustrative" || rawPreview.kind === "verified-capture") && typeof rawPreview.label === "string"
      ? {
          kind: rawPreview.kind,
          label: rawPreview.label,
          ...(rawPreview.renderer === "html-css" || rawPreview.renderer === "native-capture" || rawPreview.renderer === "artwork" ? { renderer: rawPreview.renderer } : {}),
          ...(rawPreview.platform === "macos" || rawPreview.platform === "windows" ? { platform: rawPreview.platform } : {}),
          ...(typeof rawPreview.codexVersion === "string" ? { codexVersion: rawPreview.codexVersion } : {}),
        }
      : { kind: "illustrative" as const, label: "Illustrative preview — provenance metadata unavailable" };
    const tags = Array.isArray(manifest.tags) ? manifest.tags.filter((tag): tag is string => typeof tag === "string").slice(0, 12) : [];
    const accent = typeof palette.accent === "string" ? palette.accent : "#8B7CFF";
    const background = typeof palette.background === "string" ? palette.background : submission.mode === "dark" ? "#08090d" : "#f4f3ef";
    const authors = parseAuthorProfiles(submission.authorProfilesJson, { platform: submission.authorPlatform, url: submission.authorUrl });
    const primaryAuthor = authors[0];
    if (!primaryAuthor) return null;
    const validation = JSON.parse(submission.validationJson) as { coverage?: { profile?: unknown; effectiveScore?: unknown; enabled?: unknown } };
    const rawCoverage = validation.coverage;
    const coverage = {
      profile: rawCoverage?.profile === "complete" ? "complete" as const : "focused" as const,
      effectiveScore: typeof rawCoverage?.effectiveScore === "number" ? rawCoverage.effectiveScore : 100,
      enabled: Array.isArray(rawCoverage?.enabled) ? rawCoverage.enabled.filter((group): group is string => typeof group === "string") : [],
    };
    if (!isThemeCategory(submission.category)) return null;
    return {
      slug: submission.themeId,
      name: submission.name,
      mode: submission.mode,
      tagline: typeof manifest.tagline === "string" ? manifest.tagline : submission.tagline ?? submission.description,
      description: submission.description,
      designStory: typeof manifest.designStory === "string" ? manifest.designStory : submission.designStory ?? undefined,
      accent,
      accentStrong: accent,
      foreground: typeof palette.foreground === "string" ? palette.foreground : submission.mode === "dark" ? "#f7f7f8" : "#171719",
      muted: typeof palette.muted === "string" ? palette.muted : submission.mode === "dark" ? "#a7a7ad" : "#6f6f75",
      surface: typeof palette.surface === "string" ? palette.surface : submission.mode === "dark" ? "rgba(16,16,20,.86)" : "rgba(255,255,255,.86)",
      canvas: background,
      gradient: `url("/api/themes/${encodeURIComponent(submission.themeId)}/assets/preview")`,
      tags: tags.length ? tags : [submission.category, submission.mode],
      focusX: typeof layout.focusX === "number" ? layout.focusX : 75,
      focusY: typeof layout.focusY === "number" ? layout.focusY : 48,
      order: 0,
      version: submission.version,
      category: submission.category,
      authorName: authorDisplayName(authors) || submission.author,
      authorUrl: primaryAuthor.url,
      authorPlatform: primaryAuthor.platform,
      authors,
      source: "community",
      license: submission.license,
      likeCount,
      publishedAt: submission.publishedAt,
      previewUrl: `/api/themes/${encodeURIComponent(submission.themeId)}/assets/preview`,
      previewMetadata,
      coverage,
    };
  } catch {
    return null;
  }
}

async function likeCounts(themeIds: string[]) {
  if (!themeIds.length) return new Map<string, number>();
  const rows = await getDb()
    .select({ themeId: themeLikes.themeId, count: sql<number>`count(*)` })
    .from(themeLikes)
    .where(inArray(themeLikes.themeId, themeIds))
    .groupBy(themeLikes.themeId);
  return new Map(rows.map((row) => [row.themeId, Number(row.count)]));
}

export async function listGalleryThemes() {
  const published = await getDb().select().from(themeSubmissions)
    .where(eq(themeSubmissions.status, "published"))
    .orderBy(desc(themeSubmissions.publishedAt))
    .limit(500);
  const latest = new Map<string, ThemeSubmission>();
  for (const submission of published) if (!latest.has(submission.themeId)) latest.set(submission.themeId, submission);
  const allIds = [...themes.map((theme) => theme.slug), ...latest.keys()];
  const counts = await likeCounts(allIds);
  const firstParty = themes.map((theme) => firstPartyGalleryTheme(theme, counts.get(theme.slug) ?? 0));
  const community = [...latest.values()].map((submission) => parseCommunityTheme(submission, counts.get(submission.themeId) ?? 0)).filter((theme): theme is GalleryTheme => Boolean(theme));
  return [...firstParty, ...community];
}

export async function safeListGalleryThemes() {
  try { return await listGalleryThemes(); }
  catch (error) {
    console.error(JSON.stringify({ level: "error", message: "Theme gallery database query failed", error: error instanceof Error ? error.message : String(error) }));
    return themes.map((theme) => firstPartyGalleryTheme(theme));
  }
}

export async function getGalleryTheme(slug: string) {
  const firstParty = getTheme(slug);
  if (firstParty) {
    const counts = await likeCounts([slug]);
    return firstPartyGalleryTheme(firstParty, counts.get(slug) ?? 0);
  }
  const [submission] = await getDb().select().from(themeSubmissions)
    .where(and(eq(themeSubmissions.themeId, slug), eq(themeSubmissions.status, "published")))
    .orderBy(desc(themeSubmissions.publishedAt)).limit(1);
  if (!submission) return null;
  const counts = await likeCounts([slug]);
  return parseCommunityTheme(submission, counts.get(slug) ?? 0);
}

export async function safeGetGalleryTheme(slug: string) {
  try { return await getGalleryTheme(slug); }
  catch {
    const firstParty = getTheme(slug);
    return firstParty ? firstPartyGalleryTheme(firstParty) : null;
  }
}
