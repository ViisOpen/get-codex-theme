import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Regression: ISSUE-002 — an unlayered anchor color hid text on light buttons.
// Found by /qa on 2026-07-16.
// Report: .gstack/qa-reports/qa-report-localhost-2026-07-16.md
test("global anchor styles do not override Tailwind color utilities", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const shell = await readFile(new URL("../components/SeoPageShell.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(css, /a\s*\{[^}]*color:\s*inherit/i);
  assert.match(shell, /bg-\[#f5f4f0\][^\n]+text-\[#101115\]/);
});
