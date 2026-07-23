import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";

import {
  analyzePixels,
  candidateToThemeTokens,
  contrastRatio,
  detectImageFormat,
  extractThemeCandidates,
  extractThemeCandidatesFromFile,
  generateThemeCandidates,
} from "../src/palette.mjs";

function rgbaImage(width, height, pixelAt) {
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a = 255] = pixelAt(x, y);
      const offset = (y * width + x) * 4;
      data[offset] = r;
      data[offset + 1] = g;
      data[offset + 2] = b;
      data[offset + 3] = a;
    }
  }
  return data;
}

test("extracts deterministic colors and accessible light/dark UI tokens", () => {
  const width = 96;
  const height = 64;
  const data = rgbaImage(width, height, (x, y) => {
    if (x > 66 && y > 12 && y < 52) return (x + y) % 2 === 0 ? [244, 88, 76] : [255, 196, 65];
    if (x > 42) return [39, 82, 145];
    return [18, 31, 52];
  });
  const first = analyzePixels({ data, width, height, channels: 4 });
  const second = analyzePixels({ data, width, height, channels: 4 });
  assert.deepEqual(first, second);
  assert.match(first.extractedColors.dominant.hex, /^#[0-9A-F]{6}$/);
  assert.match(first.extractedColors.secondary.hex, /^#[0-9A-F]{6}$/);
  assert.match(first.extractedColors.accent.hex, /^#[0-9A-F]{6}$/);
  assert.equal(first.extractedColors.dominant.hex, "#121F34");
  assert.equal(first.extractedColors.secondary.hex, "#FFC441");
  assert.equal(first.extractedColors.accent.hex, "#F4584C");
  assert.ok(first.extractedContrast.dominantToSecondary > 8);
  assert.equal(first.safeArea.contentSide, "left");

  const candidates = generateThemeCandidates(first);
  assert.deepEqual(candidates.map((candidate) => candidate.mode), ["dark", "light"]);
  for (const candidate of candidates) {
    assert.equal(candidate.layout.overlayStrength, 0);
    assert.equal(candidate.backgroundTreatment.globalOverlay, "none");
    assert.equal(candidate.backgroundTreatment.localSurfacesOnly, true);
    assert.ok(candidate.uiTokens.sidebar.background);
    assert.ok(candidate.uiTokens.card.background);
    assert.ok(candidate.uiTokens.input.background);
    assert.ok(candidate.uiTokens.button.background);
    assert.ok(candidate.uiTokens.text.primary);
    assert.ok(candidate.uiTokens.border.subtle);
    assert.ok(contrastRatio(candidate.palette.foreground, candidate.palette.background) >= 7);
    assert.ok(contrastRatio(candidate.palette.muted, candidate.palette.background) >= 4.5);
    assert.ok(contrastRatio(candidate.palette.buttonForeground, candidate.palette.buttonBackground) >= 4.5);
    assert.ok(candidate.accessibility.foregroundOnSurface >= 7);
    assert.ok(candidate.accessibility.borderOnBackground >= 3);
  }

  const tokens = candidateToThemeTokens(candidates[0], { id: "custom-photo" });
  assert.equal(tokens.schemaVersion, 2);
  assert.equal(tokens.id, "custom-photo");
  assert.equal(tokens.layout.overlayStrength, 0);
  assert.deepEqual(tokens.palette, candidates[0].palette);
});

test("detects a low-detail safe side opposite a salient checkerboard", () => {
  const width = 120;
  const height = 80;
  const data = rgbaImage(width, height, (x, y) => {
    if (x < 40) return [45, 70, 90];
    if (x < 80) return [50, 75, 95];
    return (x + y) % 2 ? [245, 50, 120] : [10, 210, 235];
  });
  const analysis = analyzePixels({ data, width, height, channels: 4 });
  assert.equal(analysis.safeArea.contentSide, "left");
  assert.ok(analysis.focusPoint.x > 55);
  assert.ok(analysis.subjectRegion.x > 55);
});

test("decodes PNG, JPEG, and WebP locally", async () => {
  const width = 24;
  const height = 16;
  const raw = rgbaImage(width, height, (x, y) => x < width / 2 ? [20, 75, 150] : [245, 165, 45]);
  for (const format of ["png", "jpeg", "webp"]) {
    const bytes = await sharp(raw, { raw: { width, height, channels: 4 } }).toFormat(format).toBuffer();
    assert.equal(detectImageFormat(bytes), format);
    const result = await extractThemeCandidates(bytes);
    assert.equal(result.source.format, format);
    assert.equal(result.source.width, width);
    assert.equal(result.source.height, height);
    assert.equal(result.source.localOnly, true);
    assert.deepEqual(result.candidates.map((candidate) => candidate.mode), ["dark", "light"]);
  }
});

test("file API applies byte limits and returns the same local result shape", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "theme-palette-"));
  const filePath = path.join(directory, "photo.png");
  const raw = rgbaImage(8, 8, (x) => x < 4 ? [20, 40, 80] : [230, 90, 65]);
  const bytes = await sharp(raw, { raw: { width: 8, height: 8, channels: 4 } }).png().toBuffer();
  await writeFile(filePath, bytes);
  const result = await extractThemeCandidatesFromFile(filePath);
  assert.equal(result.source.format, "png");
  await assert.rejects(() => extractThemeCandidatesFromFile(filePath, { maxInputBytes: bytes.length - 1 }), /input limit/);
});

test("strictly rejects unsupported, malformed, and effectively transparent inputs", async () => {
  assert.throws(() => detectImageFormat(Buffer.from("not-an-image")), /Unsupported image format/);
  assert.throws(() => detectImageFormat(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0])), /Unsupported image format/);
  assert.throws(() => analyzePixels({ data: Buffer.alloc(4), width: 2, height: 2, channels: 4 }), /buffer length/);
  assert.throws(() => analyzePixels({ data: Buffer.alloc(8 * 8 * 4), width: 8, height: 8, channels: 4 }), /too few visible pixels/);
  await assert.rejects(() => extractThemeCandidates(Buffer.from("not-an-image")), /Unsupported image format/);
  const transparent = await sharp(Buffer.alloc(8 * 8 * 4), { raw: { width: 8, height: 8, channels: 4 } }).png().toBuffer();
  await assert.rejects(() => extractThemeCandidates(transparent), /too few visible pixels/);
});
