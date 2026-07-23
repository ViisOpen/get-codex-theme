import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { chmod, copyFile, cp, lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { unzipSync, zipSync } from "fflate";
import { analyzeImageTheme, applyImageCandidateToManifest, createResponsiveThemeAssets } from "./image-theme.mjs";
import { AuthoringCancelledError, promptForAuthoring, validateAuthoringOptions } from "./authoring-wizard.mjs";
import { prepareThemeDraft, publishThemePack, publishThemeSession, readSubmissionCode } from "./publisher.mjs";
import { HTML_PREVIEW_RENDERER_VERSION, HTML_PREVIEW_SPECS, renderHtmlThemePreviews } from "./html-preview-renderer.mjs";
import {
  componentCoverageReport,
  createComponentContract,
  validateComponentContract,
} from "./component-contract.mjs";
import {
  captureRuntimePreview,
  diagnoseRuntime,
  isRuntimePaused,
  PREVIEW_CAPTURE_SPECS,
  readRuntimeState,
  runRuntimeAction,
  runSurfaceAction,
  verifyRuntime,
} from "./runtime-control.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const PACKAGE_ROOT = path.resolve(HERE, "..");
export const REPOSITORY_ROOT = path.resolve(HERE, "../../..");
export const DEFAULT_THEMES_ROOT = path.join(REPOSITORY_ROOT, "themes/free");
export const DEFAULT_REGISTRY_URL = "https://getcodextheme.com";

function isRepositoryCheckout() {
  const expectedPackageRoot = path.join(REPOSITORY_ROOT, "packages", "theme-cli");
  try {
    return realpathSync(PACKAGE_ROOT) === realpathSync(expectedPackageRoot) &&
      existsSync(path.join(REPOSITORY_ROOT, ".git")) &&
      existsSync(path.join(REPOSITORY_ROOT, "package.json"));
  } catch {
    return false;
  }
}

const MAX_ARCHIVE_BYTES = 128 * 1024 * 1024;
const MAX_ARCHIVE_FILES = 256;
const MAX_EXTRACTED_BYTES = 384 * 1024 * 1024;
const COLOR_RE = /^(#[0-9a-f]{6}|rgba?\([^\r\n]+\))$/i;
const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VERSION_RE = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;
const REQUIRED_PALETTE = [
  "accent", "background", "foreground", "muted", "surface",
  "surfaceElevated", "border", "codeBackground", "codeForeground",
  "inputBackground", "buttonBackground", "buttonForeground",
];
const OPTIONAL_PALETTE = ["secondary", "success", "warning", "danger", "focusRing"];
const ALLOWED_PALETTE = [...REQUIRED_PALETTE, ...OPTIONAL_PALETTE];
const REQUIRED_ASSETS = [
  "background16x10", "background16x9", "background4x3",
  "backgroundFallback", "preview", "screenshotHome", "screenshotTask",
  "screenshotNarrow", "tokens",
];
const OPTIONAL_ASSETS = ["brandLogo", "captureEvidence", "previewEvidence"];
const ALLOWED_ASSETS = [...REQUIRED_ASSETS, ...OPTIONAL_ASSETS];
const ALLOWED_TOP_LEVEL = [
  "$schema", "schemaVersion", "id", "name", "description", "tagline", "designStory", "version", "mode",
  "author", "homepage", "tags", "platforms", "delivery", "palette", "layout",
  "assets", "previewMetadata", "license", "unofficial",
];

const IMAGE_REQUIREMENTS = {
  background16x10: { ratio: 16 / 10, width: 3200, height: 2000 },
  background16x9: { ratio: 16 / 9, width: 2560, height: 1440 },
  background4x3: { ratio: 4 / 3, width: 2400, height: 1800 },
  preview: { ratio: 16 / 10, width: 1200, height: 750 },
  screenshotHome: { ratio: 16 / 10, width: 1200, height: 750 },
  screenshotTask: { ratio: 16 / 10, width: 1200, height: 750 },
  screenshotNarrow: { ratio: 3 / 4, width: 750, height: 1000 },
  brandLogo: { width: 128, height: 64 },
};
const PREVIEW_STATE_ASSET_KEYS = Object.freeze({
  home: "screenshotHome",
  task: "screenshotTask",
  narrow: "screenshotNarrow",
});

function inspectImage(filePath) {
  const data = readFileSync(filePath);
  if (data.length >= 24 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { type: "PNG", width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
  }
  if (data.length >= 4 && data[0] === 0xff && data[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < data.length) {
      if (data[offset] !== 0xff) { offset += 1; continue; }
      const marker = data[offset + 1];
      offset += 2;
      if (marker === 0xd8 || marker === 0xd9) continue;
      if (offset + 2 > data.length) break;
      const length = data.readUInt16BE(offset);
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker) && offset + 7 <= data.length) {
        return { type: "JPEG", width: data.readUInt16BE(offset + 5), height: data.readUInt16BE(offset + 3) };
      }
      offset += Math.max(length, 2);
    }
  }
  if (data.length >= 30 && data.subarray(0, 4).toString("ascii") === "RIFF" && data.subarray(8, 12).toString("ascii") === "WEBP") {
    const kind = data.subarray(12, 16).toString("ascii");
    if (kind === "VP8X") return { type: "WebP", width: 1 + data.readUIntLE(24, 3), height: 1 + data.readUIntLE(27, 3) };
    if (kind === "VP8L") {
      const bits = data.readUInt32LE(21);
      return { type: "WebP", width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (kind === "VP8 " && data.subarray(23, 26).equals(Buffer.from([0x9d, 0x01, 0x2a]))) {
      return { type: "WebP", width: data.readUInt16LE(26) & 0x3fff, height: data.readUInt16LE(28) & 0x3fff };
    }
  }
  throw new Error("unsupported or corrupt image; expected PNG, JPEG, or WebP");
}

function staysInside(root, candidate) {
  const relative = path.relative(realpathSync(root), realpathSync(candidate));
  return Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function titleFromId(id) {
  return id.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
}

function defaultPalette(mode) {
  return mode === "light" ? {
    accent: "#2563EB", background: "#F6F7F9", foreground: "#17181B",
    muted: "#667085", surface: "rgba(255, 255, 255, 0.82)",
    surfaceElevated: "rgba(255, 255, 255, 0.94)", border: "rgba(23, 24, 27, 0.48)",
    codeBackground: "rgba(239, 242, 247, 0.94)", codeForeground: "#20242B",
    inputBackground: "rgba(255, 255, 255, 0.92)", buttonBackground: "#17181B",
    buttonForeground: "#FFFFFF",
  } : {
    accent: "#8B7CFF", background: "#0A0910", foreground: "#F7F5FF",
    muted: "#B8B3CC", surface: "rgba(17, 14, 29, 0.86)",
    surfaceElevated: "rgba(29, 25, 44, 0.94)", border: "rgba(247, 245, 255, 0.37)",
    codeBackground: "rgba(10, 8, 18, 0.92)", codeForeground: "#F4F1FF",
    inputBackground: "rgba(21, 18, 33, 0.92)", buttonBackground: "#F7F5FF",
    buttonForeground: "#14111F",
  };
}

export function createManifest({ id, name = titleFromId(id), mode = "dark" }) {
  return {
    $schema: "https://getcodextheme.com/schema/manifest-v2.json",
    schemaVersion: 2,
    id,
    name,
    description: "TODO: Ask the author for a concise, factual description of this theme.",
    tagline: "TODO: Ask the author for a short original tagline.",
    designStory: "TODO: Ask the author to explain the visual intent, intended working experience, important composition choices, and concrete color decisions in their own words before publishing.",
    version: "1.0.0",
    mode,
    author: "Get Codex Theme contributors",
    homepage: `https://getcodextheme.com/themes/${id}`,
    tags: [mode, "community"],
    platforms: ["macos", "windows"],
    delivery: ["visual-cdp"],
    palette: defaultPalette(mode),
    layout: { focusX: 50, focusY: 50, overlayStrength: mode === "dark" ? 0.76 : 0.62, contentSide: "center" },
    assets: {
      background16x10: "assets/background.jpg",
      background16x9: "assets/background-16x9.jpg",
      background4x3: "assets/background-4x3.jpg",
      backgroundFallback: "assets/background.jpg",
      preview: "assets/preview.jpg",
      screenshotHome: "screenshots/home.jpg",
      screenshotTask: "screenshots/task.jpg",
      screenshotNarrow: "screenshots/narrow.jpg",
      tokens: "tokens/visual-theme.json",
    },
    previewMetadata: {
      kind: "illustrative",
      label: "Illustrative concept preview — not a live Codex capture",
    },
    license: "Unlicensed draft — choose before publishing",
    unofficial: true,
  };
}

const EDITORIAL_PLACEHOLDER_RE = /(?:\b(?:todo|tbd|placeholder|lorem ipsum|replace me|coming soon)\b|ask the author|your (?:theme|tagline|description)|is an original visual theme for codex desktop)/i;
const EDITORIAL_PROHIBITED_RE = /(?:<\/?[a-z][^>]*>|\b(?:javascript|data):|\bofficial\s+(?:openai|codex)\b|\b(?:endorsed|approved|certified)\s+by\s+openai\b)/i;
const UNSAFE_TEXT_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/;

function normalizedEditorialText(value) {
  return typeof value === "string" ? value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US") : "";
}

function validateEditorialField(value, label, min, max, errors) {
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

function validatePublishingPresentation(manifest, errors) {
  validateEditorialField(manifest?.name, "name", 2, 80, errors);
  validateEditorialField(manifest?.description, "description", 40, 240, errors);
  validateEditorialField(manifest?.tagline, "tagline", 12, 100, errors);
  validateEditorialField(manifest?.designStory, "designStory", 120, 1200, errors);
  const normalized = ["description", "tagline", "designStory"].map((key) => normalizedEditorialText(manifest?.[key]));
  if (normalized[0] && normalized[0] === normalized[1]) errors.push("description and tagline must contain distinct public copy");
  if (normalized[0] && normalized[0] === normalized[2]) errors.push("description and designStory must contain distinct public copy");
  if (normalized[1] && normalized[1] === normalized[2]) errors.push("tagline and designStory must contain distinct public copy");
  if (!Array.isArray(manifest?.tags) || manifest.tags.length < 2 || manifest.tags.length > 12 || manifest.tags.some((tag) => typeof tag !== "string" || tag.length > 32 || !ID_RE.test(tag))) {
    errors.push("publishing tags must contain 2-12 unique kebab-case strings of at most 32 characters");
  }
}

export function validateManifest(manifest, { packDirectory, strictAssets = false, publishing = false } = {}) {
  const errors = [];
  const warnings = [];
  let coverage = componentCoverageReport(null);
  const missingAssets = new Set();
  const required = ["schemaVersion", "id", "name", "description", "version", "mode", "platforms", "delivery", "palette", "layout", "assets", "license", "unofficial"];
  if (manifest?.schemaVersion === 2 || publishing) required.push("tagline", "designStory", "tags", "previewMetadata");
  for (const key of required) if (manifest?.[key] === undefined) errors.push(`missing required field: ${key}`);
  validateObjectKeys(manifest, "manifest", ALLOWED_TOP_LEVEL, errors);
  validateObjectKeys(manifest?.palette, "palette", ALLOWED_PALETTE, errors);
  validateObjectKeys(manifest?.layout, "layout", ["focusX", "focusY", "overlayStrength", "contentSide"], errors);
  validateObjectKeys(manifest?.assets, "assets", ALLOWED_ASSETS, errors);
  if (manifest?.previewMetadata !== undefined) {
    validateObjectKeys(manifest.previewMetadata, "previewMetadata", ["kind", "label", "renderer", "rendererVersion", "platform", "codexVersion"], errors);
    if (!["illustrative", "verified-capture"].includes(manifest.previewMetadata?.kind)) errors.push("previewMetadata.kind must be illustrative or verified-capture");
    if (typeof manifest.previewMetadata?.label !== "string" || manifest.previewMetadata.label.length < 12 || manifest.previewMetadata.label.length > 100) {
      errors.push("previewMetadata.label must contain 12-100 characters");
    }
    if (manifest.previewMetadata?.kind === "illustrative" && !/illustrative|concept/i.test(manifest.previewMetadata?.label ?? "")) {
      errors.push("illustrative previewMetadata.label must identify the images as illustrative or concept previews");
    }
    if (manifest.previewMetadata?.renderer !== undefined && !["html-css", "native-capture", "artwork"].includes(manifest.previewMetadata.renderer)) {
      errors.push("previewMetadata.renderer must be html-css, native-capture, or artwork");
    }
    if (manifest.previewMetadata?.renderer === "html-css" && manifest?.schemaVersion === 2 && manifest.previewMetadata.rendererVersion !== HTML_PREVIEW_RENDERER_VERSION) {
      errors.push(`HTML/CSS previews must use rendererVersion ${HTML_PREVIEW_RENDERER_VERSION}`);
    }
    if (manifest.previewMetadata?.kind === "verified-capture") {
      if (!["macos", "windows"].includes(manifest.previewMetadata?.platform)) errors.push("verified captures must record previewMetadata.platform");
      if (typeof manifest.previewMetadata?.codexVersion !== "string" || manifest.previewMetadata.codexVersion.length < 1 || manifest.previewMetadata.codexVersion.length > 40) errors.push("verified captures must record previewMetadata.codexVersion");
    }
  } else if (strictAssets) {
    errors.push("release-ready packs must include previewMetadata so consumers can disclose illustrative previews or verified captures");
  }
  if (manifest?.schemaVersion !== 1 && manifest?.schemaVersion !== 2) errors.push("schemaVersion must equal 1 or 2");
  if (publishing && manifest?.schemaVersion !== 2) errors.push("publishing requires manifest schemaVersion 2");
  if (!ID_RE.test(manifest?.id ?? "")) errors.push("id must be lowercase kebab-case");
  if (typeof manifest?.name !== "string" || manifest.name.length < 1 || manifest.name.length > 80) errors.push("name must contain 1-80 characters");
  if (typeof manifest?.description !== "string" || manifest.description.length < 20 || manifest.description.length > 240) errors.push("description must contain 20-240 characters");
  if (publishing) validatePublishingPresentation(manifest, errors);
  else if (manifest?.schemaVersion === 2) {
    if (typeof manifest?.tagline !== "string" || manifest.tagline.length < 12 || manifest.tagline.length > 100) errors.push("tagline must contain 12-100 characters");
    if (typeof manifest?.designStory !== "string" || manifest.designStory.length < 120 || manifest.designStory.length > 1200) errors.push("designStory must contain 120-1200 characters");
  }
  if (!VERSION_RE.test(manifest?.version ?? "")) errors.push("version must be semantic x.y.z");
  if (!["dark", "light"].includes(manifest?.mode)) errors.push("mode must be dark or light");
  if (manifest?.unofficial !== true) errors.push("unofficial must be true");
  if (typeof manifest?.license !== "string" || manifest.license.length < 1 || manifest.license.length > 80) errors.push("license must contain 1-80 characters");
  if (manifest?.author !== undefined && (typeof manifest.author !== "string" || manifest.author.length < 1 || manifest.author.length > 80)) errors.push("author must contain 1-80 characters");
  if (manifest?.homepage !== undefined) {
    try { new URL(manifest.homepage); }
    catch { errors.push("homepage must be a valid absolute URL"); }
  }

  validateEnumArray(manifest?.platforms, "platforms", ["macos", "windows"], errors);
  validateEnumArray(manifest?.delivery, "delivery", ["native-if-supported", "visual-cdp"], errors);
  if (manifest?.tags !== undefined) {
    if (!Array.isArray(manifest.tags) || manifest.tags.length < 1 || manifest.tags.some((tag) => !ID_RE.test(tag))) errors.push("tags must be a non-empty array of kebab-case strings");
    else if (new Set(manifest.tags).size !== manifest.tags.length) errors.push("tags must be unique");
  }

  for (const key of REQUIRED_PALETTE) {
    if (!COLOR_RE.test(manifest?.palette?.[key] ?? "") || !parseCssColor(manifest?.palette?.[key])) errors.push(`palette.${key} must be a valid six-digit hex, rgb(), or rgba() color`);
  }
  for (const key of OPTIONAL_PALETTE) {
    if (manifest?.palette?.[key] !== undefined && (!COLOR_RE.test(manifest.palette[key]) || !parseCssColor(manifest.palette[key]))) {
      errors.push(`palette.${key} must be a valid six-digit hex, rgb(), or rgba() color`);
    }
  }
  const backgroundColor = parseCssColor(manifest?.palette?.background);
  const borderColor = parseCssColor(manifest?.palette?.border);
  if (backgroundColor?.a === 1 && borderColor) {
    const visibleBorder = compositeCssColor(borderColor, backgroundColor);
    const ratio = cssContrastRatio(visibleBorder, backgroundColor);
    if (ratio < 3) errors.push(`palette.border must have at least 3:1 contrast against palette.background after alpha compositing; got ${ratio.toFixed(2)}:1`);
  }
  for (const key of ["focusX", "focusY"]) validateRange(manifest?.layout?.[key], `layout.${key}`, 0, 100, errors);
  validateRange(manifest?.layout?.overlayStrength, "layout.overlayStrength", 0, 1, errors);
  if (!["left", "center", "right"].includes(manifest?.layout?.contentSide)) errors.push("layout.contentSide must be left, center, or right");

  const assetKeys = [...REQUIRED_ASSETS, ...OPTIONAL_ASSETS.filter((key) => manifest?.assets?.[key] !== undefined)];
  for (const key of assetKeys) {
    const value = manifest?.assets?.[key];
    if (typeof value !== "string" || value.length === 0) {
      errors.push(`assets.${key} must be a relative path`);
      continue;
    }
    if (path.isAbsolute(value) || value.split(/[\\/]/).includes("..")) {
      errors.push(`assets.${key} must stay inside the theme pack`);
      continue;
    }
    const assetPath = packDirectory ? path.join(packDirectory, value) : null;
    if (assetPath && !existsSync(assetPath)) {
      const message = `missing asset: ${value}`;
      if (!missingAssets.has(value)) (strictAssets || key === "tokens" ? errors : warnings).push(message);
      missingAssets.add(value);
      continue;
    }
    if (strictAssets && assetPath) {
      try {
        if (!staysInside(packDirectory, assetPath)) throw new Error("resolves outside the theme pack");
        if (!statSync(assetPath).isFile()) throw new Error("is not a regular file");
        if (!["tokens", "captureEvidence", "previewEvidence"].includes(key)) {
          const image = inspectImage(assetPath);
          const requirement = IMAGE_REQUIREMENTS[key];
          if (requirement && (image.width < requirement.width || image.height < requirement.height)) {
            errors.push(`assets.${key} must be at least ${requirement.width}x${requirement.height}; got ${image.width}x${image.height}`);
          }
          if (requirement?.ratio && Math.abs(image.width / image.height - requirement.ratio) > 0.025) {
            errors.push(`assets.${key} has the wrong aspect ratio; expected ${requirement.ratio.toFixed(4)}, got ${(image.width / image.height).toFixed(4)}`);
          }
        }
      } catch (error) {
        errors.push(`invalid asset ${value}: ${error.message}`);
      }
    }
  }
  if (strictAssets && packDirectory) {
    const licensePath = path.join(packDirectory, "LICENSE-ASSETS.txt");
    if (!existsSync(licensePath)) errors.push("missing LICENSE-ASSETS.txt");
    else {
      const licenseText = readFileSync(licensePath, "utf8");
      if (/\bpending\b|replace this file|do not publish|\bunlicensed\b|\btbd\b|project use|review[^\r\n]{0,80}(?:redistribut|publish)|not (?:cleared|approved) for (?:redistribut|publish)/i.test(licenseText)) {
        errors.push("LICENSE-ASSETS.txt still contains draft, restricted-use, or unresolved redistribution rights language");
      }
      for (const label of ["Source:", "Author:", "Method:", "License:"]) {
        if (!licenseText.includes(label)) errors.push(`LICENSE-ASSETS.txt must record ${label.slice(0, -1).toLowerCase()}`);
      }
    }
    if (manifest.previewMetadata?.kind === "verified-capture") {
      const evidenceRelative = manifest.assets?.captureEvidence;
      if (typeof evidenceRelative !== "string") errors.push("verified captures must declare assets.captureEvidence");
      else {
        const evidencePath = containedAssetPath(packDirectory, evidenceRelative, "assets.captureEvidence");
        if (existsSync(evidencePath)) {
          try {
            const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
            if (evidence.schemaVersion !== 1 || evidence.renderer !== "codex-native-cdp") errors.push("capture evidence must use the codex-native-cdp v1 renderer contract");
            if (evidence.theme?.id !== manifest.id || evidence.theme?.version !== manifest.version) errors.push("capture evidence theme identity must match the manifest");
            if (evidence.theme?.runtimeFingerprint !== runtimeThemeFingerprintSync(packDirectory, manifest)) errors.push("capture evidence runtime fingerprint must match the published theme files");
            if (evidence.platform !== manifest.previewMetadata.platform || evidence.codexVersion !== manifest.previewMetadata.codexVersion) errors.push("capture evidence platform and Codex version must match previewMetadata");
            for (const [state, assetKey] of Object.entries(PREVIEW_STATE_ASSET_KEYS)) {
              const record = evidence.captures?.[state];
              const relativePath = manifest.assets?.[assetKey];
              const spec = PREVIEW_CAPTURE_SPECS[state];
              const invariantMismatch = spec.requiredInvariants.some((name) => record?.invariants?.[name] !== "verified");
              if (!record || record.file !== relativePath || record.width !== spec.width || record.height !== spec.height || record.route !== spec.route || record.compatibility !== "verified" || record.invariantSafety === "fallback" || invariantMismatch) {
                errors.push(`capture evidence for ${state} must match the native ${spec.width}x${spec.height} ${spec.route} contract`);
                continue;
              }
              const previewPath = containedAssetPath(packDirectory, relativePath, `assets.${assetKey}`);
              if (existsSync(previewPath) && sha256(readFileSync(previewPath)) !== record.sha256) errors.push(`capture evidence hash does not match ${relativePath}`);
            }
          } catch (error) {
            errors.push(`invalid capture evidence: ${error.message}`);
          }
        }
      }
    }
    if (manifest.previewMetadata?.renderer === "html-css") {
      const evidenceRelative = manifest.assets?.previewEvidence;
      if (typeof evidenceRelative !== "string") errors.push("HTML/CSS previews must declare assets.previewEvidence");
      else {
        const evidencePath = containedAssetPath(packDirectory, evidenceRelative, "assets.previewEvidence");
        if (existsSync(evidencePath)) {
          try {
            const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
            if (evidence.schemaVersion !== 1 || evidence.renderer !== "get-codex-theme-html-css" || evidence.rendererVersion !== HTML_PREVIEW_RENDERER_VERSION) {
              errors.push(`preview evidence must use get-codex-theme-html-css renderer ${HTML_PREVIEW_RENDERER_VERSION}`);
            }
            if (evidence.theme?.id !== manifest.id || evidence.theme?.version !== manifest.version || evidence.theme?.fingerprint !== htmlPreviewThemeFingerprintSync(packDirectory, manifest)) {
              errors.push("preview evidence theme identity and fingerprint must match the rendered theme files");
            }
            for (const [state, assetKey] of Object.entries(PREVIEW_STATE_ASSET_KEYS)) {
              const record = evidence.states?.[state];
              const relativePath = manifest.assets?.[assetKey];
              const spec = HTML_PREVIEW_SPECS[state];
              if (!record || record.state !== state || record.file !== relativePath || record.width !== spec.width || record.height !== spec.height) {
                errors.push(`preview evidence for ${state} must match the ${spec.width}x${spec.height} HTML/CSS renderer contract`);
                continue;
              }
              const previewPath = containedAssetPath(packDirectory, relativePath, `assets.${assetKey}`);
              if (existsSync(previewPath) && sha256(readFileSync(previewPath)) !== record.sha256) errors.push(`preview evidence hash does not match ${relativePath}`);
            }
            const home = containedAssetPath(packDirectory, manifest.assets.screenshotHome, "assets.screenshotHome");
            const galleryPreview = containedAssetPath(packDirectory, manifest.assets.preview, "assets.preview");
            if (existsSync(home) && existsSync(galleryPreview) && sha256(readFileSync(home)) !== sha256(readFileSync(galleryPreview))) {
              errors.push("assets.preview must match the rendered home state for HTML/CSS previews");
            }
          } catch (error) {
            errors.push(`invalid preview evidence: ${error.message}`);
          }
        }
      }
    }
  }
  if (packDirectory && typeof manifest?.assets?.tokens === "string") {
    const tokenPath = path.join(packDirectory, manifest.assets.tokens);
    if (existsSync(tokenPath)) {
      try {
        const tokens = JSON.parse(readFileSync(tokenPath, "utf8"));
        if (tokens.id !== manifest.id || tokens.mode !== manifest.mode || JSON.stringify(tokens.palette) !== JSON.stringify(manifest.palette) || JSON.stringify(tokens.layout) !== JSON.stringify(manifest.layout)) {
          errors.push("tokens/visual-theme.json must mirror manifest id, mode, palette, and layout");
        }
        const componentValidation = validateComponentContract(tokens);
        errors.push(...componentValidation.errors);
        warnings.push(...componentValidation.warnings);
        coverage = componentValidation.report;
      } catch (error) {
        errors.push(`invalid tokens file: ${error.message}`);
      }
    }
  }
  return { valid: errors.length === 0, errors, warnings, coverage };
}

function validateEnumArray(value, key, allowed, errors) {
  if (!Array.isArray(value) || value.length === 0) return errors.push(`${key} must be a non-empty array`);
  if (new Set(value).size !== value.length) errors.push(`${key} must not contain duplicates`);
  for (const entry of value) if (!allowed.includes(entry)) errors.push(`${key} contains unsupported value: ${entry}`);
}

function validateObjectKeys(value, label, allowed, errors) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    errors.push(`${label} must be an object`);
    return;
  }
  for (const key of Object.keys(value)) if (!allowed.includes(key)) errors.push(`${label} contains unknown field: ${key}`);
}

function validateRange(value, key, min, max, errors) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) errors.push(`${key} must be between ${min} and ${max}`);
}

function parseCssColor(value) {
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

function compositeCssColor(foreground, background) {
  return {
    r: foreground.r * foreground.a + background.r * (1 - foreground.a),
    g: foreground.g * foreground.a + background.g * (1 - foreground.a),
    b: foreground.b * foreground.a + background.b * (1 - foreground.a),
    a: 1,
  };
}

function cssContrastRatio(colorA, colorB) {
  const luminance = (color) => {
    const [r, g, b] = [color.r, color.g, color.b].map((value) => {
      const channel = value / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const first = luminance(colorA);
  const second = luminance(colorB);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

export async function readManifest(input) {
  const absolute = path.resolve(input);
  const manifestPath = (await isDirectory(absolute)) ? path.join(absolute, "manifest.json") : absolute;
  const raw = await readFile(manifestPath, "utf8");
  return { manifest: JSON.parse(raw), manifestPath, packDirectory: path.dirname(manifestPath) };
}

export async function readVisualThemeTokens(input) {
  const { manifest, packDirectory } = await readManifest(input);
  const tokenPath = path.join(packDirectory, manifest.assets?.tokens ?? "tokens/visual-theme.json");
  return { manifest, packDirectory, tokenPath, tokens: JSON.parse(await readFile(tokenPath, "utf8")) };
}

async function isDirectory(target) {
  try { return (await stat(target)).isDirectory(); }
  catch { return false; }
}

export async function createThemePack({ id, name, mode = "dark", outputDirectory = process.cwd(), authoringPath = "assisted", components, authoringSource = "manual", preset }) {
  if (!ID_RE.test(id)) throw new Error("Theme id must be lowercase kebab-case.");
  if (!["dark", "light"].includes(mode)) throw new Error("Mode must be dark or light.");
  const packDirectory = path.resolve(outputDirectory, id);
  if (existsSync(packDirectory)) throw new Error(`Refusing to overwrite existing directory: ${packDirectory}`);
  const manifest = createManifest({ id, name, mode });
  const componentContract = createComponentContract(manifest.palette, { path: authoringPath, components, source: authoringSource, preset });
  const tokens = { schemaVersion: 2, id, mode, palette: manifest.palette, layout: manifest.layout, ...componentContract };
  await Promise.all([
    mkdir(path.join(packDirectory, "assets"), { recursive: true }),
    mkdir(path.join(packDirectory, "screenshots"), { recursive: true }),
    mkdir(path.join(packDirectory, "tokens"), { recursive: true }),
  ]);
  await writeFile(path.join(packDirectory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(path.join(packDirectory, "tokens/visual-theme.json"), `${JSON.stringify(tokens, null, 2)}\n`);
  await writeFile(path.join(packDirectory, "assets/EXPECTED_FILES.md"), expectedFilesDocument(manifest));
  await writeFile(path.join(packDirectory, "screenshots/EXPECTED_FILES.md"), expectedScreenshotsDocument(manifest));
  await writeFile(path.join(packDirectory, "LICENSE-ASSETS.txt"), "Replace this file with the asset source, author, generation method, and redistribution license before release.\n");
  await writeFile(path.join(packDirectory, "README.md"), themeReadmeDocument(manifest));
  return { packDirectory, manifest, tokens };
}

export async function createThemePackFromImage({ imagePath, id, name, mode = "dark", outputDirectory = process.cwd(), authoringPath = "assisted", components, preset = "soft" }) {
  const created = await createThemePack({ id, name, mode, outputDirectory, authoringPath, components, authoringSource: "image", preset });
  try {
    const imageTheme = await analyzeImageTheme(path.resolve(imagePath), { mode });
    applyImageCandidateToManifest(created.manifest, imageTheme);
    const assets = await createResponsiveThemeAssets(path.resolve(imagePath), created.packDirectory, imageTheme);
    const tokens = {
      ...imageTheme.tokens,
      id: created.manifest.id,
      mode: created.manifest.mode,
      palette: created.manifest.palette,
      layout: created.manifest.layout,
      ...createComponentContract(created.manifest.palette, { path: authoringPath, components, source: "image", preset }),
    };
    await Promise.all([
      writeFile(path.join(created.packDirectory, "manifest.json"), `${JSON.stringify(created.manifest, null, 2)}\n`),
      writeFile(path.join(created.packDirectory, "tokens/visual-theme.json"), `${JSON.stringify(tokens, null, 2)}\n`),
      writeFile(path.join(created.packDirectory, "tokens/image-analysis.json"), `${JSON.stringify({
        schemaVersion: 1,
        source: imageTheme.source,
        analysis: imageTheme.analysis,
      }, null, 2)}\n`),
    ]);
    return { ...created, imageTheme, assets };
  } catch (error) {
    await rm(created.packDirectory, { recursive: true, force: true });
    throw error;
  }
}

export async function createReleaseArchive(input, { outputPath, publishing = false } = {}) {
  const { manifest, packDirectory } = await readManifest(input);
  const validation = validateManifest(manifest, { packDirectory, strictAssets: true, publishing });
  if (!validation.valid) throw new Error(`Theme pack is not release-ready:\n- ${validation.errors.join("\n- ")}`);
  const archivePath = path.resolve(outputPath ?? `${manifest.id}-v${manifest.version}.zip`);
  if (existsSync(archivePath)) throw new Error(`Refusing to overwrite existing archive: ${archivePath}`);
  const selected = new Set(["manifest.json", "LICENSE-ASSETS.txt", ...Object.values(manifest.assets)]);
  if (existsSync(path.join(packDirectory, "README.md"))) selected.add("README.md");
  const entries = {};
  let totalBytes = 0;
  for (const relativePath of [...selected].sort()) {
    if (!safeArchivePath(relativePath)) throw new Error(`Unsafe release path: ${relativePath}`);
    const absolute = path.join(packDirectory, relativePath);
    const fileStat = await lstat(absolute);
    const relative = path.relative(realpathSync(packDirectory), realpathSync(absolute));
    if (!fileStat.isFile() || fileStat.isSymbolicLink() || relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error(`Release file must be a regular pack-contained file: ${relativePath}`);
    }
    const bytes = new Uint8Array(await readFile(absolute));
    totalBytes += bytes.byteLength;
    if (totalBytes > MAX_ARCHIVE_BYTES) throw new Error("Theme release files exceed the 128 MB package limit.");
    entries[relativePath] = bytes;
  }
  const checksums = Object.entries(entries).map(([relativePath, bytes]) => `${sha256(bytes)}  ${relativePath}`).join("\n");
  entries["checksums.sha256"] = new TextEncoder().encode(`${checksums}\n`);
  const archive = zipSync(entries, { level: 6 });
  const temporary = `${archivePath}.${process.pid}.tmp`;
  await mkdir(path.dirname(archivePath), { recursive: true });
  try {
    await writeFile(temporary, archive, { flag: "wx" });
    await rename(temporary, archivePath);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
  return { archivePath, themeId: manifest.id, version: manifest.version, sha256: sha256(archive), bytes: archive.byteLength };
}

export async function createPublishingDraft(input) {
  const { manifest, packDirectory } = await readManifest(input);
  const validation = validateManifest(manifest, { packDirectory, strictAssets: true, publishing: true });
  if (!validation.valid) throw new Error(`Theme draft is not ready for author confirmation:\n- ${validation.errors.join("\n- ")}`);
  const previewKeys = ["preview", "screenshotHome", "screenshotTask", "screenshotNarrow"];
  const previews = {};
  let totalBytes = 0;
  for (const assetKey of previewKeys) {
    const relativePath = manifest.assets[assetKey];
    const assetPath = containedAssetPath(packDirectory, relativePath, `assets.${assetKey}`);
    const bytes = await readFile(assetPath);
    const inspected = inspectImage(assetPath);
    totalBytes += bytes.byteLength;
    if (bytes.byteLength > 2 * 1024 * 1024 || totalBytes > 6 * 1024 * 1024) throw new Error("Draft preview images must be at most 2 MB each and 6 MB in total.");
    const contentType = inspected.type === "PNG" ? "image/png" : inspected.type === "WebP" ? "image/webp" : "image/jpeg";
    previews[assetKey] = {
      file: relativePath,
      contentType,
      width: inspected.width,
      height: inspected.height,
      sha256: sha256(bytes),
      base64: Buffer.from(bytes).toString("base64"),
    };
  }
  const evidenceAsset = manifest.previewMetadata?.renderer === "html-css" ? manifest.assets.previewEvidence : manifest.assets.captureEvidence;
  const previewEvidence = evidenceAsset
    ? JSON.parse(await readFile(containedAssetPath(packDirectory, evidenceAsset, "preview evidence"), "utf8"))
    : null;
  return {
    manifest,
    previews,
    previewEvidence,
    validation: { errors: [], warnings: validation.warnings, coverage: validation.coverage },
  };
}

function expectedFilesDocument(manifest) {
  const names = new Set(["background16x10", "background16x9", "background4x3", "backgroundFallback", "preview"].map((key) => path.basename(manifest.assets[key])));
  const files = [...names].map((name) => `- \`${name}\``).join("\n");
  return `# Expected image assets\n\nAdd the production image files below before publishing. Do not commit empty binary placeholders.\n\n${files}\n`;
}

function expectedScreenshotsDocument(manifest) {
  const files = ["screenshotHome", "screenshotTask", "screenshotNarrow"].map((key) => `- \`${path.basename(manifest.assets[key])}\``).join("\n");
  return `# Expected layout previews\n\nProvide Home, Task, and narrow-window previews. Illustrative mockups must visibly include the manifest label “${manifest.previewMetadata.label}”. Use real captures only after changing previewMetadata.kind to verified-capture and recording the exact Codex version and platform.\n\n${files}\n`;
}

function themeReadmeDocument(manifest) {
  return `# ${manifest.name}\n\n${manifest.description}\n\n## Install from this directory\n\n\`\`\`bash\nnpx -y get-codex-theme use .\n\`\`\`\n\n## Preview disclosure\n\n${manifest.previewMetadata.label}. This is an unofficial visual-CDP theme and does not add an entry to Codex Settings → Appearance.\n`;
}

export async function discoverThemes(root = DEFAULT_THEMES_ROOT) {
  const absolute = path.resolve(root);
  const entries = await readdir(absolute, { withFileTypes: true });
  const themes = [];
  for (const entry of entries.filter((item) => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const manifestPath = path.join(absolute, entry.name, "manifest.json");
    if (!existsSync(manifestPath)) continue;
    const { manifest } = await readManifest(manifestPath);
    themes.push(manifest);
  }
  return themes;
}

export function defaultLibraryRoot() {
  return process.env.CODEX_THEME_HOME
    ? path.resolve(process.env.CODEX_THEME_HOME)
    : path.join(process.env.HOME ?? process.env.USERPROFILE ?? process.cwd(), ".codex", "get-codex-theme");
}

async function writeRuntimeControlState(libraryRoot, lastAction) {
  const destination = path.join(libraryRoot, "runtime-control.json");
  const temporary = `${destination}.${process.pid}.${Date.now()}.tmp`;
  await mkdir(libraryRoot, { recursive: true });
  await writeFile(temporary, `${JSON.stringify({
    schemaVersion: 1,
    paused: false,
    stockAppearance: false,
    lastAction,
    updatedAt: new Date().toISOString(),
  }, null, 2)}\n`);
  try {
    await rename(temporary, destination);
  } finally {
    await rm(temporary, { force: true });
  }
}

async function writeActivePointer(libraryRoot, themeId) {
  const pointer = path.join(libraryRoot, "active-theme.json");
  const previous = path.join(libraryRoot, "backups", "previous-active-theme.json");
  await mkdir(path.dirname(previous), { recursive: true });
  if (existsSync(pointer)) await copyFile(pointer, previous);
  else await rm(previous, { force: true });
  const temporary = `${pointer}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify({ schemaVersion: 1, themeId, activatedAt: new Date().toISOString() })}\n`);
  await rename(temporary, pointer);
  try {
    await writeRuntimeControlState(libraryRoot, "switch");
  } catch (error) {
    if (existsSync(previous)) await copyFile(previous, pointer);
    else await rm(pointer, { force: true });
    throw error;
  }
}

function companionSourceRoot(packDirectory) {
  const candidates = [
    packDirectory,
    path.join(PACKAGE_ROOT, "resources"),
    REPOSITORY_ROOT,
  ];
  return candidates.find((candidate) => (
    existsSync(path.join(candidate, "runtime", "injector.mjs")) &&
    existsSync(path.join(candidate, "platforms", "macos", "start.sh")) &&
    existsSync(path.join(candidate, "platforms", "windows", "start.ps1"))
  ));
}

async function installCompanionRuntime(packDirectory, libraryRoot) {
  const sourceRoot = companionSourceRoot(packDirectory);
  if (!sourceRoot) {
    throw new Error("This pack does not include the companion runtime, and the CLI has no bundled runtime resources.");
  }
  const runtime = path.join(libraryRoot, "runtime");
  const bin = path.join(libraryRoot, "bin");
  const menuBar = path.join(libraryRoot, "menu-bar");
  const runtimeStaging = path.join(libraryRoot, `.runtime.${process.pid}.staging`);
  const binStaging = path.join(libraryRoot, `.bin.${process.pid}.staging`);
  const menuBarStaging = path.join(libraryRoot, `.menu-bar.${process.pid}.staging`);
  const runtimePrevious = path.join(libraryRoot, `.runtime.${process.pid}.previous`);
  const binPrevious = path.join(libraryRoot, `.bin.${process.pid}.previous`);
  const menuBarPrevious = path.join(libraryRoot, `.menu-bar.${process.pid}.previous`);
  await mkdir(libraryRoot, { recursive: true });
  await Promise.all([
    rm(runtimeStaging, { recursive: true, force: true }),
    rm(binStaging, { recursive: true, force: true }),
    rm(runtimePrevious, { recursive: true, force: true }),
    rm(binPrevious, { recursive: true, force: true }),
    rm(menuBarStaging, { recursive: true, force: true }),
    rm(menuBarPrevious, { recursive: true, force: true }),
  ]);
  await cp(path.join(sourceRoot, "runtime"), runtimeStaging, { recursive: true, force: true });
  await mkdir(binStaging, { recursive: true });
  await copyFile(path.join(sourceRoot, "platforms", "macos", "start.sh"), path.join(binStaging, "start-macos.sh"));
  await copyFile(path.join(sourceRoot, "platforms", "macos", "restore.sh"), path.join(binStaging, "restore-macos.sh"));
  await copyFile(path.join(sourceRoot, "platforms", "windows", "start.ps1"), path.join(binStaging, "start-windows.ps1"));
  await copyFile(path.join(sourceRoot, "platforms", "windows", "restore.ps1"), path.join(binStaging, "restore-windows.ps1"));
  const optionalScripts = [
    ["platforms/macos/watchdog-enable.sh", "enable-watchdog-macos.sh", true],
    ["platforms/macos/watchdog-disable.sh", "disable-watchdog-macos.sh", true],
    ["platforms/windows/tray.ps1", "tray-windows.ps1", false],
    ["platforms/windows/tray-start.ps1", "start-tray-windows.ps1", false],
    ["platforms/windows/tray-stop.ps1", "stop-tray-windows.ps1", false],
  ];
  for (const [source, destination, executable] of optionalScripts) {
    const sourcePath = path.join(sourceRoot, source);
    if (!existsSync(sourcePath)) continue;
    const destinationPath = path.join(binStaging, destination);
    await copyFile(sourcePath, destinationPath);
    if (executable) await chmod(destinationPath, 0o755);
  }
  const menuBarSource = path.join(sourceRoot, "platforms", "macos", "menu-bar");
  const hasMenuBar = existsSync(menuBarSource);
  if (hasMenuBar) await cp(menuBarSource, menuBarStaging, { recursive: true, force: true });
  await chmod(path.join(runtimeStaging, "injector.mjs"), 0o755);
  for (const executable of ["theme-control.mjs", "watchdog.mjs"]) {
    const executablePath = path.join(runtimeStaging, executable);
    if (existsSync(executablePath)) await chmod(executablePath, 0o755);
  }
  await chmod(path.join(binStaging, "start-macos.sh"), 0o755);
  await chmod(path.join(binStaging, "restore-macos.sh"), 0o755);
  if (hasMenuBar && existsSync(path.join(menuBarStaging, "build.sh"))) await chmod(path.join(menuBarStaging, "build.sh"), 0o755);

  let movedRuntime = false;
  let movedBin = false;
  let installedRuntime = false;
  let installedBin = false;
  let movedMenuBar = false;
  let installedMenuBar = false;
  try {
    if (existsSync(runtime)) { await rename(runtime, runtimePrevious); movedRuntime = true; }
    if (existsSync(bin)) { await rename(bin, binPrevious); movedBin = true; }
    if (hasMenuBar && existsSync(menuBar)) { await rename(menuBar, menuBarPrevious); movedMenuBar = true; }
    await rename(runtimeStaging, runtime); installedRuntime = true;
    await rename(binStaging, bin); installedBin = true;
    if (hasMenuBar) { await rename(menuBarStaging, menuBar); installedMenuBar = true; }
    await Promise.all([
      rm(runtimePrevious, { recursive: true, force: true }),
      rm(binPrevious, { recursive: true, force: true }),
      rm(menuBarPrevious, { recursive: true, force: true }),
    ]);
  } catch (error) {
    if (installedRuntime) await rm(runtime, { recursive: true, force: true });
    if (installedBin) await rm(bin, { recursive: true, force: true });
    if (installedMenuBar) await rm(menuBar, { recursive: true, force: true });
    if (movedRuntime && existsSync(runtimePrevious)) await rename(runtimePrevious, runtime);
    if (movedBin && existsSync(binPrevious)) await rename(binPrevious, bin);
    if (movedMenuBar && existsSync(menuBarPrevious)) await rename(menuBarPrevious, menuBar);
    throw error;
  } finally {
    await Promise.all([
      rm(runtimeStaging, { recursive: true, force: true }),
      rm(binStaging, { recursive: true, force: true }),
      rm(menuBarStaging, { recursive: true, force: true }),
    ]);
  }
}

export async function installThemePack(input, { libraryRoot = defaultLibraryRoot(), select = false } = {}) {
  const { manifest, packDirectory } = await readManifest(input);
  const validation = validateManifest(manifest, { packDirectory, strictAssets: true });
  if (!validation.valid) throw new Error(`Theme pack is not release-ready:\n- ${validation.errors.join("\n- ")}`);
  await verifyPackChecksums(packDirectory);
  const root = path.resolve(libraryRoot);
  const themesRoot = path.join(root, "themes");
  const destination = path.join(themesRoot, manifest.id);
  const staging = path.join(themesRoot, `.${manifest.id}.${process.pid}.staging`);
  const previousTheme = path.join(themesRoot, `.${manifest.id}.${process.pid}.previous`);
  await mkdir(themesRoot, { recursive: true });
  await rm(staging, { recursive: true, force: true });
  await cp(packDirectory, staging, { recursive: true, errorOnExist: true, force: false });
  let movedPrevious = false;
  let installedDestination = false;
  try {
    await installCompanionRuntime(packDirectory, root);
    if (existsSync(destination)) {
      await rename(destination, previousTheme);
      movedPrevious = true;
    }
    await rename(staging, destination);
    installedDestination = true;
    if (select) await writeActivePointer(root, manifest.id);
    await rm(previousTheme, { recursive: true, force: true });
    return { themeId: manifest.id, version: manifest.version, libraryRoot: root, destination, selected: select };
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    if (installedDestination) await rm(destination, { recursive: true, force: true });
    if (movedPrevious && existsSync(previousTheme)) await rename(previousTheme, destination);
    throw error;
  }
}

function safeArchivePath(value) {
  if (!value || value.includes("\\") || value.startsWith("/") || /^[a-z]:/i.test(value)) return false;
  const parts = value.split("/").filter(Boolean);
  return parts.length > 0 && !parts.includes(".") && !parts.includes("..");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function verifyPackChecksums(packDirectory) {
  const checksumPath = path.join(packDirectory, "checksums.sha256");
  if (!existsSync(checksumPath)) return { verified: false, files: 0 };
  const lines = (await readFile(checksumPath, "utf8")).split(/\r?\n/).filter(Boolean);
  let verified = 0;
  for (const line of lines) {
    const match = /^([0-9a-f]{64})\s{2}(.+)$/.exec(line);
    if (!match || !safeArchivePath(match[2])) throw new Error("checksums.sha256 contains an invalid entry.");
    const filePath = path.join(packDirectory, match[2]);
    if (!existsSync(filePath)) throw new Error(`Checksum target is missing: ${match[2]}`);
    const fileStat = await lstat(filePath);
    const relative = path.relative(realpathSync(packDirectory), realpathSync(filePath));
    if (!fileStat.isFile() || fileStat.isSymbolicLink() || relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error(`Checksum target is unsafe: ${match[2]}`);
    }
    const actual = sha256(await readFile(filePath));
    if (actual !== match[1]) throw new Error(`Checksum mismatch: ${match[2]}`);
    verified += 1;
  }
  return { verified: true, files: verified };
}

async function extractThemeArchive(bytes, destination) {
  if (bytes.byteLength <= 0 || bytes.byteLength > MAX_ARCHIVE_BYTES) {
    throw new Error(`Theme archive must be between 1 byte and ${MAX_ARCHIVE_BYTES} bytes.`);
  }
  let fileCount = 0;
  let extractedBytes = 0;
  let entries;
  try {
    entries = unzipSync(new Uint8Array(bytes), {
      filter(entry) {
        if (!safeArchivePath(entry.name)) throw new Error(`Unsafe archive path: ${entry.name}`);
        fileCount += 1;
        extractedBytes += entry.originalSize;
        if (fileCount > MAX_ARCHIVE_FILES) throw new Error("Theme archive contains too many files.");
        if (extractedBytes > MAX_EXTRACTED_BYTES) throw new Error("Theme archive expands beyond the allowed size.");
        return true;
      },
    });
  } catch (error) {
    throw new Error(`Invalid theme archive: ${error.message}`);
  }
  for (const [entryName, data] of Object.entries(entries)) {
    if (entryName.endsWith("/")) {
      await mkdir(path.join(destination, entryName), { recursive: true });
      continue;
    }
    const target = path.join(destination, entryName);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, data);
  }
  const directManifest = path.join(destination, "manifest.json");
  if (existsSync(directManifest)) return destination;
  const children = await readdir(destination, { withFileTypes: true });
  const roots = children
    .filter((entry) => entry.isDirectory() && existsSync(path.join(destination, entry.name, "manifest.json")))
    .map((entry) => path.join(destination, entry.name));
  if (roots.length !== 1) throw new Error("Theme archive must contain one manifest.json at its root or inside one top-level directory.");
  return roots[0];
}

function parseRemoteThemeSpecifier(input) {
  const match = /^([a-z0-9]+(?:-[a-z0-9]+)*)(?:@(\d+\.\d+\.\d+))?$/.exec(input);
  if (!match) return null;
  return { id: match[1], version: match[2] };
}

async function downloadThemeArchive(specifier, { registryUrl = process.env.CODEX_THEME_REGISTRY ?? DEFAULT_REGISTRY_URL, fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== "function") throw new Error("This Node.js version does not provide fetch().");
  const base = new URL(registryUrl);
  if (base.username || base.password || (base.protocol !== "https:" && base.hostname !== "localhost" && base.hostname !== "127.0.0.1")) {
    throw new Error("Registry URL must use HTTPS, except for localhost development.");
  }
  const url = new URL(`/api/themes/${encodeURIComponent(specifier.id)}/download`, base);
  if (specifier.version) url.searchParams.set("version", specifier.version);
  const response = await fetchImpl(url, { headers: { accept: "application/zip", "user-agent": "get-codex-theme" }, redirect: "error" });
  if (!response.ok) throw new Error(`Theme registry returned ${response.status} for ${specifier.id}.`);
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_ARCHIVE_BYTES) throw new Error("Theme archive is larger than the allowed download size.");
  const chunks = [];
  let downloadedBytes = 0;
  if (!response.body) throw new Error("Theme registry returned an empty response body.");
  const reader = response.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    downloadedBytes += value.byteLength;
    if (downloadedBytes > MAX_ARCHIVE_BYTES) {
      await reader.cancel();
      throw new Error("Theme archive is larger than the allowed download size.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(downloadedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const expectedHash = response.headers.get("x-theme-sha256")?.toLowerCase();
  if (!expectedHash || !/^[0-9a-f]{64}$/.test(expectedHash)) {
    throw new Error("Theme registry did not provide a valid archive checksum.");
  }
  if (sha256(bytes) !== expectedHash) {
    throw new Error("Downloaded theme archive failed its registry checksum.");
  }
  return bytes;
}

export async function prepareThemeInstall(input, options = {}) {
  const resolved = path.resolve(input);
  const isLocal = existsSync(resolved);
  const specifier = isLocal ? null : parseRemoteThemeSpecifier(input);
  if (!isLocal && !specifier) throw new Error("Install a local pack directory, manifest.json, .zip archive, or a lowercase theme id such as aurora-glass.");
  if (isLocal && !resolved.toLowerCase().endsWith(".zip")) {
    return { input: resolved, source: "local", cleanup: async () => {} };
  }
  const temporary = await mkdtemp(path.join(os.tmpdir(), "get-codex-theme-install-"));
  try {
    const bytes = isLocal ? await readFile(resolved) : await downloadThemeArchive(specifier, options);
    const packDirectory = await extractThemeArchive(bytes, temporary);
    const { manifest } = await readManifest(packDirectory);
    if (specifier && manifest.id !== specifier.id) throw new Error("Downloaded theme id does not match the requested theme.");
    if (specifier?.version && manifest.version !== specifier.version) throw new Error(`Requested ${specifier.version}, but the registry returned ${manifest.version}.`);
    if (specifier && !existsSync(path.join(packDirectory, "checksums.sha256"))) throw new Error("Downloaded theme pack does not include per-file checksums.");
    return { input: packDirectory, source: isLocal ? "archive" : "registry", cleanup: () => rm(temporary, { recursive: true, force: true }) };
  } catch (error) {
    await rm(temporary, { recursive: true, force: true });
    throw error;
  }
}

export async function applyInstalledTheme(themeId, { libraryRoot = defaultLibraryRoot() } = {}) {
  if (!ID_RE.test(themeId)) throw new Error("Theme id must be lowercase kebab-case.");
  const root = path.resolve(libraryRoot);
  const themeDirectory = path.join(root, "themes", themeId);
  const { manifest } = await readManifest(themeDirectory);
  if (manifest.id !== themeId) throw new Error("Installed theme id does not match its directory.");
  await writeActivePointer(root, themeId);
  return { themeId, libraryRoot: root };
}

export const switchInstalledTheme = applyInstalledTheme;

export async function useTheme(input, { libraryRoot = defaultLibraryRoot(), registryUrl, fetchImpl } = {}) {
  const prepared = await prepareThemeInstall(input, { registryUrl, fetchImpl });
  try {
    return await installThemePack(prepared.input, { libraryRoot, select: true });
  } finally {
    await prepared.cleanup();
  }
}

export async function restorePreviousTheme({ libraryRoot = defaultLibraryRoot() } = {}) {
  const root = path.resolve(libraryRoot);
  const pointer = path.join(root, "active-theme.json");
  const previous = path.join(root, "backups", "previous-active-theme.json");
  if (existsSync(previous)) await copyFile(previous, pointer);
  else await rm(pointer, { force: true });
  return { libraryRoot: root, restoredPrevious: existsSync(previous) };
}

async function readPointerThemeId(pointerPath) {
  if (!existsSync(pointerPath)) return null;
  try {
    const pointer = JSON.parse(await readFile(pointerPath, "utf8"));
    const themeId = typeof pointer === "string" ? pointer : pointer?.themeId ?? pointer?.id;
    return typeof themeId === "string" && ID_RE.test(themeId) ? themeId : null;
  } catch {
    return null;
  }
}

export async function uninstallTheme(themeId, { libraryRoot = defaultLibraryRoot(), allowActive = false } = {}) {
  if (!ID_RE.test(themeId)) throw new Error("Theme id must be lowercase kebab-case.");
  const root = path.resolve(libraryRoot);
  const themeDirectory = path.join(root, "themes", themeId);
  if (!existsSync(themeDirectory)) throw new Error(`Theme is not installed: ${themeId}`);
  const directoryStat = await lstat(themeDirectory);
  if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink()) throw new Error(`Refusing to uninstall an unsafe theme directory: ${themeDirectory}`);
  const { manifest } = await readManifest(themeDirectory);
  if (manifest.id !== themeId) throw new Error("Installed theme id does not match its directory.");

  const pointer = path.join(root, "active-theme.json");
  const previous = path.join(root, "backups", "previous-active-theme.json");
  const activeThemeId = await readPointerThemeId(pointer);
  if (activeThemeId === themeId && !allowActive) {
    throw new Error(`Theme ${themeId} is active. Switch themes first, or use uninstall ${themeId} --force to pause visuals and remove it.`);
  }

  const staging = path.join(root, "themes", `.${themeId}.${process.pid}.uninstalling`);
  await rm(staging, { recursive: true, force: true });
  await rename(themeDirectory, staging);
  try {
    if (activeThemeId === themeId) await rm(pointer, { force: true });
    if (await readPointerThemeId(previous) === themeId) await rm(previous, { force: true });
    await rm(staging, { recursive: true, force: true });
  } catch (error) {
    if (!existsSync(themeDirectory) && existsSync(staging)) await rename(staging, themeDirectory);
    throw error;
  }
  return { themeId, libraryRoot: root, removedActivePointer: activeThemeId === themeId };
}

async function discoverInstalledThemes(libraryRoot = defaultLibraryRoot()) {
  const themesRoot = path.join(path.resolve(libraryRoot), "themes");
  if (!existsSync(themesRoot)) return [];
  const entries = await readdir(themesRoot, { withFileTypes: true });
  const themes = [];
  for (const entry of entries.filter((item) => item.isDirectory() && !item.name.startsWith(".")).sort((a, b) => a.name.localeCompare(b.name))) {
    try {
      const { manifest } = await readManifest(path.join(themesRoot, entry.name));
      if (manifest.id === entry.name) themes.push(manifest);
    } catch {
      // Keep list usable when one manually copied theme is broken; doctor and
      // validate provide the detailed error path.
    }
  }
  return themes;
}

export async function getThemeStatus({ libraryRoot = defaultLibraryRoot() } = {}) {
  const root = path.resolve(libraryRoot);
  const pointerPath = path.join(root, "active-theme.json");
  let activeTheme = null;
  if (existsSync(pointerPath)) {
    const pointer = JSON.parse(await readFile(pointerPath, "utf8"));
    const themeId = pointer.themeId ?? pointer.id;
    if (typeof themeId === "string" && ID_RE.test(themeId)) {
      const themeDirectory = path.join(root, "themes", themeId);
      const manifest = existsSync(path.join(themeDirectory, "manifest.json")) ? (await readManifest(themeDirectory)).manifest : null;
      activeTheme = { id: themeId, version: manifest?.version ?? null, name: manifest?.name ?? null, installed: Boolean(manifest) };
    }
  }
  let installedThemes = [];
  const themesRoot = path.join(root, "themes");
  if (existsSync(themesRoot)) {
    const entries = await readdir(themesRoot, { withFileTypes: true });
    installedThemes = entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith(".")).map((entry) => entry.name).sort();
  }
  const [paused, runtimeState] = await Promise.all([
    isRuntimePaused(root),
    readRuntimeState(root).catch(() => null),
  ]);
  return { libraryRoot: root, activeTheme, installedThemes, paused, runtime: runtimeState };
}

function capturePlatform(platform = process.platform) {
  if (platform === "darwin") return "macos";
  if (platform === "win32") return "windows";
  throw new Error(`Native Codex preview capture is supported on macOS and Windows; found ${platform}.`);
}

function containedAssetPath(packDirectory, relativePath, label) {
  if (typeof relativePath !== "string" || relativePath.length === 0 || path.isAbsolute(relativePath) || relativePath.split(/[\\/]/).includes("..")) {
    throw new Error(`${label} must stay inside the theme pack.`);
  }
  const root = path.resolve(packDirectory);
  const target = path.resolve(root, relativePath);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) throw new Error(`${label} must stay inside the theme pack.`);
  return target;
}

function runtimeThemeFingerprintSync(packDirectory, manifest) {
  const runtimeAssetKeys = ["background16x10", "background16x9", "background4x3", "backgroundFallback", "tokens"];
  const files = {};
  for (const key of runtimeAssetKeys) {
    const relativePath = manifest.assets?.[key];
    const assetPath = containedAssetPath(packDirectory, relativePath, `assets.${key}`);
    files[key] = { path: relativePath, sha256: sha256(readFileSync(assetPath)) };
  }
  return sha256(JSON.stringify({
    schemaVersion: manifest.schemaVersion,
    id: manifest.id,
    version: manifest.version,
    mode: manifest.mode,
    delivery: manifest.delivery,
    palette: manifest.palette,
    layout: manifest.layout,
    files,
  }));
}

function htmlPreviewThemeFingerprintSync(packDirectory, manifest) {
  const sourceAssetKeys = ["background16x10", "tokens", ...(manifest.assets?.brandLogo ? ["brandLogo"] : [])];
  const files = {};
  for (const key of sourceAssetKeys) {
    const relativePath = manifest.assets?.[key];
    const assetPath = containedAssetPath(packDirectory, relativePath, `assets.${key}`);
    files[key] = { path: relativePath, sha256: sha256(readFileSync(assetPath)) };
  }
  return sha256(JSON.stringify({
    schemaVersion: manifest.schemaVersion,
    rendererVersion: HTML_PREVIEW_RENDERER_VERSION,
    id: manifest.id,
    version: manifest.version,
    name: manifest.name,
    mode: manifest.mode,
    palette: manifest.palette,
    layout: manifest.layout,
    files,
  }));
}

async function runtimeThemeFingerprint(packDirectory, manifest) {
  return runtimeThemeFingerprintSync(packDirectory, manifest);
}

async function replaceCapturedFile(temporary, destination, { force = false } = {}) {
  const existed = existsSync(destination);
  if (existed && !force) throw new Error(`Refusing to overwrite existing preview: ${destination}. Pass --force after reviewing the current file.`);
  await mkdir(path.dirname(destination), { recursive: true });
  if (!existed) {
    await rename(temporary, destination);
    return;
  }
  const backup = `${destination}.${process.pid}.capture-backup`;
  await rm(backup, { force: true });
  await rename(destination, backup);
  try {
    await rename(temporary, destination);
    await rm(backup, { force: true });
  } catch (error) {
    if (existsSync(destination)) await rm(destination, { force: true });
    if (existsSync(backup)) await rename(backup, destination);
    throw error;
  }
}

async function writeJsonAtomically(destination, value) {
  const temporary = `${destination}.${process.pid}.${Date.now()}.tmp`;
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
  try { await replaceCapturedFile(temporary, destination, { force: true }); }
  finally { await rm(temporary, { force: true }); }
}

async function finalizeVerifiedPreviews({ packDirectory, manifest, evidence, force }) {
  const states = Object.keys(PREVIEW_STATE_ASSET_KEYS);
  if (!states.every((state) => evidence.captures?.[state])) return { finalized: false, remaining: states.filter((state) => !evidence.captures?.[state]) };
  for (const state of states) {
    const assetKey = PREVIEW_STATE_ASSET_KEYS[state];
    const filePath = containedAssetPath(packDirectory, manifest.assets[assetKey], `assets.${assetKey}`);
    if (!existsSync(filePath)) throw new Error(`Captured preview is missing: ${manifest.assets[assetKey]}`);
    const bytes = await readFile(filePath);
    const image = inspectImage(filePath);
    const spec = PREVIEW_CAPTURE_SPECS[state];
    if (image.type !== "JPEG" || image.width !== spec.width || image.height !== spec.height || sha256(bytes) !== evidence.captures[state].sha256) {
      throw new Error(`Captured preview evidence no longer matches ${manifest.assets[assetKey]}.`);
    }
  }
  const homePath = containedAssetPath(packDirectory, manifest.assets.screenshotHome, "assets.screenshotHome");
  const previewPath = containedAssetPath(packDirectory, manifest.assets.preview, "assets.preview");
  const previewTemporary = `${previewPath}.${process.pid}.${Date.now()}.capture`;
  try {
    await copyFile(homePath, previewTemporary);
    await replaceCapturedFile(previewTemporary, previewPath, { force });
  } finally {
    await rm(previewTemporary, { force: true });
  }
  manifest.previewMetadata = {
    kind: "verified-capture",
    renderer: "native-capture",
    label: `Verified native Codex capture on ${evidence.platform === "macos" ? "macOS" : "Windows"}`,
    platform: evidence.platform,
    codexVersion: evidence.codexVersion,
  };
  await writeJsonAtomically(path.join(packDirectory, "manifest.json"), manifest);
  await rm(path.join(packDirectory, "screenshots", "EXPECTED_FILES.md"), { force: true });
  return { finalized: true, remaining: [] };
}

export async function captureThemePackPreview(input, {
  state,
  codexVersion,
  libraryRoot = defaultLibraryRoot(),
  port,
  force = false,
  platform = process.platform,
  previewCapture = captureRuntimePreview,
} = {}) {
  const spec = PREVIEW_CAPTURE_SPECS[state];
  if (!spec) throw new Error(`--state must be one of: ${Object.keys(PREVIEW_CAPTURE_SPECS).join(", ")}.`);
  if (typeof codexVersion !== "string" || codexVersion.trim().length < 1 || codexVersion.trim().length > 40) {
    throw new Error("--codex-version must record the exact tested Codex version (1-40 characters).");
  }
  const captureOs = capturePlatform(platform);
  const { manifest, packDirectory } = await readManifest(input);
  if (!manifest.delivery?.includes("visual-cdp")) throw new Error("Native preview capture requires a visual-cdp theme pack.");
  const status = await getThemeStatus({ libraryRoot });
  if (!status.activeTheme?.installed || status.activeTheme.id !== manifest.id || status.activeTheme.version !== manifest.version) {
    throw new Error(`Select the installed ${manifest.id}@${manifest.version} theme before capturing previews.`);
  }
  if (status.paused) throw new Error("Theme visuals are paused. Resume them before capturing previews.");
  const installedDirectory = path.join(status.libraryRoot, "themes", manifest.id);
  const installed = (await readManifest(installedDirectory)).manifest;
  const [sourceFingerprint, installedFingerprint] = await Promise.all([
    runtimeThemeFingerprint(packDirectory, manifest),
    runtimeThemeFingerprint(installedDirectory, installed),
  ]);
  if (sourceFingerprint !== installedFingerprint) {
    throw new Error("The active installed theme does not match this source pack. Reinstall this exact pack before capturing previews.");
  }

  const evidenceRelative = manifest.assets.captureEvidence ?? "screenshots/capture-evidence.json";
  manifest.assets.captureEvidence = evidenceRelative;
  const evidencePath = containedAssetPath(packDirectory, evidenceRelative, "assets.captureEvidence");
  let evidence = null;
  if (existsSync(evidencePath)) {
    try { evidence = JSON.parse(await readFile(evidencePath, "utf8")); }
    catch { throw new Error("screenshots/capture-evidence.json is invalid."); }
  }
  const identityMatches = evidence?.schemaVersion === 1 && evidence?.renderer === "codex-native-cdp" && evidence?.theme?.id === manifest.id && evidence?.theme?.version === manifest.version && evidence?.theme?.runtimeFingerprint === sourceFingerprint && evidence?.platform === captureOs && evidence?.codexVersion === codexVersion.trim();
  if (evidence && !identityMatches && !force) throw new Error("Existing capture evidence belongs to a different theme build, platform, or Codex version. Pass --force to start new evidence.");
  if (!identityMatches) {
    evidence = {
      schemaVersion: 1,
      renderer: "codex-native-cdp",
      theme: { id: manifest.id, version: manifest.version, runtimeFingerprint: sourceFingerprint },
      platform: captureOs,
      codexVersion: codexVersion.trim(),
      captures: {},
    };
  }

  const assetKey = PREVIEW_STATE_ASSET_KEYS[state];
  const destination = containedAssetPath(packDirectory, manifest.assets[assetKey], `assets.${assetKey}`);
  if (existsSync(destination) && !force) throw new Error(`Refusing to overwrite existing preview: ${destination}. Pass --force after reviewing the current file.`);
  const temporary = `${destination}.${process.pid}.${Date.now()}.capture`;
  let capture;
  try {
    capture = await previewCapture({
      libraryRoot: status.libraryRoot,
      port,
      state,
      expectedThemeId: manifest.id,
      outputPath: temporary,
    });
    await replaceCapturedFile(temporary, destination, { force });
  } finally {
    await rm(temporary, { force: true });
  }

  evidence.captures[state] = {
    file: manifest.assets[assetKey],
    sha256: sha256(await readFile(destination)),
    width: capture.width,
    height: capture.height,
    route: capture.route,
    compatibility: capture.compatibility,
    invariantSafety: capture.invariantSafety,
    invariants: capture.invariants,
    capturedAt: new Date().toISOString(),
  };
  await writeJsonAtomically(evidencePath, evidence);
  const finalization = await finalizeVerifiedPreviews({ packDirectory, manifest, evidence, force });
  if (!finalization.finalized) {
    if (manifest.previewMetadata?.kind === "verified-capture") {
      manifest.previewMetadata = { kind: "illustrative", label: "Illustrative concept preview — verified captures are incomplete" };
    }
    await writeJsonAtomically(path.join(packDirectory, "manifest.json"), manifest);
  }
  return { ...capture, destination, evidencePath, ...finalization };
}

export async function renderThemePackPreview(input, {
  state = "all",
  browserPath,
  force = false,
  previewRenderer = renderHtmlThemePreviews,
} = {}) {
  const { manifest, packDirectory } = await readManifest(input);
  const tokenPath = containedAssetPath(packDirectory, manifest.assets?.tokens, "assets.tokens");
  const tokens = JSON.parse(await readFile(tokenPath, "utf8"));
  const result = await previewRenderer({ packDirectory, manifest, tokens, state, browserPath, force });
  if (manifest.schemaVersion === 1) {
    manifest.previewMetadata = { kind: "illustrative", renderer: "html-css", label: "Illustrative HTML/CSS Codex preview — no user data" };
    delete manifest.assets.captureEvidence;
    delete manifest.assets.previewEvidence;
    await writeJsonAtomically(path.join(packDirectory, "manifest.json"), manifest);
    if (state === "all") await rm(path.join(packDirectory, "screenshots", "EXPECTED_FILES.md"), { force: true });
    return { ...result, manifestPath: path.join(packDirectory, "manifest.json") };
  }
  if (manifest.schemaVersion !== 2) throw new Error("HTML/CSS publishing previews require manifest schemaVersion 2.");
  manifest.previewMetadata = {
    kind: "illustrative",
    renderer: "html-css",
    rendererVersion: HTML_PREVIEW_RENDERER_VERSION,
    label: "Illustrative HTML/CSS Codex preview — no user data",
  };
  delete manifest.assets.captureEvidence;
  const evidenceRelative = manifest.assets.previewEvidence ?? "screenshots/preview-evidence.json";
  manifest.assets.previewEvidence = evidenceRelative;
  const evidence = {
    schemaVersion: 1,
    renderer: "get-codex-theme-html-css",
    rendererVersion: HTML_PREVIEW_RENDERER_VERSION,
    browserVersion: typeof result.browserVersion === "string" ? result.browserVersion : "unknown",
    theme: { id: manifest.id, version: manifest.version, fingerprint: htmlPreviewThemeFingerprintSync(packDirectory, manifest) },
    states: Object.fromEntries(result.states.map((rendered) => {
      const assetKey = PREVIEW_STATE_ASSET_KEYS[rendered.state];
      const relativePath = manifest.assets[assetKey];
      return [rendered.state, {
        state: rendered.state,
        file: relativePath,
        width: rendered.width,
        height: rendered.height,
        sha256: sha256(readFileSync(containedAssetPath(packDirectory, relativePath, `assets.${assetKey}`))),
      }];
    })),
  };
  await writeJsonAtomically(containedAssetPath(packDirectory, evidenceRelative, "assets.previewEvidence"), evidence);
  await writeJsonAtomically(path.join(packDirectory, "manifest.json"), manifest);
  if (state === "all") await rm(path.join(packDirectory, "screenshots", "EXPECTED_FILES.md"), { force: true });
  return { ...result, manifestPath: path.join(packDirectory, "manifest.json") };
}

function parseOptions(args) {
  const positional = [];
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) { positional.push(arg); continue; }
    const key = arg.slice(2);
    if (["strict-assets", "json", "launch", "restart", "live", "force", "persistent", "non-interactive", "confirm-clean", "session-stdin"].includes(key)) { options[key] = true; continue; }
    if (index + 1 >= args.length) throw new Error(`Missing value for --${key}`);
    options[key] = args[++index];
  }
  return { positional, options };
}

async function resolveAuthoringInvocation({ command, id, imagePath, options, io, dependencies }) {
  const supplied = {
    name: options.name,
    mode: options.mode,
    path: options.path,
    components: options.components,
    preset: options.preset,
    output: options.output,
    imagePath,
  };
  const initial = validateAuthoringOptions(supplied, { command });
  if (initial.valid) return supplied;

  if (options["non-interactive"] === true) throw new Error(initial.message);
  const input = io.stdin ?? process.stdin;
  const interactive = dependencies.interactive ?? Boolean(input?.isTTY && io.stdout?.isTTY);
  if (!interactive) {
    throw new Error(`No interactive terminal is available. ${initial.message} Pass --non-interactive to make this intent explicit in scripts.`);
  }

  const authoringWizard = dependencies.authoringWizard ?? promptForAuthoring;
  const answers = await authoringWizard({
    command,
    id,
    supplied,
    cwd: process.cwd(),
  }, { input, output: io.stdout });
  const resolved = { ...supplied, ...answers };
  const validation = validateAuthoringOptions(resolved, { command });
  if (!validation.valid) throw new Error(validation.message);
  return resolved;
}

export async function runCli(args, io = { stdin: process.stdin, stdout: process.stdout, stderr: process.stderr }, dependencies = {}) {
  try {
    const runtimeAction = dependencies.runtimeAction ?? runRuntimeAction;
    const surfaceAction = dependencies.surfaceAction ?? runSurfaceAction;
    const runtimeVerifier = dependencies.runtimeVerifier ?? verifyRuntime;
    const runtimeDoctor = dependencies.runtimeDoctor ?? diagnoseRuntime;
    const [command = "help", ...rest] = args;
    if (["help", "--help", "-h"].includes(command)) { io.stdout.write(helpText()); return 0; }
    const { positional, options } = parseOptions(rest);
    if (command === "create") {
      if (!positional[0]) throw new Error("Usage: get-codex-theme create <theme-id> [--name NAME] [--mode dark|light] --path focused|complete|assisted [--components LIST] [--preset PRESET] [--output DIR] [--non-interactive]");
      const resolved = await resolveAuthoringInvocation({ command, id: positional[0], options, io, dependencies });
      const createOptions = {
        id: positional[0],
        name: resolved.name,
        mode: resolved.mode ?? "dark",
        outputDirectory: resolved.output ?? process.cwd(),
        authoringPath: resolved.path,
        components: resolved.components,
        authoringSource: "manual",
        preset: resolved.preset,
      };
      const result = resolved.imagePath
        ? await createThemePackFromImage({ ...createOptions, imagePath: resolved.imagePath })
        : await createThemePack(createOptions);
      io.stdout.write(`Created ${result.packDirectory}\n`);
      io.stdout.write(`Authoring: ${result.tokens.authoring.path}; components: ${result.tokens.coverage.enabled.join(", ")}\n`);
      return 0;
    }
    if (command === "create-from-image") {
      if (!positional[0] || !positional[1]) throw new Error("Usage: get-codex-theme create-from-image <image> <theme-id> [--name NAME] [--mode dark|light] --path assisted|focused|complete [--components LIST] [--preset soft|sharp|bold|glass] [--output DIR] [--non-interactive]");
      const resolved = await resolveAuthoringInvocation({ command, id: positional[1], imagePath: positional[0], options, io, dependencies });
      const result = await createThemePackFromImage({
        imagePath: positional[0],
        id: positional[1],
        name: resolved.name,
        mode: resolved.mode ?? "dark",
        outputDirectory: resolved.output ?? process.cwd(),
        authoringPath: resolved.path,
        components: resolved.components,
        preset: resolved.preset ?? "soft",
      });
      io.stdout.write(`Created image-derived theme ${result.manifest.id} in ${result.packDirectory}\n`);
      io.stdout.write(`Palette: ${result.manifest.mode}, accent ${result.manifest.palette.accent}; focus ${result.manifest.layout.focusX}/${result.manifest.layout.focusY}.\n`);
      io.stdout.write("Add the required screenshots and replace LICENSE-ASSETS.txt before packaging.\n");
      return 0;
    }
    if (command === "coverage") {
      if (!positional[0]) throw new Error("Usage: get-codex-theme coverage <pack-or-manifest> [--json]");
      const { manifest, tokens } = await readVisualThemeTokens(positional[0]);
      const validation = validateComponentContract(tokens);
      if (!validation.valid) {
        for (const error of validation.errors) io.stderr.write(`ERROR ${error}\n`);
      }
      if (options.json) io.stdout.write(`${JSON.stringify(validation.report, null, 2)}\n`);
      else {
        const report = validation.report;
        io.stdout.write(`${report.profile.toUpperCase()} ${report.effectiveScore}% effective coverage (${report.authoringPath})\n`);
        io.stdout.write(`Enabled: ${report.enabled.join(", ") || "none"}\n`);
        io.stdout.write(`Customized: ${report.customized.join(", ") || "none"}\n`);
        io.stdout.write(`Generated: ${report.generated.join(", ") || "none"}\n`);
        io.stdout.write(`Inherited: ${report.inherited.join(", ") || "none"}\n`);
      }
      return validation.valid ? 0 : 1;
    }
    if (command === "validate") {
      if (positional.length === 0) throw new Error("Usage: get-codex-theme validate <pack-or-manifest> [...] [--strict-assets]");
      let failed = false;
      for (const input of positional) {
        const { manifest, manifestPath, packDirectory } = await readManifest(input);
        const result = validateManifest(manifest, { packDirectory, strictAssets: options["strict-assets"] === true });
        for (const warning of result.warnings) io.stderr.write(`WARN ${manifestPath}: ${warning}\n`);
        for (const error of result.errors) io.stderr.write(`ERROR ${manifestPath}: ${error}\n`);
        io.stdout.write(`${result.valid ? "VALID" : "INVALID"} ${manifestPath}\n`);
        failed ||= !result.valid;
      }
      return failed ? 1 : 0;
    }
    if (command === "pack") {
      if (!positional[0]) throw new Error("Usage: get-codex-theme pack <pack-or-manifest> [--output FILE.zip]");
      const result = await createReleaseArchive(positional[0], { outputPath: options.output });
      io.stdout.write(`Packed ${result.themeId}@${result.version} to ${result.archivePath}\n`);
      io.stdout.write(`SHA-256 ${result.sha256}\n`);
      return 0;
    }
    if (command === "publish-session") {
      if (!positional[0] || options["session-stdin"] !== true) {
        throw new Error("Usage: get-codex-theme publish-session <pack-or-manifest> --registry URL --session-stdin [--json]");
      }
      const codeReader = dependencies.submissionCodeReader ?? readSubmissionCode;
      io.stderr.write("Publishing session code (input hidden): ");
      const buildCode = await codeReader(io.stdin ?? process.stdin);
      io.stderr.write("\n");
      const result = await publishThemeSession(positional[0], {
        registryUrl: options.registry,
        buildCode,
        fetchImpl: dependencies.fetchImpl ?? fetch,
        createDraft: dependencies.createDraft ?? createPublishingDraft,
        createArchive: dependencies.createArchive ?? ((input, archiveOptions) => createReleaseArchive(input, { ...archiveOptions, publishing: true })),
        wait: dependencies.wait,
        pollIntervalMs: dependencies.pollIntervalMs,
        maxWaitMs: dependencies.maxWaitMs,
        keyPairFactory: dependencies.keyPairFactory,
        onDraftReady: async (prepared) => {
          io.stderr.write(`Private draft ready: ${prepared.session?.themeId ?? "theme"}@${prepared.session?.version ?? "unknown"}. Confirm the exact page in the Publish portal; this command will continue automatically.\n`);
          await dependencies.onDraftReady?.(prepared);
        },
      });
      if (options.json) io.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      else {
        const session = result.session ?? {};
        io.stdout.write(`${session.status === "published" ? "Published" : "Submitted"} ${session.themeId ?? "theme"}@${session.version ?? "unknown"}.\n`);
        if (session.decisionReason) io.stdout.write(`${session.decisionReason}\n`);
      }
      return 0;
    }
    if (command === "prepare-publish") {
      if (!positional[0] || options["session-stdin"] !== true) {
        throw new Error("Usage: get-codex-theme prepare-publish <pack-or-manifest> --registry URL --session-stdin [--json]");
      }
      const codeReader = dependencies.submissionCodeReader ?? readSubmissionCode;
      io.stderr.write("Build code (input hidden): ");
      const buildCode = await codeReader(io.stdin ?? process.stdin);
      io.stderr.write("\n");
      const result = await prepareThemeDraft(positional[0], {
        registryUrl: options.registry,
        buildCode,
        fetchImpl: dependencies.fetchImpl ?? fetch,
        createDraft: dependencies.createDraft ?? createPublishingDraft,
      });
      if (options.json) io.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      else io.stdout.write(`Draft ready for author confirmation: ${result.session?.themeId ?? "theme"}@${result.session?.version ?? "unknown"}.\n`);
      return 0;
    }
    if (command === "publish") {
      if (!positional[0] || options["session-stdin"] !== true) {
        throw new Error("Usage: get-codex-theme publish <pack-or-manifest> --registry URL --session-stdin [--json]");
      }
      const codeReader = dependencies.submissionCodeReader ?? readSubmissionCode;
      io.stderr.write("Submission code (input hidden): ");
      const submissionCode = await codeReader(io.stdin ?? process.stdin);
      io.stderr.write("\n");
      const result = await publishThemePack(positional[0], {
        registryUrl: options.registry,
        submissionCode,
        fetchImpl: dependencies.fetchImpl ?? fetch,
        createArchive: dependencies.createArchive ?? ((input, archiveOptions) => createReleaseArchive(input, { ...archiveOptions, publishing: true })),
      });
      if (options.json) io.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      else {
        const session = result.session ?? {};
        io.stdout.write(`${session.status === "published" ? "Published" : "Submitted"} ${session.themeId ?? "theme"}@${session.version ?? "unknown"}.\n`);
        if (session.decisionReason) io.stdout.write(`${session.decisionReason}\n`);
      }
      return 0;
    }
    if (command === "list") {
      const themes = positional[0]
        ? await discoverThemes(positional[0])
        : isRepositoryCheckout() && existsSync(DEFAULT_THEMES_ROOT)
          ? await discoverThemes(DEFAULT_THEMES_ROOT)
          : await discoverInstalledThemes(options.library);
      if (options.json) io.stdout.write(`${JSON.stringify(themes, null, 2)}\n`);
      else for (const theme of themes) io.stdout.write(`${theme.id}\t${theme.mode}\t${theme.version}\t${theme.name}\n`);
      if (!themes.length && !options.json) io.stdout.write("No installed themes. Run get-codex-theme install <theme-id>.\n");
      return 0;
    }
    if (command === "install") {
      if (!positional[0]) throw new Error("Usage: get-codex-theme install <pack-or-manifest> [--library DIR]");
      const prepared = await prepareThemeInstall(positional[0], { registryUrl: options.registry });
      try {
        const result = await installThemePack(prepared.input, { libraryRoot: options.library, select: false });
        io.stdout.write(`Installed ${result.themeId}@${result.version} in ${result.libraryRoot}\n`);
        io.stdout.write(`Source: ${prepared.source}. Codex was not restarted and the active theme was not changed.\n`);
        io.stdout.write(`Run get-codex-theme apply ${result.themeId} when you are ready to select it.\n`);
        return 0;
      } finally {
        await prepared.cleanup();
      }
    }
    if (command === "use") {
      if (!positional[0]) throw new Error("Usage: get-codex-theme use <pack-or-manifest> [--registry URL] [--library DIR] [--launch] [--restart]");
      const result = await useTheme(positional[0], { libraryRoot: options.library, registryUrl: options.registry });
      io.stdout.write(`Installed and selected ${result.themeId}@${result.version} in ${result.libraryRoot}\n`);
      if (options.launch) {
        try {
          const launched = await runtimeAction("launch", { libraryRoot: result.libraryRoot, port: options.port, restart: options.restart === true });
          io.stdout.write(`Theme runtime launched${launched.port ? ` on loopback port ${launched.port}` : ""}.\n`);
        } catch (error) {
          await restorePreviousTheme({ libraryRoot: result.libraryRoot });
          throw new Error(`Theme was installed, but launch failed and the previous selection was restored: ${error.message}`);
        }
      } else {
        io.stdout.write("Selection is ready. A running theme runtime will switch automatically; otherwise run get-codex-theme launch.\n");
      }
      return 0;
    }
    if (command === "apply" || command === "switch") {
      if (!positional[0]) throw new Error(`Usage: get-codex-theme ${command} <theme-id> [--library DIR] [--launch] [--restart]`);
      const result = await applyInstalledTheme(positional[0], { libraryRoot: options.library });
      io.stdout.write(`Selected ${result.themeId}.\n`);
      if (options.launch) {
        try {
          const launched = await runtimeAction("launch", { libraryRoot: result.libraryRoot, port: options.port, restart: options.restart === true });
          io.stdout.write(`Theme runtime launched${launched.port ? ` on loopback port ${launched.port}` : ""}.\n`);
        } catch (error) {
          await restorePreviousTheme({ libraryRoot: result.libraryRoot });
          throw new Error(`Launch failed and the previous selection was restored: ${error.message}`);
        }
      } else {
        io.stdout.write("A running theme runtime will switch automatically.\n");
      }
      return 0;
    }
    if (command === "launch") {
      const status = await getThemeStatus({ libraryRoot: options.library });
      if (!status.activeTheme?.installed) throw new Error("Select an installed theme before launching the runtime.");
      const result = await runtimeAction("launch", { libraryRoot: status.libraryRoot, port: options.port, restart: options.restart === true });
      io.stdout.write(`Theme runtime launched${result.port ? ` on loopback port ${result.port}` : ""}.\n`);
      return 0;
    }
    if (command === "pause") {
      const root = path.resolve(options.library ?? defaultLibraryRoot());
      await runtimeAction("pause", { libraryRoot: root, port: options.port });
      io.stdout.write("Theme visuals paused. The selected theme was preserved.\n");
      return 0;
    }
    if (command === "resume") {
      const root = path.resolve(options.library ?? defaultLibraryRoot());
      const result = await runtimeAction("resume", { libraryRoot: root, port: options.port, restart: options.restart === true });
      io.stdout.write(`Theme visuals resumed${result.port ? ` on loopback port ${result.port}` : ""}.\n`);
      return 0;
    }
    if (["menu-bar", "tray", "watchdog"].includes(command)) {
      const action = positional[0];
      const allowed = command === "menu-bar"
        ? ["install", "start", "stop"]
        : command === "tray"
          ? ["start", "stop"]
          : ["enable", "disable"];
      if (!allowed.includes(action)) throw new Error(`Usage: get-codex-theme ${command} <${allowed.join("|")}> [--library DIR]`);
      const root = path.resolve(options.library ?? defaultLibraryRoot());
      const result = await surfaceAction(command, action, { libraryRoot: root, persistent: options.persistent === true });
      const label = command === "menu-bar" ? "macOS menu bar" : command === "tray" ? "Windows tray" : "Watchdog";
      io.stdout.write(`${label} ${result.action} completed.\n`);
      return 0;
    }
    if (command === "verify") {
      const root = path.resolve(options.library ?? defaultLibraryRoot());
      const result = await runtimeVerifier({ libraryRoot: root, port: options.port, screenshot: options.screenshot });
      io.stdout.write(`Verified ${result.targets.length} Codex renderer target(s) on loopback port ${result.port}.\n`);
      if (result.screenshotPath) io.stdout.write(`Screenshot: ${result.screenshotPath}\n`);
      return 0;
    }
    if (command === "capture-preview") {
      if (!positional[0]) throw new Error("Usage: get-codex-theme capture-preview <pack-or-manifest> --state home|task|narrow --codex-version VERSION --confirm-clean [--library DIR] [--port PORT] [--force]");
      if (options["confirm-clean"] !== true) {
        throw new Error("Preview capture records the visible Codex window. Open a clean demo workspace with no private content, then pass --confirm-clean.");
      }
      const result = await captureThemePackPreview(positional[0], {
        state: options.state,
        codexVersion: options["codex-version"],
        libraryRoot: options.library,
        port: options.port,
        force: options.force === true,
        platform: dependencies.platform ?? process.platform,
        previewCapture: dependencies.runtimePreviewCapture ?? captureRuntimePreview,
      });
      io.stdout.write(`Captured the native ${result.state} preview at ${result.width}x${result.height}.\n`);
      if (result.finalized) io.stdout.write("Home, Task, and narrow captures are complete; the gallery preview and verified-capture metadata were finalized.\n");
      else io.stdout.write(`Still needed: ${result.remaining.join(", ")}. The pack remains illustrative until all native captures are complete.\n`);
      return 0;
    }
    if (command === "render-preview") {
      if (!positional[0]) throw new Error("Usage: get-codex-theme render-preview <pack-or-manifest> [--state all|home|task|narrow] [--browser PATH] [--force]");
      const result = await renderThemePackPreview(positional[0], {
        state: options.state ?? "all",
        browserPath: options.browser,
        force: options.force === true,
        previewRenderer: dependencies.htmlPreviewRenderer ?? renderHtmlThemePreviews,
      });
      for (const rendered of result.states) io.stdout.write(`Rendered ${rendered.state} HTML/CSS preview at ${rendered.width}x${rendered.height}: ${rendered.destination}\n`);
      io.stdout.write("The renderer used fixed demo content and did not access the Codex app or user data.\n");
      return 0;
    }
    if (command === "doctor") {
      const root = path.resolve(options.library ?? defaultLibraryRoot());
      const result = await runtimeDoctor({ libraryRoot: root, live: options.live === true });
      if (options.json) io.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      else for (const item of result.checks) {
        io.stdout.write(`${item.status.toUpperCase()} ${item.id}: ${item.message}${item.detail ? ` (${item.detail})` : ""}\n`);
      }
      return result.ok ? 0 : 1;
    }
    if (command === "uninstall") {
      if (!positional[0]) throw new Error("Usage: get-codex-theme uninstall <theme-id> [--library DIR] [--force]");
      const status = await getThemeStatus({ libraryRoot: options.library });
      if (status.activeTheme?.id === positional[0] && options.force) {
        await runtimeAction("pause", { libraryRoot: status.libraryRoot, port: options.port });
      }
      const result = await uninstallTheme(positional[0], { libraryRoot: status.libraryRoot, allowActive: options.force === true });
      io.stdout.write(`Uninstalled ${result.themeId}.${result.removedActivePointer ? " Active visuals were paused and the selection was removed." : ""}\n`);
      return 0;
    }
    if (command === "restore") {
      const result = await restorePreviousTheme({ libraryRoot: options.library });
      io.stdout.write(`${result.restoredPrevious ? "Restored the previous theme pointer." : "Removed the active theme pointer."} Reopen Codex normally for the stock appearance.\n`);
      return 0;
    }
    if (command === "status") {
      const result = await getThemeStatus({ libraryRoot: options.library });
      if (options.json) io.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      else {
        io.stdout.write(`Library: ${result.libraryRoot}\n`);
        io.stdout.write(result.activeTheme ? `Active: ${result.activeTheme.id}${result.activeTheme.version ? `@${result.activeTheme.version}` : ""}\n` : "Active: stock Codex appearance\n");
        io.stdout.write(`Visuals: ${result.paused ? "paused" : result.runtime ? `runtime recorded on port ${result.runtime.port}` : "not running"}\n`);
        io.stdout.write(`Installed: ${result.installedThemes.length ? result.installedThemes.join(", ") : "none"}\n`);
      }
      return 0;
    }
    throw new Error(`Unknown command: ${command}`);
  } catch (error) {
    if (error instanceof AuthoringCancelledError || error?.code === "AUTHORING_CANCELLED") {
      io.stdout.write(`${error.message}\n`);
      return 0;
    }
    io.stderr.write(`${error.message}\n`);
    return 1;
  }
}

function helpText() {
  return `Get Codex Theme CLI

Commands:
  create <theme-id> [--name NAME] [--mode dark|light] [--path focused|complete|assisted] [--components LIST] [--preset PRESET] [--output DIR] [--non-interactive]
  create-from-image <image> <theme-id> [--name NAME] [--mode dark|light] [--path assisted|focused|complete] [--components LIST] [--preset soft|sharp|bold|glass] [--output DIR] [--non-interactive]
  coverage <pack-or-manifest> [--json]
  validate <pack-or-manifest> [...] [--strict-assets]
  pack <pack-or-manifest> [--output FILE.zip]
  prepare-publish <pack-or-manifest> --registry URL --session-stdin [--json]
  publish-session <pack-or-manifest> --registry URL --session-stdin [--json]
  publish <pack-or-manifest> --registry URL --session-stdin [--json]
  list [themes-directory] [--library DIR] [--json]
  install <pack-directory|manifest.json|archive.zip|theme-id> [--registry URL] [--library DIR]
  use <pack-directory|manifest.json|archive.zip|theme-id> [--registry URL] [--library DIR] [--launch] [--restart]
  apply <theme-id> [--library DIR] [--launch] [--restart]
  switch <theme-id> [--library DIR]
  launch [--library DIR] [--port PORT] [--restart]
  pause [--library DIR]
  resume [--library DIR] [--port PORT] [--restart]
  menu-bar <install|start|stop> [--library DIR]
  tray <start|stop> [--library DIR]
  watchdog <enable|disable> [--library DIR] [--persistent]
  verify [--library DIR] [--port PORT] [--screenshot FILE.png]
  capture-preview <pack-or-manifest> --state home|task|narrow --codex-version VERSION --confirm-clean [--library DIR] [--port PORT] [--force]
  render-preview <pack-or-manifest> [--state all|home|task|narrow] [--browser PATH] [--force]
  doctor [--library DIR] [--live] [--json]
  uninstall <theme-id> [--library DIR] [--force]
  status [--library DIR] [--json]
  restore [--library DIR]

Create starts an authoring wizard only when flags are incomplete and both stdin
and stdout are interactive terminals. --non-interactive never prompts and fails
when --path (or Focused --components) is missing. Complete and Assisted enable
all component groups; Focused changes only the groups you name.

Use installs and selects atomically. Launching or restarting Codex happens only
with launch, resume, or --launch; --restart is always explicit. A running runtime
observes switch/apply changes without moving Codex controls. Doctor is offline
unless --live is provided. Render-preview is the standard privacy-safe public
preview path: it uses HTML/CSS, fixed demo content, and theme-pack assets without
opening Codex. Capture-preview is optional and opt-in; it uses the real native Codex
DOM and styles, refuses unverified geometry, and temporarily applies an exact
capture viewport before restoring it. Image analysis is local-only and creates responsive
assets without a full-window overlay. Authoring validation treats missing images
as warnings; use pack for strict release checks and a checksummed submission ZIP.
`;
}
