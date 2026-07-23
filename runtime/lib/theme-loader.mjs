import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { normalizeRuntimeComponents } from "./component-theme.mjs";

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const COLOR_PATTERN = /^(?:#[0-9a-fA-F]{6}|rgba?\([\d\s.,%]+\))$/;
const SUPPORTED_IMAGES = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
]);

export function defaultLibraryRoot() {
  return process.env.CODEX_THEME_HOME
    ? path.resolve(process.env.CODEX_THEME_HOME)
    : path.join(os.homedir(), ".codex", "get-codex-theme");
}

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object.`);
  }
}

function safeColor(value, fallback, label) {
  const candidate = typeof value === "string" ? value.trim() : "";
  if (!candidate) return fallback;
  if (!COLOR_PATTERN.test(candidate)) throw new Error(`${label} is not a supported CSS color.`);
  return candidate;
}

function safeNumber(value, fallback, min, max) {
  const candidate = Number(value);
  return Number.isFinite(candidate) ? Math.min(max, Math.max(min, candidate)) : fallback;
}

async function readPointer(libraryRoot) {
  const jsonPath = path.join(libraryRoot, "active-theme.json");
  try {
    const parsed = JSON.parse((await fs.readFile(jsonPath, "utf8")).replace(/^\uFEFF/, ""));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed) &&
        parsed.schemaVersion !== undefined && parsed.schemaVersion !== 1) {
      throw new Error(`unsupported pointer schemaVersion: ${parsed.schemaVersion}`);
    }
    const id = typeof parsed === "string" ? parsed : parsed?.themeId ?? parsed?.id;
    if (typeof id !== "string") throw new Error("expected a string or { themeId } object");
    return { id: id.trim(), source: jsonPath };
  } catch (error) {
    if (error?.code !== "ENOENT") throw new Error(`Invalid active theme pointer ${jsonPath}: ${error.message}`);
  }

  const textPath = path.join(libraryRoot, "active-theme");
  try {
    return { id: (await fs.readFile(textPath, "utf8")).trim(), source: textPath };
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(`No active theme pointer. Create ${jsonPath} or ${textPath}.`);
    }
    throw error;
  }
}

function resolveInside(root, relativePath, label) {
  if (typeof relativePath !== "string" || !relativePath.trim()) {
    throw new Error(`${label} must be a non-empty relative path.`);
  }
  const candidate = path.resolve(root, relativePath);
  const relative = path.relative(root, candidate);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${label} must stay inside the theme directory.`);
  }
  return candidate;
}

function normalizeManifest(manifest, themeId, visualTokens = null) {
  assertObject(manifest, "Theme manifest");
  if (manifest.schemaVersion !== 1 && manifest.schemaVersion !== 2) throw new Error(`Unsupported schemaVersion: ${manifest.schemaVersion}`);
  if (manifest.id !== themeId || !ID_PATTERN.test(manifest.id)) {
    throw new Error("Theme manifest id must be a lowercase slug matching its directory.");
  }
  if (manifest.unofficial !== true) throw new Error("Theme manifest must declare unofficial: true.");
  if (!['light', 'dark'].includes(manifest.mode)) throw new Error("Theme mode must be light or dark.");

  const palette = manifest.palette ?? {};
  const accent = safeColor(palette.accent, "#8B7CFF", "palette.accent");
  const modeDefaults = manifest.mode === "light"
    ? { background: "#F3F0E8", foreground: "#171717", muted: "#66615A", surface: "rgba(255,255,255,0.76)", elevated: "rgba(255,255,255,0.90)", border: "rgba(23,23,23,0.48)", code: "#EEEAE0", input: "rgba(255,255,255,0.84)", button: "#171717", buttonText: "#FFFFFF" }
    : { background: "#0A0A0B", foreground: "#F7F7F4", muted: "#B7B7B0", surface: "rgba(16,16,18,0.72)", elevated: "rgba(24,24,27,0.88)", border: "rgba(255,255,255,0.37)", code: "rgba(8,8,10,0.88)", input: "rgba(20,20,23,0.82)", button: "#F4F4F0", buttonText: "#151515" };

  const backgroundAsset = manifest.assets?.background16x10
    ?? manifest.assets?.backgroundFallback
    ?? manifest.assets?.background
    ?? "assets/background.jpg";
  const backgroundAssets = {
    background16x10: backgroundAsset,
    background16x9: manifest.assets?.background16x9 ?? backgroundAsset,
    background4x3: manifest.assets?.background4x3 ?? backgroundAsset,
  };

  const normalizedPalette = {
    accent,
    secondary: safeColor(palette.secondary, accent, "palette.secondary"),
    success: safeColor(palette.success, accent, "palette.success"),
    warning: safeColor(palette.warning, accent, "palette.warning"),
    danger: safeColor(palette.danger, accent, "palette.danger"),
    focusRing: safeColor(palette.focusRing, accent, "palette.focusRing"),
    background: safeColor(palette.background ?? palette.canvas, modeDefaults.background, "palette.background"),
    foreground: safeColor(palette.foreground, modeDefaults.foreground, "palette.foreground"),
    muted: safeColor(palette.muted, modeDefaults.muted, "palette.muted"),
    surface: safeColor(palette.surface, modeDefaults.surface, "palette.surface"),
    surfaceElevated: safeColor(palette.surfaceElevated, modeDefaults.elevated, "palette.surfaceElevated"),
    border: safeColor(palette.border, modeDefaults.border, "palette.border"),
    codeBackground: safeColor(palette.codeBackground, modeDefaults.code, "palette.codeBackground"),
    codeForeground: safeColor(palette.codeForeground, modeDefaults.foreground, "palette.codeForeground"),
    inputBackground: safeColor(palette.inputBackground, modeDefaults.input, "palette.inputBackground"),
    buttonBackground: safeColor(palette.buttonBackground, modeDefaults.button, "palette.buttonBackground"),
    buttonForeground: safeColor(palette.buttonForeground, modeDefaults.buttonText, "palette.buttonForeground"),
  };
  return {
    id: manifest.id,
    name: typeof manifest.name === "string" && manifest.name.trim() ? manifest.name.trim() : manifest.id,
    version: typeof manifest.version === "string" ? manifest.version : "1.0.0",
    mode: manifest.mode,
    palette: normalizedPalette,
    layout: {
      focusX: safeNumber(manifest.layout?.focusX, 50, 0, 100),
      focusY: safeNumber(manifest.layout?.focusY, 50, 0, 100),
      overlayStrength: safeNumber(manifest.layout?.overlayStrength, 0.72, 0, 1),
      contentSide: ["left", "center", "right"].includes(manifest.layout?.contentSide) ? manifest.layout.contentSide : "center",
    },
    backgroundAsset,
    backgroundAssets,
    brandLogoAsset: typeof manifest.assets?.brandLogo === "string" ? manifest.assets.brandLogo : null,
    components: normalizeRuntimeComponents(visualTokens, normalizedPalette),
  };
}

export async function loadActiveTheme({ libraryRoot = defaultLibraryRoot(), includeImage = true } = {}) {
  const root = path.resolve(libraryRoot);
  const pointer = await readPointer(root);
  if (!ID_PATTERN.test(pointer.id)) throw new Error(`Invalid active theme id: ${pointer.id || "(empty)"}`);

  const themeDirectory = path.join(root, "themes", pointer.id);
  const manifestPath = path.join(themeDirectory, "manifest.json");
  let manifest;
  try {
    manifest = JSON.parse((await fs.readFile(manifestPath, "utf8")).replace(/^\uFEFF/, ""));
  } catch (error) {
    throw new Error(`Could not read active theme manifest ${manifestPath}: ${error.message}`);
  }

  const themeDirectoryReal = await fs.realpath(themeDirectory);
  if (typeof manifest.assets?.tokens !== "string") throw new Error("Theme manifest must declare assets.tokens for visual token schema v2.");
  const tokenPath = resolveInside(themeDirectory, manifest.assets.tokens, "Theme visual tokens");
  const tokenPathReal = await fs.realpath(tokenPath);
  const relativeTokenPath = path.relative(themeDirectoryReal, tokenPathReal);
  if (!relativeTokenPath || relativeTokenPath.startsWith("..") || path.isAbsolute(relativeTokenPath)) throw new Error("Theme visual tokens resolve outside the theme directory.");
  const tokenStat = await fs.stat(tokenPathReal);
  if (!tokenStat.isFile() || tokenStat.size > 256 * 1024) throw new Error("Theme visual tokens must be a file no larger than 256 KB.");
  const visualTokens = JSON.parse((await fs.readFile(tokenPathReal, "utf8")).replace(/^\uFEFF/, ""));
  if (visualTokens.schemaVersion !== 2 || visualTokens.componentSchemaVersion !== 2) throw new Error("Theme visual tokens must use schemaVersion 2 and componentSchemaVersion 2.");
  if (visualTokens.id !== manifest.id || visualTokens.mode !== manifest.mode) throw new Error("Theme visual tokens must match manifest id and mode.");
  const theme = normalizeManifest(manifest, pointer.id, visualTokens);
  const loadedImages = {};
  for (const [key, relativeAsset] of Object.entries(theme.backgroundAssets)) {
    const imagePath = resolveInside(themeDirectory, relativeAsset, `Theme ${key} asset`);
    const imagePathReal = await fs.realpath(imagePath);
    const relativeRealPath = path.relative(themeDirectoryReal, imagePathReal);
    if (!relativeRealPath || relativeRealPath.startsWith("..") || path.isAbsolute(relativeRealPath)) {
      throw new Error(`Theme ${key} asset resolves outside the theme directory.`);
    }
    const extension = path.extname(imagePathReal).toLowerCase();
    const mime = SUPPORTED_IMAGES.get(extension);
    if (!mime) throw new Error(`Unsupported background image type: ${extension || "(none)"}`);
    const imageStat = await fs.stat(imagePathReal);
    if (!imageStat.isFile()) throw new Error(`Theme background is not a file: ${imagePath}`);
    if (imageStat.size > 12 * 1024 * 1024) throw new Error(`Theme ${key} background exceeds the 12 MB runtime limit.`);
    const image = await fs.readFile(imagePathReal);
    loadedImages[key] = {
      path: imagePathReal,
      bytes: imageStat.size,
      sha256: createHash("sha256").update(image).digest("hex"),
      mime,
      dataUrl: includeImage ? `data:${mime};base64,${image.toString("base64")}` : null,
    };
  }
  const primaryImage = loadedImages.background16x10;
  let brandLogo = null;
  if (theme.brandLogoAsset) {
    const logoPath = resolveInside(themeDirectory, theme.brandLogoAsset, "Theme brand logo asset");
    const logoPathReal = await fs.realpath(logoPath);
    const relativeLogoPath = path.relative(themeDirectoryReal, logoPathReal);
    if (!relativeLogoPath || relativeLogoPath.startsWith("..") || path.isAbsolute(relativeLogoPath)) {
      throw new Error("Theme brand logo asset resolves outside the theme directory.");
    }
    const extension = path.extname(logoPathReal).toLowerCase();
    const mime = SUPPORTED_IMAGES.get(extension);
    if (!mime) throw new Error(`Unsupported brand logo image type: ${extension || "(none)"}`);
    const logoStat = await fs.stat(logoPathReal);
    if (!logoStat.isFile()) throw new Error(`Theme brand logo is not a file: ${logoPath}`);
    if (logoStat.size > 2 * 1024 * 1024) throw new Error("Theme brand logo exceeds the 2 MB runtime limit.");
    const logoBytes = await fs.readFile(logoPathReal);
    brandLogo = {
      path: logoPathReal,
      bytes: logoStat.size,
      sha256: createHash("sha256").update(logoBytes).digest("hex"),
      mime,
      dataUrl: includeImage ? `data:${mime};base64,${logoBytes.toString("base64")}` : null,
    };
  }
  return {
    libraryRoot: root,
    pointerPath: pointer.source,
    themeDirectory,
    manifestPath,
    imagePath: primaryImage.path,
    imageBytes: primaryImage.bytes,
    imageMime: primaryImage.mime,
    imageDataUrl: primaryImage.dataUrl,
    imagePaths: Object.fromEntries(Object.entries(loadedImages).map(([key, value]) => [key, value.path])),
    imageBytesByLayout: Object.fromEntries(Object.entries(loadedImages).map(([key, value]) => [key, value.bytes])),
    imageSha256ByLayout: Object.fromEntries(Object.entries(loadedImages).map(([key, value]) => [key, value.sha256])),
    imageDataUrls: Object.fromEntries(Object.entries(loadedImages).map(([key, value]) => [key, value.dataUrl])),
    brandLogoPath: brandLogo?.path ?? null,
    brandLogoBytes: brandLogo?.bytes ?? 0,
    brandLogoSha256: brandLogo?.sha256 ?? null,
    brandLogoDataUrl: brandLogo?.dataUrl ?? null,
    theme,
  };
}

export function bundleSignature(cssText, rendererText, loadedTheme) {
  return createHash("sha256")
    .update(cssText)
    .update("\0")
    .update(rendererText)
    .update("\0")
    .update(JSON.stringify(loadedTheme.theme))
    .update("\0")
    .update(JSON.stringify({
      backgrounds: loadedTheme.imageSha256ByLayout ?? loadedTheme.imageBytesByLayout ?? loadedTheme.imageBytes,
      brandLogo: loadedTheme.brandLogoSha256 ?? loadedTheme.brandLogoBytes ?? 0,
    }))
    .digest("hex")
    .slice(0, 16);
}
