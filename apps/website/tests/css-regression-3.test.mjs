import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Regression: ISSUE-005 — dark pages inherited white text into the light header.
// Found by /qa on 2026-07-16.
// Report: .gstack/qa-reports/qa-report-localhost-2026-07-16.md
test("the default light header sets a dark foreground", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const defaultRule = css.match(/\.site-header\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  const overlayRule = css.match(/\.site-header--overlay\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  assert.match(defaultRule, /color:\s*#171719/i);
  assert.match(overlayRule, /color:\s*white/i);
});
