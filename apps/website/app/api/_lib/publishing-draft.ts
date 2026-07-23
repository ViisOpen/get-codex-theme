import type { SubmittedThemeManifest } from "./submission-validator.ts";

export const DRAFT_PREVIEW_KEYS = ["preview", "screenshotHome", "screenshotTask", "screenshotNarrow"] as const;
export type DraftPreviewKey = (typeof DRAFT_PREVIEW_KEYS)[number];
export type DraftPreviewRecord = {
  key: string;
  file: string;
  sha256: string;
  width: number;
  height: number;
  contentType: "image/png" | "image/jpeg" | "image/webp";
};

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, canonicalize(item)]));
}

export function canonicalJson(value: unknown) {
  return JSON.stringify(canonicalize(value));
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function publishingDraftDigest(values: {
  manifest: SubmittedThemeManifest;
  previews: Record<DraftPreviewKey, Omit<DraftPreviewRecord, "key"> | DraftPreviewRecord>;
  category: string;
  authorProfiles: Array<{ platform: string; url: string }>;
}) {
  const previews = Object.fromEntries(DRAFT_PREVIEW_KEYS.map((key) => {
    const preview = values.previews[key];
    return [key, { file: preview.file, sha256: preview.sha256, width: preview.width, height: preview.height, contentType: preview.contentType }];
  }));
  return sha256Hex(canonicalJson({
    manifest: values.manifest,
    previews,
    category: values.category,
    authorProfiles: values.authorProfiles.map(({ platform, url }) => ({ platform, url })),
  }));
}

export function draftAssetKeys(value: string) {
  try {
    const records = JSON.parse(value) as Partial<Record<DraftPreviewKey, DraftPreviewRecord>>;
    return DRAFT_PREVIEW_KEYS.map((key) => records[key]?.key).filter((key): key is string => typeof key === "string");
  } catch {
    return [];
  }
}
