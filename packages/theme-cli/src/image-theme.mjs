import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

import {
  candidateToThemeTokens,
  extractThemeCandidatesFromFile,
} from "./palette.mjs";

const PRODUCTION_TARGETS = Object.freeze([
  { key: "background16x10", relativePath: "assets/background.jpg", width: 3200, height: 2000 },
  { key: "background16x9", relativePath: "assets/background-16x9.jpg", width: 3200, height: 1800 },
  { key: "background4x3", relativePath: "assets/background-4x3.jpg", width: 2400, height: 1800 },
  { key: "preview", relativePath: "assets/preview.jpg", width: 1600, height: 1000 },
]);

export async function analyzeImageTheme(imagePath, { mode = "dark" } = {}) {
  if (!['dark', 'light'].includes(mode)) throw new Error("mode must be dark or light");
  const extracted = await extractThemeCandidatesFromFile(imagePath, { modes: [mode] });
  const candidate = extracted.candidates[0];
  return {
    source: extracted.source,
    analysis: extracted.analysis,
    candidate,
    tokens: candidateToThemeTokens(candidate),
  };
}

export async function createResponsiveThemeAssets(imagePath, packDirectory, {
  source,
  analysis,
  targets = PRODUCTION_TARGETS,
  minimumWidth = 2560,
  jpegQuality = 88,
} = {}) {
  if (!source || !analysis) throw new Error("source and analysis are required");
  if (source.width < minimumWidth || source.width <= source.height) {
    throw new Error(`source image must be landscape and at least ${minimumWidth}px wide`);
  }
  const focus = analysis.focusPoint ?? { x: 50, y: 50 };
  await mkdir(path.join(packDirectory, "assets"), { recursive: true });

  const written = [];
  for (const target of targets) {
    validateTarget(target);
    const crop = coverCrop({ width: source.width, height: source.height }, target.width / target.height, focus);
    const destination = path.join(packDirectory, target.relativePath);
    await mkdir(path.dirname(destination), { recursive: true });
    await sharp(imagePath, { failOn: "error", limitInputPixels: 64 * 1024 * 1024 })
      .rotate()
      .extract(crop)
      .resize(target.width, target.height, { fit: "fill", kernel: sharp.kernel.lanczos3 })
      .flatten({ background: analysis.extractedColors.dominant.hex })
      .jpeg({ quality: jpegQuality, mozjpeg: true, chromaSubsampling: "4:4:4" })
      .toFile(destination);
    written.push({ key: target.key, path: destination, width: target.width, height: target.height });
  }
  return written;
}

export function applyImageCandidateToManifest(manifest, imageTheme) {
  const { candidate, analysis } = imageTheme;
  manifest.mode = candidate.mode;
  manifest.palette = structuredClone(candidate.palette);
  manifest.layout = {
    focusX: analysis.focusPoint.x,
    focusY: analysis.focusPoint.y,
    overlayStrength: 0,
    contentSide: analysis.safeArea.contentSide,
  };
  manifest.tags = [...new Set([candidate.mode, "custom", "image-derived"])];
  return manifest;
}

export function coverCrop(source, targetAspect, focus = { x: 50, y: 50 }) {
  const width = positiveInteger(source?.width, "source.width");
  const height = positiveInteger(source?.height, "source.height");
  if (!Number.isFinite(targetAspect) || targetAspect <= 0) throw new Error("targetAspect must be positive");
  const focusX = clamp(Number(focus.x), 0, 100) / 100;
  const focusY = clamp(Number(focus.y), 0, 100) / 100;
  const sourceAspect = width / height;
  let cropWidth = width;
  let cropHeight = height;
  if (sourceAspect > targetAspect) cropWidth = Math.max(1, Math.round(height * targetAspect));
  else if (sourceAspect < targetAspect) cropHeight = Math.max(1, Math.round(width / targetAspect));
  const left = Math.round(clamp(width * focusX - cropWidth / 2, 0, width - cropWidth));
  const top = Math.round(clamp(height * focusY - cropHeight / 2, 0, height - cropHeight));
  return { left, top, width: cropWidth, height: cropHeight };
}

function validateTarget(target) {
  positiveInteger(target?.width, "target.width");
  positiveInteger(target?.height, "target.height");
  if (typeof target?.relativePath !== "string" || target.relativePath.length === 0 || path.isAbsolute(target.relativePath) || target.relativePath.split(/[\\/]/).includes("..")) {
    throw new Error("target.relativePath must stay inside the pack");
  }
}

function positiveInteger(value, label) {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${label} must be a positive integer`);
  return value;
}

function clamp(value, minimum, maximum) {
  if (!Number.isFinite(value)) return (minimum + maximum) / 2;
  return Math.min(maximum, Math.max(minimum, value));
}

export { PRODUCTION_TARGETS };
