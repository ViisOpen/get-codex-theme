import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { themeSubmissions, type NewThemeSubmission, type ThemeSubmission } from "@/db/schema";
import { parseAuthorProfiles } from "@/lib/theme-gallery";

export async function findSubmissionByThemeVersion(themeId: string, version: string) {
  const [submission] = await getDb().select().from(themeSubmissions).where(and(eq(themeSubmissions.themeId, themeId), eq(themeSubmissions.version, version))).limit(1);
  return submission ?? null;
}

export async function findSubmissionByArchiveSha256(archiveSha256: string) {
  const [submission] = await getDb().select().from(themeSubmissions).where(eq(themeSubmissions.archiveSha256, archiveSha256)).orderBy(asc(themeSubmissions.createdAt)).limit(1);
  return submission ?? null;
}

export async function findThemeNamespaceOwner(themeId: string) {
  const [submission] = await getDb().select({ publisherId: themeSubmissions.publisherId })
    .from(themeSubmissions).where(eq(themeSubmissions.themeId, themeId)).orderBy(asc(themeSubmissions.createdAt)).limit(1);
  return submission?.publisherId ?? null;
}

export async function createSubmission(values: NewThemeSubmission) {
  await getDb().insert(themeSubmissions).values(values);
}

export async function replaceSubmission(id: string, values: Partial<NewThemeSubmission>) {
  await getDb().update(themeSubmissions).set({ ...values, updatedAt: sql`CURRENT_TIMESTAMP` }).where(eq(themeSubmissions.id, id));
}

export async function listPublisherSubmissions(publisherId: string) {
  return getDb().select().from(themeSubmissions).where(eq(themeSubmissions.publisherId, publisherId)).orderBy(desc(themeSubmissions.createdAt)).limit(50);
}

export async function listReviewSubmissions() {
  return getDb().select().from(themeSubmissions).orderBy(desc(themeSubmissions.createdAt)).limit(100);
}

export async function findPublishedSubmission(themeId: string, version?: string | null) {
  const conditions = [eq(themeSubmissions.themeId, themeId), eq(themeSubmissions.status, "published")];
  if (version) conditions.push(eq(themeSubmissions.version, version));
  const [submission] = await getDb().select().from(themeSubmissions).where(and(...conditions)).orderBy(desc(themeSubmissions.publishedAt)).limit(1);
  return submission ?? null;
}

export function publicSubmission(submission: ThemeSubmission) {
  const authors = parseAuthorProfiles(submission.authorProfilesJson, { platform: submission.authorPlatform, url: submission.authorUrl });
  return {
    id: submission.id,
    themeId: submission.themeId,
    version: submission.version,
    name: submission.name,
    description: submission.description,
    tagline: submission.tagline,
    designStory: submission.designStory,
    author: submission.author,
    authorPlatform: submission.authorPlatform,
    authorUrl: submission.authorUrl,
    authors,
    category: submission.category,
    mode: submission.mode,
    license: submission.license,
    status: submission.status,
    archiveSha256: submission.archiveSha256,
    archiveBytes: submission.archiveBytes,
    validation: JSON.parse(submission.validationJson) as unknown,
    galleryAssets: JSON.parse(submission.galleryAssetsJson) as unknown,
    createdAt: submission.createdAt,
    updatedAt: submission.updatedAt,
    publishedAt: submission.publishedAt,
  };
}
