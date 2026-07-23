import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  getThemeSurfaceSnapshot,
  handleThemeControlAction,
  pauseTheme,
  resumeTheme,
  switchInstalledTheme,
} from "../runtime/lib/theme-state.mjs";

const root = path.resolve(import.meta.dirname, "..");

async function fixture() {
  const libraryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "gct-surfaces-"));
  for (const [id, name, mode, schemaVersion] of [["alpha-night", "Alpha Night", "dark", 1], ["beta-day", "Beta Day", "light", 2]]) {
    const themeRoot = path.join(libraryRoot, "themes", id);
    await fs.mkdir(themeRoot, { recursive: true });
    await fs.writeFile(path.join(themeRoot, "manifest.json"), JSON.stringify({ schemaVersion, id, name, version: "1.0.0", mode }));
  }
  await fs.writeFile(path.join(libraryRoot, "active-theme.json"), JSON.stringify({ schemaVersion: 1, themeId: "alpha-night" }));
  return libraryRoot;
}

test("shared surface state lists, switches, pauses, resumes, and keeps a backup", async (t) => {
  const libraryRoot = await fixture();
  t.after(() => fs.rm(libraryRoot, { recursive: true, force: true }));

  const initial = await getThemeSurfaceSnapshot({ libraryRoot });
  assert.equal(initial.activeThemeId, "alpha-night");
  assert.deepEqual(initial.themes.map(({ id }) => id), ["alpha-night", "beta-day"]);

  const selected = await switchInstalledTheme("beta-day", { libraryRoot });
  assert.equal(selected.activeThemeId, "beta-day");
  assert.equal(selected.paused, false);
  const backup = JSON.parse(await fs.readFile(path.join(libraryRoot, "backups", "previous-active-theme.json"), "utf8"));
  assert.equal(backup.themeId, "alpha-night");

  assert.equal((await pauseTheme({ libraryRoot })).paused, true);
  assert.equal((await resumeTheme({ libraryRoot })).paused, false);
  const stock = await handleThemeControlAction({ version: 1, action: "stock" }, { libraryRoot });
  assert.equal(stock.stockAppearance, true);
  assert.equal(stock.activeThemeId, "beta-day", "stock appearance must not delete the selection");
});

test("surface controller rejects unknown and uninstalled actions", async (t) => {
  const libraryRoot = await fixture();
  t.after(() => fs.rm(libraryRoot, { recursive: true, force: true }));
  await assert.rejects(switchInstalledTheme("missing-theme", { libraryRoot }), /not found or invalid/);
  await assert.rejects(handleThemeControlAction({ version: 99, action: "pause" }, { libraryRoot }), /Unsupported/);
  await assert.rejects(handleThemeControlAction({ version: 1, action: "launch-codex" }, { libraryRoot }), /Unsupported/);
});

test("theme-control helper is usable without Codex", async (t) => {
  const libraryRoot = await fixture();
  t.after(() => fs.rm(libraryRoot, { recursive: true, force: true }));
  const helper = path.join(root, "runtime", "theme-control.mjs");
  const result = spawnSync(process.execPath, [helper, "--library", libraryRoot, "status"], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const snapshot = JSON.parse(result.stdout);
  assert.equal(snapshot.activeThemeId, "alpha-night");
  assert.equal(snapshot.themes.length, 2);
});

test("renderer menu is isolated and runtime control is bounded", async () => {
  const [menu, renderer, injector] = await Promise.all([
    fs.readFile(path.join(root, "runtime/assets/theme-menu.js"), "utf8"),
    fs.readFile(path.join(root, "runtime/assets/renderer-inject.js"), "utf8"),
    fs.readFile(path.join(root, "runtime/injector.mjs"), "utf8"),
  ]);
  assert.match(menu, /attachShadow\(\{ mode: "closed" \}\)/);
  assert.match(menu, /position:fixed/);
  assert.match(menu, /right:154px/);
  assert.doesNotMatch(menu, /right:112px/);
  assert.match(menu, /Theme controller is unavailable/);
  assert.doesNotMatch(menu, /querySelector\([^)]*(?:header|button)/);
  assert.match(renderer, /__GCT_MENU_INSTALLER__/);
  assert.match(renderer, /const pause =/);
  assert.match(injector, /Runtime\.addBinding/);
  assert.match(injector, /payload\.length > 2_048/);
  assert.match(injector, /handleThemeControlAction/);
});

test("OS switchers expose the shared actions without launching Codex", async () => {
  const [swift, tray, watchdog] = await Promise.all([
    fs.readFile(path.join(root, "platforms/macos/menu-bar/Sources/GetCodexThemeMenu/main.swift"), "utf8"),
    fs.readFile(path.join(root, "platforms/windows/tray.ps1"), "utf8"),
    fs.readFile(path.join(root, "runtime/watchdog.mjs"), "utf8"),
  ]);
  for (const source of [swift, tray]) {
    assert.match(source, /switch/i);
    assert.match(source, /pause/i);
    assert.match(source, /resume/i);
    assert.doesNotMatch(source, /Stock Codex Appearance|Original Codex appearance/i);
    assert.match(source, /getcodextheme\.com/);
    assert.doesNotMatch(source, /remote-debugging|tell application "Codex"|OpenAI\.Codex_/i);
  }
  assert.match(watchdog, /maxRestarts: 3/);
  assert.doesNotMatch(watchdog, /open\s+-na|osascript|Start-Process|Invoke-CommandInDesktopPackage/);
  const help = spawnSync(process.execPath, [path.join(root, "runtime/watchdog.mjs"), "--help"], { encoding: "utf8" });
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /disabled unless the user\s+explicitly enables it/);
});

test("watchdog LaunchAgent writer escapes custom library paths", async (t) => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "gct-watchdog-plist-"));
  t.after(() => fs.rm(temporary, { recursive: true, force: true }));
  const output = path.join(temporary, "watchdog.plist");
  const writer = path.join(root, "runtime", "write-watchdog-plist.mjs");
  const result = spawnSync(process.execPath, [
    writer,
    "--output", output,
    "--node", "/opt/homebrew/bin/node",
    "--watchdog", "/tmp/Get & Theme/watchdog.mjs",
    "--library", "/tmp/Get & Theme",
    "--port", "9341",
    "--restart-mode", "session",
    "--launch-script", "/tmp/Get & Theme/start-macos.sh",
  ], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const plist = await fs.readFile(output, "utf8");
  assert.match(plist, /Get &amp; Theme/);
  assert.doesNotMatch(plist, /<string>\/tmp\/Get & Theme/);
});

test("persistent watchdog plist records an explicit bounded restart opt-in", async (t) => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "gct-watchdog-persistent-"));
  t.after(() => fs.rm(temporary, { recursive: true, force: true }));
  const output = path.join(temporary, "watchdog.plist");
  const result = spawnSync(process.execPath, [
    path.join(root, "runtime", "write-watchdog-plist.mjs"),
    "--output", output,
    "--node", "/opt/homebrew/bin/node",
    "--watchdog", "/tmp/watchdog.mjs",
    "--library", "/tmp/theme-library",
    "--port", "9341",
    "--restart-mode", "persistent",
    "--launch-script", "/tmp/theme-library/bin/start-macos.sh",
  ], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const plist = await fs.readFile(output, "utf8");
  assert.match(plist, /--allow-codex-restart/);
  assert.match(plist, /--launch-script/);
  assert.match(plist, /start-macos\.sh/);
});
