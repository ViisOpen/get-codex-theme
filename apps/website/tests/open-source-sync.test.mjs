import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const repositoryRoot = path.resolve(root, "../..");

test("public component contract schemas are generated from the monorepo source", async () => {
  const source = path.join(repositoryRoot, "packages/theme-schema");
  for (const [from, to] of [["manifest.schema.json", "manifest-v1.json"], ["manifest-v2.schema.json", "manifest-v2.json"], ["visual-theme.schema.json", "visual-theme-v1.json"], ["component-registry.json", "component-registry-v1.json"]]) {
    const [canonical, published] = await Promise.all([
      fs.readFile(path.join(source, from)),
      fs.readFile(path.join(root, "public/schema", to)),
    ]);
    assert.deepEqual(published, canonical, `${to} drifted from the open-source schema`);
  }
});

test("first-party public theme tokens match the monorepo component contract", async () => {
  const sourceRoot = path.join(repositoryRoot, "themes/free");
  const themes = (await fs.readdir(sourceRoot, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  assert.ok(themes.length > 0);
  assert.ok(themes.includes("codexhub"));
  for (const theme of themes) {
    const [canonical, published] = await Promise.all([
      fs.readFile(path.join(sourceRoot, theme, "tokens/visual-theme.json")),
      fs.readFile(path.join(root, "public/theme-packs", theme, "tokens/visual-theme.json")),
    ]);
    assert.deepEqual(published, canonical, `${theme} public tokens drifted from the open-source pack`);
  }
});

test("website publishes theme-only packs and delegates runtime installation to the CLI", async () => {
  const [page, registry, prepare] = await Promise.all([
    fs.readFile(path.join(root, "app/themes/[slug]/page.tsx"), "utf8"),
    fs.readFile(path.join(root, "app/api/_lib/registry-pack.ts"), "utf8"),
    fs.readFile(path.join(root, "scripts/prepare-public-assets.mjs"), "utf8"),
  ]);
  assert.match(page, /Install with Codex/);
  assert.doesNotMatch(page, /DownloadThemeButton|portable/);
  assert.doesNotMatch(registry, /runtimeDistribution|platforms\/|runtime\//);
  assert.match(prepare, /packages\/theme-schema/);
  assert.match(prepare, /themes\/free/);
  assert.doesNotMatch(prepare, /portable|runtime-distribution|vendor\/get-codex-theme/);
  await assert.rejects(fs.access(path.join(root, "public/downloads")));
  await assert.rejects(fs.access(path.join(root, "public/runtime-distribution")));
  await assert.rejects(fs.access(path.join(root, "vendor/get-codex-theme")));
  await assert.rejects(fs.access(path.join(root, "public/theme-assets")));
});

test("Cloudflare serves built static assets before invoking the application Worker", async () => {
  const config = JSON.parse(await fs.readFile(path.join(root, "wrangler.jsonc"), "utf8"));
  assert.equal(config.assets.directory, "dist/client");
  assert.equal(config.assets.binding, "ASSETS");
  assert.equal(config.assets.run_worker_first, undefined);
});
