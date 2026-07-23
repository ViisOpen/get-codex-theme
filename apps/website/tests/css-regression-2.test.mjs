import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Regression: ISSUE-003 — the header brand mark must remain visible on light surfaces.
// Found by /qa on 2026-07-16.
// Report: .gstack/qa-reports/qa-report-localhost-2026-07-16.md
test("the default header renders the image brand mark at a stable size", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const header = await readFile(new URL("../components/SiteHeader.tsx", import.meta.url), "utf8");
  const rule = css.match(/\.brand-orb img\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  assert.match(rule, /display:\s*block/i);
  assert.match(rule, /height:\s*38px/i);
  assert.match(rule, /object-fit:\s*contain/i);
  assert.match(header, /src="\/brand\/get-codex-theme-mark-76\.png"[\s\S]*?unoptimized/);
});

test("verified native and HTML/CSS previews render directly instead of receiving a second mock interface", async () => {
  const [mockup, stream, detail, css] = await Promise.all([
    readFile(new URL("../components/ThemeMockup.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/HomeThemeStream.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/themes/[slug]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(mockup, /if \(renderedPreviewUrl\)/);
  assert.match(mockup, /className="mock-rendered-preview"/);
  assert.match(stream, /previewKind === "verified-capture"/);
  assert.match(stream, /previewRenderer === "html-css"/);
  assert.match(detail, /previewMetadata\.kind === "verified-capture"/);
  assert.match(detail, /previewMetadata\.renderer === "html-css"/);
  assert.match(css, /\.mock-rendered-preview\s*\{[^}]*object-fit:\s*cover/s);
});

test("theme detail pages do not expose a standalone background-artwork panel", async () => {
  const detail = await readFile(new URL("../app/themes/[slug]/page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(detail, /Responsive artwork · 16:9/i);
  assert.doesNotMatch(detail, /responsive background artwork/i);
  assert.doesNotMatch(detail, /assetUrl\("background16x9"\)/);
});
