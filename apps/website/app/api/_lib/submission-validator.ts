import JSZip, { type JSZipObject } from "jszip";
import { validateSubmissionComponentTokens, type ComponentCoverageReport } from "./component-contract.ts";

export const MAX_THEME_ARCHIVE_BYTES = 24 * 1024 * 1024;
const MAX_ARCHIVE_FILES = 256;
const MAX_EXPANDED_BYTES = 64 * 1024 * 1024;
const MAX_SINGLE_FILE_BYTES = 12 * 1024 * 1024;
const ARCHIVE_DATE = new Date("2026-01-01T00:00:00.000Z");

const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VERSION_RE = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;
const COLOR_RE = /^(#[0-9a-f]{6}|rgba?\([^\r\n]+\))$/i;
const REQUIRED_PALETTE = ["accent", "background", "foreground", "muted", "surface", "surfaceElevated", "border", "codeBackground", "codeForeground", "inputBackground", "buttonBackground", "buttonForeground"] as const;
const OPTIONAL_PALETTE = ["secondary", "success", "warning", "danger", "focusRing"] as const;
const REQUIRED_ASSETS = ["background16x10", "background16x9", "background4x3", "backgroundFallback", "preview", "screenshotHome", "screenshotTask", "screenshotNarrow", "tokens"] as const;
const OPTIONAL_ASSETS = ["brandLogo", "captureEvidence", "previewEvidence"] as const;
const TOP_LEVEL_KEYS = ["$schema", "schemaVersion", "id", "name", "description", "tagline", "designStory", "version", "mode", "author", "homepage", "tags", "platforms", "delivery", "palette", "layout", "assets", "previewMetadata", "license", "unofficial"];
export const HTML_PREVIEW_RENDERER_VERSION = "1.0.0";
const IMAGE_REQUIREMENTS: Record<string, { width: number; height: number; ratio?: number }> = {
  background16x10: { width: 3200, height: 2000, ratio: 16 / 10 },
  background16x9: { width: 2560, height: 1440, ratio: 16 / 9 },
  background4x3: { width: 2400, height: 1800, ratio: 4 / 3 },
  preview: { width: 1200, height: 750, ratio: 16 / 10 },
  screenshotHome: { width: 1200, height: 750, ratio: 16 / 10 },
  screenshotTask: { width: 1200, height: 750, ratio: 16 / 10 },
  screenshotNarrow: { width: 750, height: 1000, ratio: 3 / 4 },
  brandLogo: { width: 128, height: 64 },
};
const CAPTURE_SPECS = {
  home: { assetKey: "screenshotHome", width: 1200, height: 750, route: "home", requiredInvariants: ["sidebar", "suggestions", "composer"] },
  task: { assetKey: "screenshotTask", width: 1200, height: 750, route: "task", requiredInvariants: ["sidebar", "composer"] },
  narrow: { assetKey: "screenshotNarrow", width: 750, height: 1000, route: "task", requiredInvariants: ["sidebar", "composer"] },
} as const;

export type SubmittedThemeManifest = {
  schemaVersion: 1 | 2;
  id: string;
  name: string;
  description: string;
  tagline?: string;
  designStory?: string;
  version: string;
  mode: "dark" | "light";
  author?: string;
  license: string;
  palette: Record<string, string>;
  layout: { focusX: number; focusY: number; overlayStrength: number; contentSide: "left" | "center" | "right" };
  assets: Record<string, string>;
  previewMetadata: { kind: "illustrative" | "verified-capture"; label: string; renderer?: "html-css" | "native-capture" | "artwork"; rendererVersion?: string; platform?: "macos" | "windows"; codexVersion?: string };
  [key: string]: unknown;
};

export type ThemeSubmissionValidation = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  manifest?: SubmittedThemeManifest;
  archive?: Uint8Array;
  sha256?: string;
  galleryAssets?: Partial<Record<GalleryAssetName, GalleryAsset>>;
  coverage?: ComponentCoverageReport;
};

type CaptureEvidence = {
  schemaVersion?: unknown;
  renderer?: unknown;
  theme?: { id?: unknown; version?: unknown; runtimeFingerprint?: unknown };
  platform?: unknown;
  codexVersion?: unknown;
  captures?: Record<string, { file?: unknown; sha256?: unknown; width?: unknown; height?: unknown; route?: unknown; compatibility?: unknown; invariantSafety?: unknown; invariants?: Record<string, unknown> }>;
};

type HtmlPreviewEvidence = {
  schemaVersion?: unknown;
  renderer?: unknown;
  rendererVersion?: unknown;
  browserVersion?: unknown;
  theme?: { id?: unknown; version?: unknown; fingerprint?: unknown };
  states?: Record<string, { state?: unknown; file?: unknown; sha256?: unknown; width?: unknown; height?: unknown }>;
};

export const GALLERY_ASSET_NAMES = ["preview", "screenshotHome", "screenshotTask", "screenshotNarrow", "background16x9"] as const;
export type GalleryAssetName = (typeof GALLERY_ASSET_NAMES)[number];
export type GalleryAsset = { bytes: Uint8Array; contentType: "image/png" | "image/jpeg" | "image/webp"; extension: "png" | "jpg" | "webp" };

function galleryAssetType(type: string): Omit<GalleryAsset, "bytes"> | null {
  if (type === "PNG") return { contentType: "image/png", extension: "png" };
  if (type === "JPEG") return { contentType: "image/jpeg", extension: "jpg" };
  if (type === "WebP") return { contentType: "image/webp", extension: "webp" };
  return null;
}

function safeArchivePath(value: string) {
  if (!value || value.includes("\\") || value.startsWith("/") || /^[a-z]:/i.test(value) || /[\u0000-\u001f]/.test(value)) return false;
  const parts = value.split("/").filter(Boolean);
  return parts.length > 0 && !parts.includes(".") && !parts.includes("..");
}

async function sha256(bytes: Uint8Array) {
  const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function htmlPreviewThemeFingerprint(manifest: SubmittedThemeManifest, read: (path: string) => Promise<Uint8Array>) {
  const sourceAssetKeys = ["background16x10", "tokens", ...(manifest.assets.brandLogo ? ["brandLogo"] : [])];
  const files: Record<string, { path: string; sha256: string }> = {};
  for (const key of sourceAssetKeys) {
    const relativePath = manifest.assets[key];
    files[key] = { path: relativePath, sha256: await sha256(await read(relativePath)) };
  }
  return sha256(new TextEncoder().encode(JSON.stringify({
    schemaVersion: manifest.schemaVersion,
    rendererVersion: HTML_PREVIEW_RENDERER_VERSION,
    id: manifest.id,
    version: manifest.version,
    name: manifest.name,
    mode: manifest.mode,
    palette: manifest.palette,
    layout: manifest.layout,
    files,
  })));
}

function imageDimensions(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length >= 24 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) {
    return { type: "PNG", width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    const markers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) { offset += 1; continue; }
      const marker = bytes[offset + 1];
      offset += 2;
      if (marker === 0xd8 || marker === 0xd9) continue;
      if (offset + 2 > bytes.length) break;
      const length = view.getUint16(offset);
      if (markers.has(marker) && offset + 7 <= bytes.length) {
        return { type: "JPEG", width: view.getUint16(offset + 5), height: view.getUint16(offset + 3) };
      }
      offset += Math.max(length, 2);
    }
  }
  if (bytes.length >= 30 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") {
    const kind = String.fromCharCode(...bytes.slice(12, 16));
    const uint24 = (offset: number) => bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
    if (kind === "VP8X") return { type: "WebP", width: 1 + uint24(24), height: 1 + uint24(27) };
    if (kind === "VP8L") {
      const bits = view.getUint32(21, true);
      return { type: "WebP", width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (kind === "VP8 " && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
      return { type: "WebP", width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
    }
  }
  throw new Error("expected a valid PNG, JPEG, or WebP image");
}

function objectKeys(value: unknown, label: string, allowed: readonly string[], errors: string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return errors.push(`${label} must be an object`);
  for (const key of Object.keys(value)) if (!allowed.includes(key)) errors.push(`${label} contains unknown field: ${key}`);
}

function enumArray(value: unknown, label: string, allowed: readonly string[], errors: string[]) {
  if (!Array.isArray(value) || value.length === 0) return errors.push(`${label} must be a non-empty array`);
  if (new Set(value).size !== value.length) errors.push(`${label} must not contain duplicates`);
  for (const item of value) if (typeof item !== "string" || !allowed.includes(item)) errors.push(`${label} contains unsupported value: ${String(item)}`);
}

function range(value: unknown, label: string, min: number, max: number, errors: string[]) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) errors.push(`${label} must be between ${min} and ${max}`);
}

function parseCssColor(value: unknown) {
  if (typeof value !== "string") return null;
  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value.trim());
  if (hex) return { r: Number.parseInt(hex[1], 16), g: Number.parseInt(hex[2], 16), b: Number.parseInt(hex[3], 16), a: 1 };
  const functional = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i.exec(value.trim());
  if (!functional) return null;
  const [r, g, b] = functional.slice(1, 4).map(Number);
  const a = functional[4] === undefined ? 1 : Number(functional[4]);
  if (![r, g, b, a].every(Number.isFinite) || [r, g, b].some((channel) => channel < 0 || channel > 255) || a < 0 || a > 1) return null;
  return { r, g, b, a };
}

function colorContrast(colorA: { r: number; g: number; b: number }, colorB: { r: number; g: number; b: number }) {
  const luminance = (color: { r: number; g: number; b: number }) => {
    const [r, g, b] = [color.r, color.g, color.b].map((value) => {
      const channel = value / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const first = luminance(colorA), second = luminance(colorB);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

const EDITORIAL_PLACEHOLDER_RE = /(?:\b(?:todo|tbd|placeholder|lorem ipsum|replace me|coming soon)\b|ask the author|your (?:theme|tagline|description)|is an original visual theme for codex desktop)/i;
const EDITORIAL_PROHIBITED_RE = /(?:<\/?[a-z][^>]*>|\b(?:javascript|data):|\bofficial\s+(?:openai|codex)\b|\b(?:endorsed|approved|certified)\s+by\s+openai\b)/i;
const UNSAFE_TEXT_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/;

function normalizedEditorialText(value: unknown) {
  return typeof value === "string" ? value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US") : "";
}

function validateEditorialField(value: unknown, label: string, min: number, max: number, errors: string[]) {
  if (typeof value !== "string") {
    errors.push(`${label} must contain ${min}-${max} characters`);
    return;
  }
  if (value !== value.trim()) errors.push(`${label} must not start or end with whitespace`);
  if (value !== value.normalize("NFKC")) errors.push(`${label} must use normalized Unicode text`);
  if (value.length < min || value.length > max) errors.push(`${label} must contain ${min}-${max} characters`);
  if (EDITORIAL_PLACEHOLDER_RE.test(value)) errors.push(`${label} still contains placeholder or default template text`);
  if (EDITORIAL_PROHIBITED_RE.test(value) || UNSAFE_TEXT_RE.test(value)) errors.push(`${label} contains prohibited markup, control characters, or misleading affiliation language`);
}

function validatePublishingPresentation(manifest: Record<string, unknown>, errors: string[]) {
  validateEditorialField(manifest.name, "name", 2, 80, errors);
  validateEditorialField(manifest.description, "description", 40, 240, errors);
  validateEditorialField(manifest.tagline, "tagline", 12, 100, errors);
  validateEditorialField(manifest.designStory, "designStory", 120, 1200, errors);
  const normalized = ["description", "tagline", "designStory"].map((key) => normalizedEditorialText(manifest[key]));
  if (normalized[0] && normalized[0] === normalized[1]) errors.push("description and tagline must contain distinct public copy");
  if (normalized[0] && normalized[0] === normalized[2]) errors.push("description and designStory must contain distinct public copy");
  if (normalized[1] && normalized[1] === normalized[2]) errors.push("tagline and designStory must contain distinct public copy");
  if (!Array.isArray(manifest.tags) || manifest.tags.length < 2 || manifest.tags.length > 12 || manifest.tags.some((tag) => typeof tag !== "string" || tag.length > 32 || !ID_RE.test(tag))) {
    errors.push("publishing tags must contain 2-12 unique kebab-case strings of at most 32 characters");
  }
}

function validateManifest(value: unknown, errors: string[], { publishing = false } = {}) {
  const manifest = value as Record<string, unknown>;
  const required = ["schemaVersion", "id", "name", "description", "version", "mode", "platforms", "delivery", "palette", "layout", "assets", "previewMetadata", "license", "unofficial"];
  if (manifest.schemaVersion === 2 || publishing) required.push("tagline", "designStory", "tags");
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    errors.push("manifest.json must contain a JSON object");
    return undefined;
  }
  for (const key of required) if (manifest[key] === undefined) errors.push(`missing required field: ${key}`);
  objectKeys(manifest, "manifest", TOP_LEVEL_KEYS, errors);
  objectKeys(manifest.palette, "palette", [...REQUIRED_PALETTE, ...OPTIONAL_PALETTE], errors);
  objectKeys(manifest.layout, "layout", ["focusX", "focusY", "overlayStrength", "contentSide"], errors);
  objectKeys(manifest.assets, "assets", [...REQUIRED_ASSETS, ...OPTIONAL_ASSETS], errors);
  objectKeys(manifest.previewMetadata, "previewMetadata", ["kind", "label", "renderer", "rendererVersion", "platform", "codexVersion"], errors);
  if (manifest.schemaVersion !== 1 && manifest.schemaVersion !== 2) errors.push("schemaVersion must equal 1 or 2");
  if (publishing && manifest.schemaVersion !== 2) errors.push("publishing requires manifest schemaVersion 2");
  if (typeof manifest.id !== "string" || !ID_RE.test(manifest.id) || manifest.id.length > 64) errors.push("id must be lowercase kebab-case with at most 64 characters");
  if (typeof manifest.name !== "string" || manifest.name.length < 1 || manifest.name.length > 80) errors.push("name must contain 1-80 characters");
  if (typeof manifest.description !== "string" || manifest.description.length < 20 || manifest.description.length > 240) errors.push("description must contain 20-240 characters");
  if (manifest.schemaVersion === 2 || publishing) validatePublishingPresentation(manifest, errors);
  if (typeof manifest.version !== "string" || !VERSION_RE.test(manifest.version)) errors.push("version must be semantic x.y.z");
  if (manifest.mode !== "dark" && manifest.mode !== "light") errors.push("mode must be dark or light");
  if (manifest.unofficial !== true) errors.push("unofficial must be true");
  if (typeof manifest.license !== "string" || manifest.license.length < 1 || manifest.license.length > 80) errors.push("license must contain 1-80 characters");
  if (manifest.author !== undefined && (typeof manifest.author !== "string" || manifest.author.length < 1 || manifest.author.length > 80)) errors.push("author must contain 1-80 characters");
  if (manifest.homepage !== undefined) {
    try { new URL(String(manifest.homepage)); } catch { errors.push("homepage must be a valid absolute URL"); }
  }
  enumArray(manifest.platforms, "platforms", ["macos", "windows"], errors);
  enumArray(manifest.delivery, "delivery", ["native-if-supported", "visual-cdp"], errors);
  if (manifest.tags !== undefined) {
    if (!Array.isArray(manifest.tags) || manifest.tags.length < 1 || manifest.tags.length > 12 || manifest.tags.some((tag) => typeof tag !== "string" || !ID_RE.test(tag))) errors.push("tags must contain 1-12 unique kebab-case strings");
    else if (new Set(manifest.tags).size !== manifest.tags.length) errors.push("tags must be unique");
  }
  const palette = manifest.palette as Record<string, unknown> | undefined;
  for (const key of REQUIRED_PALETTE) if (!COLOR_RE.test(String(palette?.[key] ?? "")) || !parseCssColor(palette?.[key])) errors.push(`palette.${key} must be a valid six-digit hex, rgb(), or rgba() color`);
  for (const key of OPTIONAL_PALETTE) if (palette?.[key] !== undefined && (!COLOR_RE.test(String(palette[key])) || !parseCssColor(palette[key]))) errors.push(`palette.${key} must be a valid six-digit hex, rgb(), or rgba() color`);
  const background = parseCssColor(palette?.background);
  const border = parseCssColor(palette?.border);
  if (background?.a === 1 && border) {
    const visible = { r: border.r * border.a + background.r * (1 - border.a), g: border.g * border.a + background.g * (1 - border.a), b: border.b * border.a + background.b * (1 - border.a) };
    const ratio = colorContrast(visible, background);
    if (ratio < 3) errors.push(`palette.border must have at least 3:1 contrast against palette.background after alpha compositing; got ${ratio.toFixed(2)}:1`);
  }
  const previewMetadata = manifest.previewMetadata as Record<string, unknown> | undefined;
  if (previewMetadata?.kind !== "illustrative" && previewMetadata?.kind !== "verified-capture") errors.push("previewMetadata.kind must be illustrative or verified-capture");
  if (typeof previewMetadata?.label !== "string" || previewMetadata.label.length < 12 || previewMetadata.label.length > 100) errors.push("previewMetadata.label must contain 12-100 characters");
  if (previewMetadata?.kind === "illustrative" && !/illustrative|concept/i.test(String(previewMetadata.label ?? ""))) errors.push("illustrative previewMetadata.label must identify the images as illustrative or concept previews");
  if (previewMetadata?.renderer !== undefined && previewMetadata.renderer !== "html-css" && previewMetadata.renderer !== "native-capture" && previewMetadata.renderer !== "artwork") errors.push("previewMetadata.renderer must be html-css, native-capture, or artwork");
  if (previewMetadata?.renderer === "html-css" && manifest.schemaVersion === 2 && previewMetadata.rendererVersion !== HTML_PREVIEW_RENDERER_VERSION) errors.push(`HTML/CSS previews must use rendererVersion ${HTML_PREVIEW_RENDERER_VERSION}`);
  if (previewMetadata?.kind === "verified-capture") {
    if (previewMetadata.platform !== "macos" && previewMetadata.platform !== "windows") errors.push("verified captures must record previewMetadata.platform");
    if (typeof previewMetadata.codexVersion !== "string" || previewMetadata.codexVersion.length < 1 || previewMetadata.codexVersion.length > 40) errors.push("verified captures must record previewMetadata.codexVersion");
  }
  const layout = manifest.layout as Record<string, unknown> | undefined;
  range(layout?.focusX, "layout.focusX", 0, 100, errors);
  range(layout?.focusY, "layout.focusY", 0, 100, errors);
  range(layout?.overlayStrength, "layout.overlayStrength", 0, 1, errors);
  if (!(["left", "center", "right"] as unknown[]).includes(layout?.contentSide)) errors.push("layout.contentSide must be left, center, or right");
  return manifest as SubmittedThemeManifest;
}

export function validatePublishingManifest(value: unknown) {
  const errors: string[] = [];
  const manifest = validateManifest(value, errors, { publishing: true });
  return { valid: Boolean(manifest) && errors.length === 0, errors: [...new Set(errors)], manifest };
}

export function inspectDraftPreview(bytes: Uint8Array, assetKey: "preview" | "screenshotHome" | "screenshotTask" | "screenshotNarrow") {
  const image = imageDimensions(bytes);
  const requirement = IMAGE_REQUIREMENTS[assetKey];
  if (!requirement || image.width !== requirement.width || image.height !== requirement.height) {
    throw new Error(`${assetKey} must be exactly ${requirement?.width ?? 0}x${requirement?.height ?? 0} for draft review`);
  }
  const type = galleryAssetType(image.type);
  if (!type) throw new Error(`${assetKey} must be PNG, JPEG, or WebP`);
  return { ...image, ...type };
}

function advertisedSize(entry: JSZipObject) {
  return Number((entry as JSZipObject & { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0);
}

export async function validateThemeSubmissionArchive(input: Uint8Array, { publishing = false } = {}): Promise<ThemeSubmissionValidation> {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (input.byteLength <= 0 || input.byteLength > MAX_THEME_ARCHIVE_BYTES) {
    return { valid: false, errors: [`Theme ZIP must be between 1 byte and ${MAX_THEME_ARCHIVE_BYTES / 1024 / 1024} MB.`], warnings };
  }
  let zip: JSZip;
  try { zip = await JSZip.loadAsync(input); }
  catch { return { valid: false, errors: ["The uploaded file is not a readable ZIP archive."], warnings }; }

  const entries = Object.values(zip.files);
  if (entries.length > MAX_ARCHIVE_FILES) errors.push(`Theme ZIP contains more than ${MAX_ARCHIVE_FILES} entries.`);
  let expandedBytes = 0;
  for (const entry of entries) {
    const original = (entry as JSZipObject & { unsafeOriginalName?: string }).unsafeOriginalName ?? entry.name;
    if (!safeArchivePath(original.replace(/\/$/, "")) || original !== entry.name) errors.push(`Unsafe archive path: ${original}`);
    if (!entry.dir) {
      const size = advertisedSize(entry);
      if (size > MAX_SINGLE_FILE_BYTES) errors.push(`Archive entry exceeds ${MAX_SINGLE_FILE_BYTES / 1024 / 1024} MB: ${entry.name}`);
      expandedBytes += size;
    }
  }
  if (expandedBytes > MAX_EXPANDED_BYTES) errors.push(`Theme ZIP expands beyond ${MAX_EXPANDED_BYTES / 1024 / 1024} MB.`);
  if (errors.length) return { valid: false, errors: [...new Set(errors)], warnings };

  const cache = new Map<string, Uint8Array>();
  const galleryAssets: Partial<Record<GalleryAssetName, GalleryAsset>> = {};
  let coverage: ComponentCoverageReport | undefined;
  let actualExpandedBytes = 0;
  const read = async (path: string) => {
    const cached = cache.get(path);
    if (cached) return cached;
    const entry = zip.file(path);
    if (!entry) throw new Error(`Missing file: ${path}`);
    const bytes = await entry.async("uint8array");
    if (bytes.byteLength > MAX_SINGLE_FILE_BYTES) throw new Error(`Archive entry exceeds ${MAX_SINGLE_FILE_BYTES / 1024 / 1024} MB: ${path}`);
    actualExpandedBytes += bytes.byteLength;
    if (actualExpandedBytes > MAX_EXPANDED_BYTES) throw new Error(`Theme ZIP expands beyond ${MAX_EXPANDED_BYTES / 1024 / 1024} MB.`);
    cache.set(path, bytes);
    return bytes;
  };

  const manifestEntry = zip.file("manifest.json");
  if (!manifestEntry) return { valid: false, errors: ["Theme ZIP must contain manifest.json at its root."], warnings };
  let manifest: SubmittedThemeManifest | undefined;
  try {
    const bytes = await read("manifest.json");
    if (bytes.byteLength > 128 * 1024) throw new Error("manifest.json exceeds 128 KB");
    manifest = validateManifest(JSON.parse(new TextDecoder().decode(bytes)), errors, { publishing });
  } catch (error) {
    errors.push(`Invalid manifest.json: ${error instanceof Error ? error.message : "invalid JSON"}`);
  }
  if (!manifest) return { valid: false, errors: [...new Set(errors)], warnings };

  const assetPaths = new Map<string, string>();
  for (const key of [...REQUIRED_ASSETS, ...OPTIONAL_ASSETS.filter((key) => manifest?.assets?.[key] !== undefined)]) {
    const path = manifest.assets?.[key];
    if (typeof path !== "string" || !safeArchivePath(path)) {
      errors.push(`assets.${key} must be a safe relative path`);
      continue;
    }
    if (!zip.file(path)) {
      errors.push(`Missing asset: ${path}`);
      continue;
    }
    assetPaths.set(key, path);
  }

  for (const [key, path] of assetPaths) {
    try {
      const bytes = await read(path);
      if (key === "tokens" || key === "captureEvidence" || key === "previewEvidence") continue;
      const image = imageDimensions(bytes);
      const requirement = IMAGE_REQUIREMENTS[key];
      if (requirement && (image.width < requirement.width || image.height < requirement.height)) errors.push(`assets.${key} must be at least ${requirement.width}x${requirement.height}; got ${image.width}x${image.height}`);
      if (requirement?.ratio && Math.abs(image.width / image.height - requirement.ratio) > 0.025) errors.push(`assets.${key} has the wrong aspect ratio`);
      if ((GALLERY_ASSET_NAMES as readonly string[]).includes(key)) {
        const type = galleryAssetType(image.type);
        if (type) galleryAssets[key as GalleryAssetName] = { bytes, ...type };
      }
    } catch (error) {
      errors.push(`Invalid asset ${path}: ${error instanceof Error ? error.message : "could not inspect file"}`);
    }
  }

  if (manifest.previewMetadata.kind === "verified-capture") {
    const evidencePath = assetPaths.get("captureEvidence");
    if (!evidencePath) errors.push("verified captures must declare assets.captureEvidence");
    else {
      try {
        const evidence = JSON.parse(new TextDecoder().decode(await read(evidencePath))) as CaptureEvidence;
        if (evidence.schemaVersion !== 1 || evidence.renderer !== "codex-native-cdp") errors.push("capture evidence must use the codex-native-cdp v1 renderer contract");
        if (evidence.theme?.id !== manifest.id || evidence.theme?.version !== manifest.version) errors.push("capture evidence theme identity must match the manifest");
        const runtimeFiles: Record<string, { path: string; sha256: string }> = {};
        for (const key of ["background16x10", "background16x9", "background4x3", "backgroundFallback", "tokens"] as const) {
          const file = manifest.assets[key];
          runtimeFiles[key] = { path: file, sha256: await sha256(await read(file)) };
        }
        const runtimeFingerprint = await sha256(new TextEncoder().encode(JSON.stringify({
          schemaVersion: manifest.schemaVersion,
          id: manifest.id,
          version: manifest.version,
          mode: manifest.mode,
          delivery: manifest.delivery,
          palette: manifest.palette,
          layout: manifest.layout,
          files: runtimeFiles,
        })));
        if (evidence.theme?.runtimeFingerprint !== runtimeFingerprint) errors.push("capture evidence runtime fingerprint must match the published theme files");
        if (evidence.platform !== manifest.previewMetadata.platform || evidence.codexVersion !== manifest.previewMetadata.codexVersion) errors.push("capture evidence platform and Codex version must match previewMetadata");
        for (const [state, spec] of Object.entries(CAPTURE_SPECS)) {
          const record = evidence.captures?.[state];
          const previewPath = manifest.assets[spec.assetKey];
          const invariantMismatch = spec.requiredInvariants.some((name) => record?.invariants?.[name] !== "verified");
          if (!record || record.file !== previewPath || record.width !== spec.width || record.height !== spec.height || record.route !== spec.route || record.compatibility !== "verified" || record.invariantSafety === "fallback" || invariantMismatch) {
            errors.push(`capture evidence for ${state} must match the native ${spec.width}x${spec.height} ${spec.route} contract`);
            continue;
          }
          if (await sha256(await read(previewPath)) !== record.sha256) errors.push(`capture evidence hash does not match ${previewPath}`);
        }
      } catch (error) {
        errors.push(`Invalid capture evidence: ${error instanceof Error ? error.message : "invalid JSON"}`);
      }
    }
  }

  if (manifest.previewMetadata.renderer === "html-css") {
    const evidencePath = assetPaths.get("previewEvidence");
    if (!evidencePath) errors.push("HTML/CSS previews must declare assets.previewEvidence");
    else {
      try {
        const evidence = JSON.parse(new TextDecoder().decode(await read(evidencePath))) as HtmlPreviewEvidence;
        if (evidence.schemaVersion !== 1 || evidence.renderer !== "get-codex-theme-html-css" || evidence.rendererVersion !== HTML_PREVIEW_RENDERER_VERSION) {
          errors.push(`preview evidence must use get-codex-theme-html-css renderer ${HTML_PREVIEW_RENDERER_VERSION}`);
        }
        const fingerprint = await htmlPreviewThemeFingerprint(manifest, read);
        if (evidence.theme?.id !== manifest.id || evidence.theme?.version !== manifest.version || evidence.theme?.fingerprint !== fingerprint) {
          errors.push("preview evidence theme identity and fingerprint must match the rendered theme files");
        }
        for (const [state, spec] of Object.entries(CAPTURE_SPECS)) {
          const record = evidence.states?.[state];
          const previewPath = manifest.assets[spec.assetKey];
          if (!record || record.state !== state || record.file !== previewPath || record.width !== spec.width || record.height !== spec.height) {
            errors.push(`preview evidence for ${state} must match the ${spec.width}x${spec.height} HTML/CSS renderer contract`);
            continue;
          }
          if (await sha256(await read(previewPath)) !== record.sha256) errors.push(`preview evidence hash does not match ${previewPath}`);
        }
        if (await sha256(await read(manifest.assets.preview)) !== await sha256(await read(manifest.assets.screenshotHome))) {
          errors.push("assets.preview must match the rendered home state for HTML/CSS previews");
        }
      } catch (error) {
        errors.push(`Invalid preview evidence: ${error instanceof Error ? error.message : "invalid JSON"}`);
      }
    }
  }

  try {
    const tokens = JSON.parse(new TextDecoder().decode(await read(manifest.assets.tokens)));
    if (tokens.id !== manifest.id || tokens.mode !== manifest.mode || JSON.stringify(tokens.palette) !== JSON.stringify(manifest.palette) || JSON.stringify(tokens.layout) !== JSON.stringify(manifest.layout)) {
      errors.push("tokens file must mirror manifest id, mode, palette, and layout");
    }
    const componentValidation = validateSubmissionComponentTokens(tokens);
    errors.push(...componentValidation.errors);
    warnings.push(...componentValidation.warnings);
    coverage = componentValidation.coverage;
  } catch (error) {
    errors.push(`Invalid tokens file: ${error instanceof Error ? error.message : "invalid JSON"}`);
  }

  try {
    const license = new TextDecoder().decode(await read("LICENSE-ASSETS.txt"));
    if (/\bpending\b|replace this file|do not publish|\bunlicensed\b|\btbd\b|project use|review[^\r\n]{0,80}(?:redistribut|publish)|not (?:cleared|approved) for (?:redistribut|publish)/i.test(license)) errors.push("LICENSE-ASSETS.txt still contains draft, restricted-use, or unresolved redistribution rights language");
    for (const label of ["Source:", "Author:", "Method:", "License:"]) if (!license.includes(label)) errors.push(`LICENSE-ASSETS.txt must record ${label.slice(0, -1).toLowerCase()}`);
  } catch { errors.push("Missing LICENSE-ASSETS.txt"); }

  const checksummed = new Set<string>();
  try {
    const checksumText = new TextDecoder().decode(await read("checksums.sha256"));
    const lines = checksumText.split(/\r?\n/).filter(Boolean);
    if (!lines.length) throw new Error("checksums.sha256 is empty");
    for (const line of lines) {
      const match = /^([0-9a-f]{64})\s{2}(.+)$/i.exec(line);
      if (!match || !safeArchivePath(match[2])) throw new Error("checksums.sha256 contains an invalid entry");
      const actual = await sha256(await read(match[2]));
      if (actual !== match[1].toLowerCase()) errors.push(`Checksum mismatch: ${match[2]}`);
      checksummed.add(match[2]);
    }
    for (const path of new Set(["manifest.json", "LICENSE-ASSETS.txt", ...assetPaths.values()])) if (!checksummed.has(path)) errors.push(`checksums.sha256 is missing: ${path}`);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Missing checksums.sha256");
  }
  if (errors.length) return { valid: false, errors: [...new Set(errors)], warnings: [...new Set(warnings)], manifest, coverage };

  const keep = new Set(["manifest.json", "LICENSE-ASSETS.txt", ...assetPaths.values()]);
  const ignored = entries.filter((entry) => !entry.dir && !keep.has(entry.name) && entry.name !== "checksums.sha256" && entry.name !== "README.md").map((entry) => entry.name);
  if (ignored.length) warnings.push(`${ignored.length} undeclared file${ignored.length === 1 ? " was" : "s were"} removed; the Registry publishes declared theme assets only.`);

  const sanitized = new JSZip();
  const files = new Map<string, Uint8Array>();
  const canonicalManifest = new TextEncoder().encode(`${JSON.stringify(manifest, null, 2)}\n`);
  files.set("manifest.json", canonicalManifest);
  for (const path of keep) if (path !== "manifest.json") files.set(path, await read(path));
  files.set("README.md", new TextEncoder().encode(`# ${manifest.name}\n\nThis theme-only pack passed authoritative automated server validation on Get Codex Theme. The published CLI supplies the audited runtime during installation.\n`));
  for (const [path, bytes] of [...files.entries()].sort(([a], [b]) => a.localeCompare(b))) sanitized.file(path, bytes, { date: ARCHIVE_DATE });
  const checksumLines = await Promise.all([...files.entries()].sort(([a], [b]) => a.localeCompare(b)).map(async ([path, bytes]) => `${await sha256(bytes)}  ${path}`));
  sanitized.file("checksums.sha256", `${checksumLines.join("\n")}\n`, { date: ARCHIVE_DATE });
  const archive = await sanitized.generateAsync({ type: "uint8array", platform: "UNIX", compression: "DEFLATE", compressionOptions: { level: 6 } });
  return { valid: true, errors: [], warnings: [...new Set(warnings)], manifest, archive, sha256: await sha256(archive), galleryAssets, coverage };
}
