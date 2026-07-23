import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";

import {
  analyzeImageTheme,
  applyImageCandidateToManifest,
  coverCrop,
  createResponsiveThemeAssets,
} from "../src/image-theme.mjs";

test("coverCrop keeps the focus in frame across desktop ratios", () => {
  assert.deepEqual(coverCrop({ width: 3200, height: 2000 }, 16 / 10, { x: 90, y: 50 }), { left: 0, top: 0, width: 3200, height: 2000 });
  assert.deepEqual(coverCrop({ width: 3200, height: 2000 }, 4 / 3, { x: 90, y: 50 }), { left: 533, top: 0, width: 2667, height: 2000 });
  assert.deepEqual(coverCrop({ width: 3200, height: 2000 }, 16 / 9, { x: 50, y: 90 }), { left: 0, top: 200, width: 3200, height: 1800 });
});

test("creates local responsive assets and applies a no-overlay candidate", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "image-theme-"));
  const imagePath = path.join(directory, "source.png");
  const packDirectory = path.join(directory, "pack");
  const width = 80;
  const height = 50;
  const pixels = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 3;
      const color = x > 52 ? [245, 80, 65] : [28, 62, 118];
      pixels.set(color, offset);
    }
  }
  await sharp(pixels, { raw: { width, height, channels: 3 } }).png().toFile(imagePath);
  const imageTheme = await analyzeImageTheme(imagePath, { mode: "dark" });
  const targets = [{ key: "preview", relativePath: "assets/preview.jpg", width: 64, height: 40 }];
  const written = await createResponsiveThemeAssets(imagePath, packDirectory, {
    source: imageTheme.source,
    analysis: imageTheme.analysis,
    targets,
    minimumWidth: 1,
  });
  assert.equal(written.length, 1);
  assert.ok((await readFile(written[0].path)).length > 100);

  const manifest = { tags: [] };
  applyImageCandidateToManifest(manifest, imageTheme);
  assert.equal(manifest.layout.overlayStrength, 0);
  assert.equal(manifest.layout.contentSide, "left");
  assert.equal(manifest.mode, "dark");
  assert.ok(manifest.palette.buttonBackground);
});
