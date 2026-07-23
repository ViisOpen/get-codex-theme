import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { bundleSignature, loadActiveTheme } from "../runtime/lib/theme-loader.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const injector = path.join(root, "runtime", "injector.mjs");

function manifest(id, overrides = {}) {
  const value = {
    schemaVersion: 1,
    id,
    name: "Runtime Test",
    version: "1.0.0",
    mode: "dark",
    unofficial: true,
    palette: {
      accent: "#8B7CFF",
      background: "#090A0F",
      foreground: "#F5F4FF",
      muted: "#B5B2C5",
      surface: "rgba(10,11,18,0.72)",
    },
    layout: { focusX: 72, focusY: 44, overlayStrength: 0.64, contentSide: "left" },
    assets: { background: "assets/background.jpg", tokens: "tokens/visual-theme.json" },
  };
  return { ...value, ...overrides, assets: { ...value.assets, ...overrides.assets } };
}

async function fixture(pointer = { themeId: "runtime-test" }, overrides = {}) {
  const library = await fs.mkdtemp(path.join(os.tmpdir(), "gct-runtime-test-"));
  const themeRoot = path.join(library, "themes", "runtime-test");
  await fs.mkdir(path.join(themeRoot, "assets"), { recursive: true });
  await fs.mkdir(path.join(themeRoot, "tokens"), { recursive: true });
  const manifestValue = manifest("runtime-test", overrides);
  await fs.writeFile(path.join(library, "active-theme.json"), JSON.stringify(pointer));
  await fs.writeFile(path.join(themeRoot, "manifest.json"), JSON.stringify(manifestValue));
  await fs.writeFile(path.join(themeRoot, "tokens", "visual-theme.json"), JSON.stringify({
    schemaVersion: 2,
    componentSchemaVersion: 2,
    id: "runtime-test",
    mode: manifestValue.mode,
    palette: manifestValue.palette,
    layout: manifestValue.layout,
    authoring: { path: "assisted", fallback: "adaptive" },
    coverage: { target: "complete", enabled: ["foundation", "buttons", "icons", "overlaysAndForms", "taskArtifacts", "feedback", "utilityRoutes"], customized: [], generated: ["foundation", "buttons", "icons", "overlaysAndForms", "taskArtifacts", "feedback", "utilityRoutes"] },
    components: {},
  }));
  await fs.writeFile(path.join(themeRoot, "assets", "background.jpg"), Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
  return library;
}

test("loads active-theme.json and normalizes compact pack defaults", async (t) => {
  const library = await fixture();
  t.after(() => fs.rm(library, { recursive: true, force: true }));
  const loaded = await loadActiveTheme({ libraryRoot: library, includeImage: false });
  assert.equal(loaded.theme.id, "runtime-test");
  assert.equal(loaded.theme.palette.surfaceElevated, "rgba(24,24,27,0.88)");
  assert.equal(loaded.theme.palette.secondary, "#8B7CFF");
  assert.equal(loaded.theme.palette.focusRing, "#8B7CFF");
  assert.equal(loaded.theme.layout.focusX, 72);
  assert.equal(loaded.imageMime, "image/jpeg");
  assert.equal(loaded.imageDataUrl, null);
  assert.match(loaded.imageSha256ByLayout.background16x10, /^[0-9a-f]{64}$/);
});

test("bundle signature changes when same-sized image contents change", async (t) => {
  const library = await fixture();
  t.after(() => fs.rm(library, { recursive: true, force: true }));
  const imagePath = path.join(library, "themes", "runtime-test", "assets", "background.jpg");
  const before = await loadActiveTheme({ libraryRoot: library, includeImage: false });
  const beforeSignature = bundleSignature("css", "renderer", before);
  await fs.writeFile(imagePath, Buffer.from([0xff, 0xd8, 0x00, 0xd9]));
  const after = await loadActiveTheme({ libraryRoot: library, includeImage: false });
  assert.equal(before.imageBytes, after.imageBytes);
  assert.notEqual(before.imageSha256ByLayout.background16x10, after.imageSha256ByLayout.background16x10);
  assert.notEqual(beforeSignature, bundleSignature("css", "renderer", after));
});

test("preserves optional semantic component colors", async (t) => {
  const library = await fixture({ themeId: "runtime-test" }, {
    palette: {
      ...manifest("runtime-test").palette,
      secondary: "#EA4335",
      success: "#34A853",
      warning: "#FBBC04",
      danger: "#D93025",
      focusRing: "#1A73E8",
    },
  });
  t.after(() => fs.rm(library, { recursive: true, force: true }));
  const loaded = await loadActiveTheme({ libraryRoot: library, includeImage: false });
  assert.deepEqual(
    Object.fromEntries(["secondary", "success", "warning", "danger", "focusRing"].map((key) => [key, loaded.theme.palette[key]])),
    {
      secondary: "#EA4335",
      success: "#34A853",
      warning: "#FBBC04",
      danger: "#D93025",
      focusRing: "#1A73E8",
    },
  );
});

test("loads focused v2 appearance tokens and derives safe fallbacks", async (t) => {
  const library = await fixture();
  t.after(() => fs.rm(library, { recursive: true, force: true }));
  const themeRoot = path.join(library, "themes", "runtime-test");
  const manifestPath = path.join(themeRoot, "manifest.json");
  const value = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  value.assets.tokens = "tokens/visual-theme.json";
  await fs.mkdir(path.join(themeRoot, "tokens"), { recursive: true });
  await fs.writeFile(manifestPath, JSON.stringify(value));
  await fs.writeFile(path.join(themeRoot, "tokens/visual-theme.json"), JSON.stringify({
    schemaVersion: 2,
    componentSchemaVersion: 2,
    id: "runtime-test",
    mode: "dark",
    palette: value.palette,
    layout: value.layout,
    authoring: { path: "focused", fallback: "adaptive" },
    coverage: { target: "focused", enabled: ["foundation", "buttons"], customized: ["foundation", "buttons"], generated: [] },
    components: { foundation: {}, buttons: { primaryBackground: "#123456" } },
  }));
  const loaded = await loadActiveTheme({ libraryRoot: library, includeImage: false });
  assert.deepEqual(loaded.theme.components.enabled, ["foundation", "buttons"]);
  assert.equal(loaded.theme.components.values.buttons.primaryBackground, "#123456");
  assert.equal(loaded.theme.components.values.buttons.disabledOpacity, 0.48);
  assert.equal("radius" in loaded.theme.components.values.buttons, false);
});

test("rejects legacy visual tokens and geometry fields", async (t) => {
  const library = await fixture();
  t.after(() => fs.rm(library, { recursive: true, force: true }));
  const tokenPath = path.join(library, "themes", "runtime-test", "tokens", "visual-theme.json");
  const tokens = JSON.parse(await fs.readFile(tokenPath, "utf8"));
  tokens.schemaVersion = 1;
  tokens.componentSchemaVersion = 1;
  await fs.writeFile(tokenPath, JSON.stringify(tokens));
  await assert.rejects(loadActiveTheme({ libraryRoot: library }), /must use schemaVersion 2/);

  tokens.schemaVersion = 2;
  tokens.componentSchemaVersion = 2;
  tokens.components.buttons = { radius: 12 };
  await fs.writeFile(tokenPath, JSON.stringify(tokens));
  await assert.rejects(loadActiveTheme({ libraryRoot: library }), /unsupported field: radius/);

  tokens.components.buttons = {};
  tokens.layoutContractSchemaVersion = 1;
  tokens.layoutContracts = { composerLayout: { preset: "native" } };
  await fs.writeFile(tokenPath, JSON.stringify(tokens));
  await assert.rejects(loadActiveTheme({ libraryRoot: library }), /visual tokens contains unsupported field: layoutContractSchemaVersion/);
});

test("rejects packs without a v2 visual token asset", async (t) => {
  const library = await fixture();
  t.after(() => fs.rm(library, { recursive: true, force: true }));
  const manifestPath = path.join(library, "themes", "runtime-test", "manifest.json");
  const value = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  delete value.assets.tokens;
  await fs.writeFile(manifestPath, JSON.stringify(value));
  await assert.rejects(loadActiveTheme({ libraryRoot: library }), /must declare assets.tokens/);
});

test("supports legacy plain-text active-theme pointer", async (t) => {
  const library = await fixture();
  t.after(() => fs.rm(library, { recursive: true, force: true }));
  await fs.rm(path.join(library, "active-theme.json"));
  await fs.writeFile(path.join(library, "active-theme"), "runtime-test\n");
  const loaded = await loadActiveTheme({ libraryRoot: library });
  assert.match(loaded.imageDataUrl, /^data:image\/jpeg;base64,/);
});

test("loads an optional brand logo as a separate, pack-contained runtime asset", async (t) => {
  const library = await fixture();
  t.after(() => fs.rm(library, { recursive: true, force: true }));
  const themeRoot = path.join(library, "themes", "runtime-test");
  const manifestPath = path.join(themeRoot, "manifest.json");
  const value = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  value.assets.brandLogo = "assets/brand-logo.png";
  await fs.writeFile(manifestPath, JSON.stringify(value));
  await fs.writeFile(path.join(themeRoot, "assets", "brand-logo.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

  const loaded = await loadActiveTheme({ libraryRoot: library });
  assert.match(loaded.brandLogoDataUrl, /^data:image\/png;base64,/);
  assert.equal(loaded.brandLogoBytes, 8);
  assert.equal(loaded.theme.brandLogoAsset, "assets/brand-logo.png");
});

test("rejects an unknown active pointer schema version", async (t) => {
  const library = await fixture({ schemaVersion: 99, themeId: "runtime-test" });
  t.after(() => fs.rm(library, { recursive: true, force: true }));
  await assert.rejects(loadActiveTheme({ libraryRoot: library }), /unsupported pointer schemaVersion/);
});

test("rejects an asset path that escapes the theme pack", async (t) => {
  const library = await fixture({ themeId: "runtime-test" }, { assets: { background: "../outside.jpg" } });
  t.after(() => fs.rm(library, { recursive: true, force: true }));
  await assert.rejects(loadActiveTheme({ libraryRoot: library }), /must stay inside/);
});

test("rejects a background symlink that resolves outside the theme pack", async (t) => {
  const library = await fixture();
  t.after(() => fs.rm(library, { recursive: true, force: true }));
  const imagePath = path.join(library, "themes", "runtime-test", "assets", "background.jpg");
  const outsidePath = path.join(library, "outside.jpg");
  await fs.writeFile(outsidePath, Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
  await fs.rm(imagePath);
  await fs.symlink(outsidePath, imagePath);
  await assert.rejects(loadActiveTheme({ libraryRoot: library }), /resolves outside the theme directory/);
});

test("rejects a brand logo symlink that resolves outside the theme pack", async (t) => {
  const library = await fixture();
  t.after(() => fs.rm(library, { recursive: true, force: true }));
  const themeRoot = path.join(library, "themes", "runtime-test");
  const manifestPath = path.join(themeRoot, "manifest.json");
  const value = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  value.assets.brandLogo = "assets/brand-logo.png";
  await fs.writeFile(manifestPath, JSON.stringify(value));
  const outsidePath = path.join(library, "outside.png");
  await fs.writeFile(outsidePath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  await fs.symlink(outsidePath, path.join(themeRoot, "assets", "brand-logo.png"));
  await assert.rejects(loadActiveTheme({ libraryRoot: library }), /brand logo asset resolves outside/);
});

test("rejects visual token symlinks that resolve outside the theme pack", async (t) => {
  const library = await fixture();
  t.after(() => fs.rm(library, { recursive: true, force: true }));
  const themeRoot = path.join(library, "themes", "runtime-test");
  const manifestPath = path.join(themeRoot, "manifest.json");
  const value = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  value.assets.tokens = "tokens/visual-theme.json";
  await fs.mkdir(path.join(themeRoot, "tokens"), { recursive: true });
  await fs.writeFile(manifestPath, JSON.stringify(value));
  const outsidePath = path.join(library, "outside-tokens.json");
  await fs.writeFile(outsidePath, JSON.stringify({ id: "runtime-test", mode: "dark" }));
  await fs.rm(path.join(themeRoot, "tokens/visual-theme.json"));
  await fs.symlink(outsidePath, path.join(themeRoot, "tokens/visual-theme.json"));
  await assert.rejects(loadActiveTheme({ libraryRoot: library }), /visual tokens resolve outside/);
});

test("rejects CSS values outside the manifest color subset", async (t) => {
  const library = await fixture({ themeId: "runtime-test" }, {
    palette: { ...manifest("x").palette, accent: "red; background:url(https://example.invalid)" },
  });
  t.after(() => fs.rm(library, { recursive: true, force: true }));
  await assert.rejects(loadActiveTheme({ libraryRoot: library }), /not a supported CSS color/);
});

test("validate and dry-run succeed without Codex running", async (t) => {
  const library = await fixture();
  t.after(() => fs.rm(library, { recursive: true, force: true }));
  for (const mode of ["--validate", "--dry-run"]) {
    const result = spawnSync(process.execPath, [injector, mode, "--library", library], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.valid, true);
    assert.equal(output.officialAppearance, false);
    assert.equal(output.delivery, "visual-cdp");
    assert.equal(output.theme.id, "runtime-test");
  }
});
