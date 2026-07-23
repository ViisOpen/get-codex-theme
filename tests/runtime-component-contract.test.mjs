import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

test("runtime owns component classification and never accepts author selectors", async () => {
  const [renderer, css, normalizer] = await Promise.all([
    fs.readFile(path.join(root, "runtime/assets/renderer-inject.js"), "utf8"),
    fs.readFile(path.join(root, "runtime/assets/theme.css"), "utf8"),
    fs.readFile(path.join(root, "runtime/lib/component-theme.mjs"), "utf8"),
  ]);
  assert.match(renderer, /data-gct-component/);
  assert.match(renderer, /COMPONENT_RULES/);
  assert.match(renderer, /data-gct-components|gctComponents/);
  assert.match(renderer, /data-gct-compatibility|gctCompatibility/);
  assert.match(css, /\[data-gct-component/);
  assert.match(css, /button-destructive/);
  assert.match(css, /task-artifacts-diff-added/);
  assert.doesNotMatch(normalizer, /selector|innerHTML|pathData|javascript:/i);
  assert.doesNotMatch(css, /(?:^|\n)\s*button\s*\{|(?:^|\n)\s*svg\s*\{/);
});

test("runtime has explicit utility routes and unknown fallback", async () => {
  const renderer = await fs.readFile(path.join(root, "runtime/assets/renderer-inject.js"), "utf8");
  for (const route of ["home", "task", "scheduled", "plugins", "pull-requests", "chat", "search", "unknown"]) {
    assert.match(renderer, new RegExp(`\\b${route.replace("-", "\\-")}\\b`));
  }
  assert.doesNotMatch(renderer, /textContent.*(?:Scheduled|Plugins|Pull requests|Chat)/);
});
