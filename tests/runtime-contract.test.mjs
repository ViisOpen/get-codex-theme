import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("renderer payload has idempotent install and explicit cleanup markers", async () => {
  const renderer = await fs.readFile(path.join(root, "runtime/assets/renderer-inject.js"), "utf8");
  assert.match(renderer, /__GET_CODEX_THEME_RUNTIME__/);
  assert.match(renderer, /get-codex-theme-background/);
  assert.match(renderer, /previous\?\.cleanup/);
  assert.match(renderer, /officialAppearance|data-codex-theme|codexTheme/);
  assert.match(renderer, /MutationObserver/);
  assert.match(renderer, /__GCT_MENU_INSTALLER__/);
  assert.match(renderer, /data-gct-route|gctRoute/);
  assert.match(renderer, /group\/home-suggestions/);
  assert.match(renderer, /INVARIANT_SURFACES = \["sidebar", "suggestions", "composer", "attachments"\]/);
  assert.match(renderer, /INVARIANT_TOLERANCE = 1/);
  assert.match(renderer, /INVARIANT_RETRY_LIMIT = 8/);
  assert.match(renderer, /captureNativeBaseline/);
  assert.match(renderer, /elementFromPoint/);
  assert.match(renderer, /hitTargetWorking: !interactive \|\| hitTargetWorks/);
  assert.match(renderer, /snapshot\.interactive && snapshot\.hitTargetWorking && !hitTargetWorks/);
  assert.match(renderer, /getInvariantStatus/);
  assert.match(renderer, /schedule\(\(\) => schedule\(\(\) => verifyNativeInvariants\(generation, attempt\)\)\)/);
  assert.match(renderer, /baseline = captureNativeBaseline\(\)/);
  assert.doesNotMatch(renderer, /layoutContracts/);
  assert.match(renderer, /__GCT_BRAND__/);
  assert.match(renderer, /get-codex-theme-shell-brand/);
  assert.match(renderer, /get-codex-theme-workspace-brand/);
  assert.match(renderer, /aside\.app-shell-left-panel button\[aria-haspopup="menu"\]/);
  assert.match(renderer, /data-testid="home-icon"/);
  assert.match(renderer, /brandLogoDataUrl/);
  assert.match(renderer, /if \(image\.style\[property\] !== value\) image\.style\[property\] = value/);
  assert.match(renderer, /if \(image\.hidden === visible\) image\.hidden = !visible/);
  assert.match(renderer, /if \(home && !home\.classList\.contains\(HOME_CLASS\)\) home\.classList\.add\(HOME_CLASS\)/);
  assert.match(renderer, /isEditorColorProbe/);
  assert.match(renderer, /if \(!onlyColorProbes\) scheduleEnsure\(\)/);
  assert.match(renderer, /aria-hidden/);
});

test("visual-token schema v2 records the four native interaction invariants", async () => {
  const schema = JSON.parse(await fs.readFile(path.join(root, "packages/theme-schema/visual-theme.schema.json"), "utf8"));
  assert.equal(schema.$id, "https://getcodextheme.com/schema/visual-theme-v2.json");
  assert.equal(schema.properties.schemaVersion.const, 2);
  assert.equal(schema.properties.componentSchemaVersion.const, 2);
  assert.equal(schema["x-native-invariants"].toleranceCssPixels, 1);
  assert.deepEqual(schema["x-native-invariants"].protectedSurfaces, ["sidebar", "suggestions", "composer", "attachments"]);
  const componentDefs = ["foundation", "buttons", "icons", "overlaysAndForms", "taskArtifacts", "feedback", "utilityRoutes"];
  const propertyNames = componentDefs.flatMap((name) => Object.keys(schema.$defs[name].properties));
  for (const forbidden of ["radius", "borderWidth", "focusWidth", "surfaceRadius", "size", "strokeWidth", "width", "height", "padding", "margin", "position", "transform", "order", "shadow"]) {
    assert.equal(propertyNames.includes(forbidden), false, `schema must not expose ${forbidden}`);
  }
  assert.equal("layoutContracts" in schema.properties, false);
});

test("runtime CSS keeps raw art responsive and themes native components", async () => {
  const [css, renderer] = await Promise.all([
    fs.readFile(path.join(root, "runtime/assets/theme.css"), "utf8"),
    fs.readFile(path.join(root, "runtime/assets/renderer-inject.js"), "utf8"),
  ]);
  const backgroundRule = css.match(/#get-codex-theme-background\s*\{[^}]+\}/s)?.[0] ?? "";
  const suggestionRule = css.match(/button-suggestion"\][^{]*\{[^}]+\}/s)?.[0] ?? "";
  const suggestionIconRule = css.match(/button-suggestion"\]\s*>\s*span:first-child\s*>\s*span:first-child\s*\{[^}]+\}/s)?.[0] ?? "";
  const iconRule = css.match(/\[data-gct-component~="icon"\]\s*\{[^}]+\}/s)?.[0] ?? "";
  const composerRule = css.match(/\.composer-surface-chrome\s*\{[^}]+\}/s)?.[0] ?? "";
  const brandRules = [
    css.match(/#get-codex-theme-shell-brand,\s*#get-codex-theme-workspace-brand\s*\{[^}]+\}/s)?.[0] ?? "",
    css.match(/#get-codex-theme-shell-brand\s*\{[^}]+\}/s)?.[0] ?? "",
    css.match(/#get-codex-theme-shell-brand\[hidden\],\s*#get-codex-theme-workspace-brand\[hidden\]\s*\{[^}]+\}/s)?.[0] ?? "",
  ];
  assert.match(css, /background-size:\s*cover/);
  assert.match(css, /pointer-events:\s*none/);
  assert.match(css, /--gct-focus-x/);
  assert.doesNotMatch(backgroundRule, /linear-gradient|--gct-overlay/);
  assert.match(css, /get-codex-theme-shell-brand/);
  assert.match(css, /get-codex-theme-workspace-brand/);
  assert.doesNotMatch(css, /data-gct-layout/);
  assert.match(css, /aside\.app-shell-left-panel/);
  assert.match(css, /aside\.app-shell-left-panel \*/);
  assert.match(css, /--color-token-foreground:\s*var\(--gct-foreground\)\s*!important/);
  assert.match(css, /--vscode-foreground:\s*var\(--gct-foreground\)\s*!important/);
  assert.match(css, /button-suggestion/);
  assert.match(css, /composer-surface-chrome/);
  assert.match(css, /button-icon[^}]+:not\(\[data-gct-component~="button-primary"\]\)/s);
  assert.match(css, /button-primary[^}]+:is\(svg, \[data-gct-component~="icon"\]\)[^{]*\{[^}]+--gct-buttons-primary-foreground/s);
  assert.match(css, /body \*\s*\{[^}]+--color-token-bg-fog:\s*var\(--gct-surface-elevated\)\s*!important/s);
  assert.match(css, /button-review/);
  assert.match(css, /button-feedback/);
  assert.match(css, /--color-background-panel:\s*var\(--gct-surface-elevated\)\s*!important/);
  assert.match(css, /settings-panel/);
  assert.match(css, /input-switch/);
  assert.match(css, /settings-option-selected/);
  assert.match(renderer, /style\*="background-color: var\(--color-background-panel"/);
  assert.match(renderer, /button\[role="switch"\]/);
  assert.match(renderer, /group\/project-selector/);
  assert.match(renderer, /document\.querySelectorAll\('\[data-testid\*="terminal"\], \.xterm'\)/);
  assert.match(css, /data-gct-invariant-sidebar="fallback"/);
  assert.match(css, /data-gct-invariant-suggestions="fallback"/);
  assert.match(css, /data-gct-invariant-composer="fallback"/);
  assert.doesNotMatch(suggestionRule, /\b(?:min-height|padding|border-radius|box-shadow)\s*:/);
  assert.doesNotMatch(suggestionIconRule, /\b(?:display|width|height|margin|place-items|border-radius)\s*:/);
  assert.doesNotMatch(iconRule, /\b(?:width|height|stroke-width)\s*:/);
  assert.doesNotMatch(composerRule, /\b(?:border|border-radius|box-shadow)\s*:/);
  const componentCss = [backgroundRule, ...brandRules].reduce((source, rule) => source.replace(rule, ""), css);
  assert.doesNotMatch(componentCss, /^\s*(?:position|inset|width|height|min-width|min-height|max-width|max-height|padding|margin|display|transform|box-shadow|border-radius|border-width|order|z-index)\s*:/m);
});

test("platform launchers bind CDP to loopback and provide restore paths", async () => {
  const files = [
    "platforms/macos/start.sh",
    "runtime/macos-lifecycle.mjs",
    "platforms/macos/restore.sh",
    "platforms/windows/start.ps1",
    "platforms/windows/restore.ps1",
  ];
  const contents = await Promise.all(files.map((file) => fs.readFile(path.join(root, file), "utf8")));
  assert.match(contents[0], /macos-lifecycle\.mjs/);
  assert.match(contents[1], /remote-debugging-address=127\.0\.0\.1/);
  assert.match(contents[3], /remote-debugging-address=127\.0\.0\.1/);
  assert.match(contents[2], /--remove/);
  assert.match(contents[4], /--remove/);
  for (const content of contents) assert.doesNotMatch(content, /app\.asar|WindowsApps permissions/i);
});

test("runtime refuses non-loopback WebSocket endpoints and launchers verify port ownership", async () => {
  const injector = await fs.readFile(new URL("../runtime/injector.mjs", import.meta.url), "utf8");
  const watchdog = await fs.readFile(new URL("../runtime/watchdog.mjs", import.meta.url), "utf8");
  const owner = await fs.readFile(new URL("../runtime/lib/cdp-owner.mjs", import.meta.url), "utf8");
  const mac = await fs.readFile(new URL("../runtime/macos-lifecycle.mjs", import.meta.url), "utf8");
  const windows = await fs.readFile(new URL("../platforms/windows/start.ps1", import.meta.url), "utf8");
  assert.match(owner, /Refusing a non-loopback DevTools WebSocket endpoint/);
  assert.match(injector, /verifyCodexCdpOwner/);
  assert.match(injector, /listOwnedCodexTargets/);
  assert.match(injector, /replace\("__GCT_BRAND__", JSON\.stringify\(loadedTheme\.brandLogoDataUrl\)\)/);
  assert.match(watchdog, /ownedCodexEndpointReady/);
  assert.match(mac, /lsof/);
  assert.match(mac, /LISTEN/);
  assert.match(mac, /com\.openai\.codex/);
  assert.match(mac, /verifyCodexCdpOwner/);
  assert.match(windows, /Get-NetTCPConnection/);
  assert.match(windows, /OwningProcess/);
});

test("runtime docs disclose the non-native delivery boundary", async () => {
  const readme = await fs.readFile(path.join(root, "runtime/README.md"), "utf8");
  assert.match(readme, /add an entry to Codex \*\*Settings → Appearance\*\*/);
  assert.match(readme, /loopback-only Chromium DevTools port/);
  assert.match(readme, /background-size: cover/);
});
