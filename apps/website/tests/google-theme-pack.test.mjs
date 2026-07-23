import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const packRoot = path.resolve(import.meta.dirname, "../../../themes/brand/google-spectrum");

test("Google Spectrum keeps raw artwork and semantic component colors", async () => {
  const [manifest, tokens, readme] = await Promise.all([
    fs.readFile(path.join(packRoot, "manifest.json"), "utf8").then(JSON.parse),
    fs.readFile(path.join(packRoot, "tokens/visual-theme.json"), "utf8").then(JSON.parse),
    fs.readFile(path.join(packRoot, "README.md"), "utf8"),
  ]);

  assert.equal(manifest.layout.overlayStrength, 0);
  assert.equal(manifest.assets.brandLogo, undefined);
  assert.deepEqual(
    Object.fromEntries(["accent", "secondary", "success", "warning", "danger", "focusRing"].map((key) => [key, manifest.palette[key]])),
    {
      accent: "#4285F4",
      secondary: "#EA4335",
      success: "#34A853",
      warning: "#FBBC04",
      danger: "#D93025",
      focusRing: "#1A73E8",
    },
  );
  assert.deepEqual(tokens.palette, manifest.palette);
  assert.deepEqual(tokens.layout, manifest.layout);
  assert.match(readme, /without a full-window mask/i);
  assert.match(readme, /does not place a floating logo/i);
  await assert.rejects(fs.access(path.join(packRoot, "brand")));
});
