import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readJpegSize(data) {
  assert.equal(data[0], 0xff, "JPEG must start with FF D8");
  assert.equal(data[1], 0xd8, "JPEG must start with FF D8");
  let offset = 2;
  while (offset + 8 < data.length) {
    if (data[offset] !== 0xff) { offset += 1; continue; }
    const marker = data[offset + 1];
    if (marker === 0xd9 || marker === 0xda) break;
    const length = data.readUInt16BE(offset + 2);
    if (length < 2) break;
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { height: data.readUInt16BE(offset + 5), width: data.readUInt16BE(offset + 7) };
    }
    offset += length + 2;
  }
  throw new Error("Could not read JPEG dimensions");
}

test("concept catalog has distinct, useful directions with explicit release status", async () => {
  const { conceptCategories, conceptThemes } = await import("../lib/concept-themes.ts");
  assert.ok(conceptThemes.length >= 45 && conceptThemes.length <= 60);
  assert.equal(new Set(conceptThemes.map((theme) => theme.slug)).size, conceptThemes.length);
  assert.equal(new Set(conceptThemes.map((theme) => theme.name)).size, conceptThemes.length);
  assert.equal(new Set(conceptThemes.map((theme) => theme.description)).size, conceptThemes.length);
  assert.deepEqual(new Set(conceptThemes.map((theme) => theme.category)), new Set(conceptCategories));
  for (const theme of conceptThemes) {
    assert.ok(theme.artDirection.length >= 80, `${theme.slug} needs specific art direction`);
    assert.ok(theme.workspaceFit.length >= 70, `${theme.slug} needs workspace guidance`);
    if (theme.category === "Brand concepts") assert.match(theme.trademarkNotice ?? "", /not sponsored, approved, or affiliated/i);
  }
});

test("every preview-ready concept has a project-owned landscape image", async () => {
  const { conceptThemes } = await import("../lib/concept-themes.ts");
  const ready = conceptThemes.filter((theme) => theme.previewReady);
  assert.equal(ready.length, conceptThemes.length, "every launch concept should have finished artwork");
  for (const theme of ready) {
    assert.equal(theme.previewImage, `/concept-themes/${theme.slug}/background.jpg`);
    const bytes = await fs.readFile(path.join(root, "public", theme.previewImage.slice(1)));
    const size = readJpegSize(bytes);
    assert.ok(size.width >= 1536, `${theme.slug} is too narrow`);
    assert.ok(size.height >= 1024, `${theme.slug} is too short`);
    assert.ok(size.width > size.height, `${theme.slug} must be landscape`);
  }
});

test("every brand concept has a deterministic coded identity and sourced assets", async () => {
  const { conceptThemes } = await import("../lib/concept-themes.ts");
  const brandConcepts = conceptThemes.filter((theme) => theme.category === "Brand concepts");
  const overlaySource = await fs.readFile(path.join(root, "components", "BrandConceptOverlay.tsx"), "utf8");
  const workspaceSource = await fs.readFile(path.join(root, "components", "BrandWorkspaceScene.tsx"), "utf8");

  assert.equal(brandConcepts.length, 11);
  for (const theme of brandConcepts) {
    assert.match(overlaySource, new RegExp(`['\"]${theme.slug}['\"]`), `${theme.slug} needs a logo overlay`);
    assert.match(workspaceSource, new RegExp(`['\"]${theme.slug}['\"]`), `${theme.slug} needs an immersive brand workspace`);
  }

  for (const asset of [
    "spacex.svg",
    "spacex-wordmark.svg",
    "google-logo.png",
    "meta.svg",
    "openai-wordmark.webp",
    "nvidia.svg",
    "nvidia-horizontal.png",
    "apple.svg",
    "microsoft-logo.png",
    "tesla.svg",
    "anthropic.svg",
    "amazon-logo.svg",
    "x.svg",
  ]) {
    const stat = await fs.stat(path.join(root, "public", "brand-marks", asset));
    assert.ok(stat.size > (asset.endsWith(".svg") ? 200 : 1000), `${asset} should contain a real brand asset`);
  }
});
