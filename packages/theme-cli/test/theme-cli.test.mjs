import assert from "node:assert/strict";
import { access, cp, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { zipSync } from "fflate";
import { applyInstalledTheme, createReleaseArchive, createThemePack, discoverThemes, getThemeStatus, installThemePack, prepareThemeInstall, readManifest, restorePreviousTheme, useTheme, validateManifest } from "../src/index.mjs";

async function archiveEntries(root, current = root, entries = {}) {
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) await archiveEntries(root, absolute, entries);
    else if ((await stat(absolute)).isFile()) entries[path.relative(root, absolute).split(path.sep).join("/")] = new Uint8Array(await readFile(absolute));
  }
  return entries;
}

test("creates a theme skeleton and validates its structure", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "get-codex-theme-"));
  try {
    const { packDirectory } = await createThemePack({ id: "test-theme", name: "Test Theme", mode: "light", outputDirectory: temp });
    const { manifest } = await readManifest(packDirectory);
    const result = validateManifest(manifest, { packDirectory });
    assert.equal(result.valid, true);
    assert.equal(result.warnings.length, 7);
    assert.equal(manifest.mode, "light");
    assert.equal(manifest.previewMetadata.kind, "illustrative");
    const readme = await readFile(path.join(packDirectory, "README.md"), "utf8");
    assert.match(readme, /get-codex-theme use \./);
    assert.doesNotMatch(readme, /use \.\/test-theme/);
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test("validation always requires visual-token schema v2", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "get-codex-theme-v2-"));
  try {
    const { packDirectory, manifest } = await createThemePack({ id: "v2-required", outputDirectory: temp });
    const tokenPath = path.join(packDirectory, manifest.assets.tokens);
    const tokens = JSON.parse(await readFile(tokenPath, "utf8"));
    tokens.schemaVersion = 1;
    tokens.componentSchemaVersion = 1;
    await writeFile(tokenPath, JSON.stringify(tokens));
    const legacy = validateManifest(manifest, { packDirectory });
    assert.equal(legacy.valid, false);
    assert.ok(legacy.errors.includes("schemaVersion must equal 2"));
    assert.ok(legacy.errors.includes("componentSchemaVersion must equal 2"));

    await rm(tokenPath);
    const missing = validateManifest(manifest, { packDirectory });
    assert.equal(missing.valid, false);
    assert.ok(missing.errors.some((error) => error.includes("missing asset: tokens/visual-theme.json")));
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test("rejects borders that disappear after alpha compositing", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "get-codex-theme-border-"));
  try {
    const { manifest } = await createThemePack({ id: "low-contrast-border", outputDirectory: temp });
    manifest.palette.border = "rgba(247, 245, 255, 0.10)";
    const result = validateManifest(manifest);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.includes("3:1 contrast")));
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test("rejects traversal and invalid compatibility fields", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "get-codex-theme-"));
  try {
    const { packDirectory, manifest } = await createThemePack({ id: "broken-theme", outputDirectory: temp });
    manifest.assets.preview = "../secret.webp";
    manifest.unofficial = false;
    manifest.layout.overlayStrength = 2;
    manifest.unknownField = true;
    await writeFile(path.join(packDirectory, "manifest.json"), JSON.stringify(manifest));
    const result = validateManifest(manifest, { packDirectory });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.includes("stay inside")));
    assert.ok(result.errors.some((error) => error.includes("unofficial")));
    assert.ok(result.errors.some((error) => error.includes("overlayStrength")));
    assert.ok(result.errors.some((error) => error.includes("unknownField")));
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test("accepts optional semantic component colors and rejects unsafe values", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "get-codex-theme-semantic-"));
  try {
    const { manifest } = await createThemePack({ id: "semantic-theme", outputDirectory: temp });
    Object.assign(manifest.palette, {
      secondary: "#EA4335",
      success: "#34A853",
      warning: "#FBBC04",
      danger: "#D93025",
      focusRing: "#1A73E8",
    });
    assert.equal(validateManifest(manifest).valid, true);
    manifest.palette.warning = "gold; background: url(https://example.invalid)";
    const invalid = validateManifest(manifest);
    assert.equal(invalid.valid, false);
    assert.ok(invalid.errors.some((error) => error.includes("palette.warning")));
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test("accepts an optional, pack-contained brand logo asset", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "get-codex-theme-brand-"));
  try {
    const { manifest } = await createThemePack({ id: "brand-theme", outputDirectory: temp });
    manifest.assets.brandLogo = "brand/logo.png";
    const result = validateManifest(manifest);
    assert.equal(result.valid, true, result.errors.join(", "));
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test("all free theme manifests satisfy the schema contract", async () => {
  const root = path.resolve(import.meta.dirname, "../../../themes/free");
  const themes = await discoverThemes(root);
  assert.ok(themes.length > 0);
  assert.ok(themes.some(({ id }) => id === "codexhub"));
  for (const manifest of themes) {
    const result = validateManifest(manifest, { packDirectory: path.join(root, manifest.id) });
    assert.equal(result.valid, true, `${manifest.id}: ${result.errors.join(", ")}`);
  }
});

test("strict validation requires renderer evidence for verified native captures", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "get-codex-theme-capture-evidence-"));
  try {
    const source = path.resolve(import.meta.dirname, "../../../themes/free/aurora-glass");
    const packDirectory = path.join(temp, "aurora-glass");
    await cp(source, packDirectory, { recursive: true });
    const { manifest } = await readManifest(packDirectory);
    manifest.previewMetadata = { kind: "verified-capture", label: "Verified native Codex capture on macOS", platform: "macos", codexVersion: "2026.7.21" };
    const result = validateManifest(manifest, { packDirectory, strictAssets: true });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.includes("assets.captureEvidence")));
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test("strict validation rejects fake images and missing rights records", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "get-codex-theme-strict-"));
  try {
    const { packDirectory, manifest } = await createThemePack({ id: "fake-assets", outputDirectory: temp });
    for (const [key, relativePath] of Object.entries(manifest.assets)) {
      if (key !== "tokens") await writeFile(path.join(packDirectory, relativePath), "not really an image");
    }
    await rm(path.join(packDirectory, "LICENSE-ASSETS.txt"));
    const result = validateManifest(manifest, { packDirectory, strictAssets: true });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.includes("unsupported or corrupt image")));
    assert.ok(result.errors.some((error) => error.includes("missing LICENSE-ASSETS")));
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test("strict validation rejects project-only or unresolved redistribution rights", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "get-codex-theme-rights-"));
  try {
    const { packDirectory, manifest } = await createThemePack({ id: "restricted-assets", outputDirectory: temp });
    await writeFile(path.join(packDirectory, "LICENSE-ASSETS.txt"), "Source: Original\nAuthor: Example\nMethod: Generated\nLicense: Project use; review before public redistribution.\n");
    const result = validateManifest(manifest, { packDirectory, strictAssets: true });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.includes("restricted-use")));
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test("install is non-activating, apply selects the pack, and restore removes the first active pointer", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "get-codex-theme-install-"));
  try {
    const pack = path.resolve(import.meta.dirname, "../../../themes/free/aurora-glass");
    const libraryRoot = path.join(temp, "library");
    const result = await installThemePack(pack, { libraryRoot });
    assert.equal(result.themeId, "aurora-glass");
    assert.equal(result.selected, false);
    await assert.rejects(access(path.join(libraryRoot, "active-theme.json")));
    await applyInstalledTheme("aurora-glass", { libraryRoot });
    const pointer = JSON.parse(await readFile(path.join(libraryRoot, "active-theme.json"), "utf8"));
    assert.equal(pointer.themeId, "aurora-glass");
    await access(path.join(libraryRoot, "runtime", "injector.mjs"));
    await access(path.join(libraryRoot, "themes", "aurora-glass", "assets", "background-16x9.jpg"));
    const restored = await restorePreviousTheme({ libraryRoot });
    assert.equal(restored.restoredPrevious, false);
    await assert.rejects(access(path.join(libraryRoot, "active-theme.json")));
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test("use installs and selects a checksummed pack in one operation", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "get-codex-theme-use-"));
  try {
    const pack = path.resolve(import.meta.dirname, "../../../themes/free/aurora-glass");
    const libraryRoot = path.join(temp, "library");
    const result = await useTheme(pack, { libraryRoot });
    assert.equal(result.themeId, "aurora-glass");
    assert.equal(result.selected, true);
    const pointer = JSON.parse(await readFile(path.join(libraryRoot, "active-theme.json"), "utf8"));
    assert.equal(pointer.themeId, "aurora-glass");
    await access(path.join(libraryRoot, "themes", "aurora-glass", "manifest.json"));
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test("prepares a downloaded zip-shaped pack and reports installed status", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "get-codex-theme-archive-"));
  try {
    const pack = path.resolve(import.meta.dirname, "../../../themes/free/aurora-glass");
    const archive = zipSync(await archiveEntries(pack));
    const archivePath = path.join(temp, "aurora-glass.zip");
    await writeFile(archivePath, archive);
    const prepared = await prepareThemeInstall(archivePath);
    try {
      const libraryRoot = path.join(temp, "library");
      await installThemePack(prepared.input, { libraryRoot });
      const status = await getThemeStatus({ libraryRoot });
      assert.deepEqual(status.installedThemes, ["aurora-glass"]);
      assert.equal(status.activeTheme, null);
    } finally {
      await prepared.cleanup();
    }
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test("packs a strict release archive with per-file checksums", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "get-codex-theme-pack-"));
  try {
    const pack = path.resolve(import.meta.dirname, "../../../themes/free/aurora-glass");
    const outputPath = path.join(temp, "aurora-glass.zip");
    const result = await createReleaseArchive(pack, { outputPath });
    assert.equal(result.themeId, "aurora-glass");
    assert.match(result.sha256, /^[0-9a-f]{64}$/);
    const prepared = await prepareThemeInstall(outputPath);
    try {
      await access(path.join(prepared.input, "checksums.sha256"));
      const entries = await readdir(prepared.input);
      assert.ok(entries.includes("manifest.json"));
      assert.ok(!entries.includes("runtime"));
    } finally { await prepared.cleanup(); }
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test("rejects archive traversal before writing files", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "get-codex-theme-archive-"));
  try {
    const archivePath = path.join(temp, "unsafe.zip");
    await writeFile(archivePath, zipSync({ "../outside.txt": new TextEncoder().encode("unsafe") }));
    await assert.rejects(prepareThemeInstall(archivePath), /Unsafe archive path/);
    await assert.rejects(access(path.join(temp, "outside.txt")));
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test("requires an outer checksum from remote registries", async () => {
  await assert.rejects(
    prepareThemeInstall("aurora-glass", {
      registryUrl: "https://registry.example",
      fetchImpl: async () => new Response(new Uint8Array([1, 2, 3]), { status: 200 }),
    }),
    /valid archive checksum/,
  );
});
