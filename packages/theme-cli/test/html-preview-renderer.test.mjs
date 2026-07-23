import assert from "node:assert/strict";
import test from "node:test";
import { renderPreviewHtml } from "../src/html-preview-renderer.mjs";

const manifest = {
  name: "Safe Theme",
  palette: {
    accent: "#FFA31A", secondary: "#FF7A00", foreground: "#F5F5F5", muted: "#9A9A9A",
    surface: "rgba(8, 8, 8, 0.90)", surfaceElevated: "rgba(15, 15, 15, 0.96)",
    inputBackground: "rgba(7, 7, 7, 0.96)", border: "rgba(255, 255, 255, 0.40)",
    codeBackground: "rgba(4, 4, 4, 0.97)", buttonForeground: "#070707",
  },
  layout: { focusX: 50, focusY: 50 },
};

test("HTML/CSS previews use fixed demo content and preserve protected Codex geometry", () => {
  const html = renderPreviewHtml({
    manifest,
    tokens: {},
    state: "home",
    backgroundDataUri: "data:image/png;base64,AA==",
  });
  assert.match(html, /class="sidebar"/);
  assert.match(html, /class="suggestions"/);
  assert.match(html, /class="composer"/);
  assert.match(html, /class="ghost-icon"/);
  assert.match(html, /<rect x="3" y="4" width="18" height="16" rx="2"\/>/);
  assert.match(html, /Illustrative HTML\/CSS preview · No user data/);
  assert.match(html, /Preview renderer standard/);
  assert.doesNotMatch(html, /\/Users\/|\\Users\\|Local User|Demo User/);
});

test("task and narrow renders are distinct deterministic states", () => {
  const task = renderPreviewHtml({ manifest, tokens: {}, state: "task", backgroundDataUri: "data:image/png;base64,AA==" });
  const narrow = renderPreviewHtml({ manifest, tokens: {}, state: "narrow", backgroundDataUri: "data:image/png;base64,AA==" });
  assert.match(task, /Improve theme preview rendering/);
  assert.match(task, /never reads user chats/);
  assert.match(narrow, /sidebar-narrow/);
  assert.match(narrow, /width:750px/);
});
