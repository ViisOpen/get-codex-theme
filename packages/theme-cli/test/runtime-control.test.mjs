import assert from "node:assert/strict";
import { access, cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import test from "node:test";
import { createThemePackFromImage, getThemeStatus, runCli, uninstallTheme, useTheme, validateManifest } from "../src/index.mjs";
import { captureRuntimePreview, diagnoseRuntime, isRuntimePaused, runRuntimeAction, runSurfaceAction, verifyRuntime } from "../src/runtime-control.mjs";

const sourceTheme = path.resolve(import.meta.dirname, "../../../themes/free/aurora-glass");

async function installedFixture() {
  const temp = await mkdtemp(path.join(os.tmpdir(), "gct-control-test-"));
  const libraryRoot = path.join(temp, "library");
  await useTheme(sourceTheme, { libraryRoot });
  return { temp, libraryRoot };
}

test("runtime actions use the installed surface controller and platform launcher without invoking Codex in tests", async (t) => {
  const { temp, libraryRoot } = await installedFixture();
  t.after(() => rm(temp, { recursive: true, force: true }));
  const calls = [];
  const runner = async (command, args) => {
    calls.push({ command, args });
    if (args.includes("pause")) {
      await writeFile(path.join(libraryRoot, "runtime-control.json"), JSON.stringify({ schemaVersion: 1, paused: true }));
      return { code: 0, stdout: "{}", stderr: "" };
    }
    if (args.includes("resume")) {
      await writeFile(path.join(libraryRoot, "runtime-control.json"), JSON.stringify({ schemaVersion: 1, paused: false }));
      return { code: 0, stdout: "{}", stderr: "" };
    }
    await writeFile(path.join(libraryRoot, "runtime-state.json"), JSON.stringify({ port: 9352, injectorPid: 999999, startedAt: "2026-01-01T00:00:00Z" }));
    return { code: 0, stdout: "started", stderr: "" };
  };

  await runRuntimeAction("pause", { libraryRoot, platform: "darwin", runner });
  assert.equal(await isRuntimePaused(libraryRoot), true);
  const resumed = await runRuntimeAction("resume", { libraryRoot, platform: "darwin", runner });
  assert.equal(await isRuntimePaused(libraryRoot), false);
  assert.equal(resumed.port, 9352);
  assert.equal(calls.length, 3);
  assert.match(calls[0].args[0], /theme-control\.mjs$/);
  assert.match(calls[2].command, /start-macos\.sh$/);
});

test("menu bar and tray controls use installed helpers without opening a real surface", async (t) => {
  const { temp, libraryRoot } = await installedFixture();
  t.after(() => rm(temp, { recursive: true, force: true }));
  const macCalls = [];
  const macRunner = async (command, args) => {
    macCalls.push({ command, args });
    return { code: 0, stdout: "ok", stderr: "" };
  };
  const menu = await runSurfaceAction("menu-bar", "start", { libraryRoot, platform: "darwin", runner: macRunner });
  assert.equal(menu.action, "start");
  assert.match(macCalls[0].command, /menu-bar[\\/]build\.sh$/);
  assert.equal(macCalls[1].command, "/usr/bin/open");

  const windowsCalls = [];
  const tray = await runSurfaceAction("tray", "start", {
    libraryRoot,
    platform: "win32",
    runner: async (command, args) => {
      windowsCalls.push({ command, args });
      return { code: 0, stdout: "started", stderr: "" };
    },
  });
  assert.equal(tray.action, "start");
  assert.equal(windowsCalls[0].command, "powershell.exe");
  assert.ok(windowsCalls[0].args.some((value) => /start-tray-windows\.ps1$/.test(value)));

  const watchdogCalls = [];
  await runSurfaceAction("watchdog", "enable", {
    libraryRoot,
    platform: "darwin",
    persistent: true,
    runner: async (command, args) => {
      watchdogCalls.push({ command, args });
      return { code: 0, stdout: "enabled", stderr: "" };
    },
  });
  assert.match(watchdogCalls[0].command, /enable-watchdog-macos\.sh$/);
  assert.ok(watchdogCalls[0].args.includes("--persistent"));
});

test("malformed surface control state fails closed as paused", async (t) => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "gct-control-state-"));
  t.after(() => rm(temp, { recursive: true, force: true }));
  await writeFile(path.join(temp, "runtime-control.json"), "not json");
  assert.equal(await isRuntimePaused(temp), true);
});

test("use --launch rolls back the active pointer when the explicit launch fails", async (t) => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "gct-launch-rollback-"));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const libraryRoot = path.join(temp, "library");
  const io = { stdout: { value: "", write(value) { this.value += value; } }, stderr: { value: "", write(value) { this.value += value; } } };
  const exitCode = await runCli(
    ["use", sourceTheme, "--library", libraryRoot, "--launch"],
    io,
    { runtimeAction: async () => { throw new Error("isolated launch failure"); } },
  );
  assert.equal(exitCode, 1);
  await assert.rejects(access(path.join(libraryRoot, "active-theme.json")));
  await access(path.join(libraryRoot, "themes", "aurora-glass", "manifest.json"));
  assert.match(io.stderr.value, /previous selection was restored/);
});

test("safe uninstall refuses an active theme unless the caller has already paused and confirmed it", async (t) => {
  const { temp, libraryRoot } = await installedFixture();
  t.after(() => rm(temp, { recursive: true, force: true }));
  await assert.rejects(uninstallTheme("aurora-glass", { libraryRoot }), /is active/);
  const result = await uninstallTheme("aurora-glass", { libraryRoot, allowActive: true });
  assert.equal(result.removedActivePointer, true);
  const status = await getThemeStatus({ libraryRoot });
  assert.equal(status.activeTheme, null);
  assert.deepEqual(status.installedThemes, []);
});

test("doctor performs offline validation unless live verification is explicitly requested", async (t) => {
  const { temp, libraryRoot } = await installedFixture();
  t.after(() => rm(temp, { recursive: true, force: true }));
  let calls = 0;
  const runner = async (_command, args) => {
    calls += 1;
    assert.ok(args.includes("--validate"));
    assert.ok(!args.includes("--verify"));
    return { code: 0, stdout: JSON.stringify({ valid: true }), stderr: "" };
  };
  const ownershipRunner = async (command, args) => {
    if (command === "/usr/bin/mdfind") return { code: 0, stdout: "/Applications/ChatGPT.app\n", stderr: "" };
    if (command === "/usr/bin/plutil") {
      return { code: 0, stdout: args[1] === "CFBundleIdentifier" ? "com.openai.codex\n" : "ChatGPT\n", stderr: "" };
    }
    if (command === "/usr/bin/codesign") {
      return { code: 0, stdout: "", stderr: "Identifier=com.openai.codex\nTeamIdentifier=2DC432GLL2\n" };
    }
    throw new Error(`Unexpected ownership command: ${command}`);
  };
  const result = await diagnoseRuntime({ libraryRoot, platform: "darwin", runner, ownershipRunner });
  assert.equal(result.ok, true);
  assert.equal(calls, 1);
  assert.equal(result.checks.find(({ id }) => id === "codex-app")?.status, "pass");
  assert.ok(!result.checks.some(({ id }) => id === "live-renderer"));
});

test("doctor can verify the macOS Codex bundle before the runtime is installed", async (t) => {
  const libraryRoot = await mkdtemp(path.join(os.tmpdir(), "gct-doctor-bootstrap-"));
  t.after(() => rm(libraryRoot, { recursive: true, force: true }));
  const ownershipRunner = async (command, args) => {
    if (command === "/usr/bin/mdfind") return { code: 0, stdout: "/Applications/ChatGPT.app\n", stderr: "" };
    if (command === "/usr/bin/plutil") return { code: 0, stdout: args[1] === "CFBundleIdentifier" ? "com.openai.codex\n" : "ChatGPT\n", stderr: "" };
    if (command === "/usr/bin/codesign") return { code: 0, stdout: "", stderr: "Identifier=com.openai.codex\nTeamIdentifier=2DC432GLL2\n" };
    throw new Error(`Unexpected ownership command: ${command}`);
  };
  const result = await diagnoseRuntime({ libraryRoot, platform: "darwin", ownershipRunner });
  assert.equal(result.checks.find(({ id }) => id === "codex-app")?.status, "pass");
  assert.equal(result.checks.find(({ id }) => id === "runtime")?.status, "fail");
});

test("screenshot verification checks the installed runtime owner before fetch and WebSocket", async (t) => {
  const { temp, libraryRoot } = await installedFixture();
  t.after(() => rm(temp, { recursive: true, force: true }));
  await writeFile(path.join(libraryRoot, "runtime-state.json"), JSON.stringify({ port: 9341, injectorPid: 4242 }));
  const order = [];
  const runner = async (_command, args) => {
    order.push("injector-verify");
    assert.ok(args.includes("--verify"));
    return {
      code: 0,
      stdout: JSON.stringify({
        targets: [{ result: { installed: true, stylePresent: true, backgroundPresent: true } }],
      }),
      stderr: "",
    };
  };
  const ownershipRunner = async (command, args) => {
    if (command === "/usr/sbin/lsof") {
      order.push("owner-lsof");
      return { code: 0, stdout: "p4242\nf21\nn127.0.0.1:9341\n", stderr: "" };
    }
    if (command === "/bin/ps") {
      order.push("owner-ps");
      assert.deepEqual(args, ["-p", "4242", "-o", "pid=,ppid=,comm="]);
      return { code: 0, stdout: "4242 1 /Applications/ChatGPT.app/Contents/MacOS/ChatGPT\n", stderr: "" };
    }
    if (command === "/usr/bin/plutil") {
      order.push("owner-plutil");
      return { code: 0, stdout: order.filter((entry) => entry === "owner-plutil").length % 2 === 1 ? "com.openai.codex\n" : "ChatGPT\n", stderr: "" };
    }
    if (command === "/usr/bin/codesign") {
      order.push("owner-codesign");
      return { code: 0, stdout: "", stderr: "Identifier=com.openai.codex\nTeamIdentifier=2DC432GLL2\n" };
    }
    throw new Error(`Unexpected owner command: ${command}`);
  };

  await assert.rejects(
    verifyRuntime({
      libraryRoot,
      screenshot: path.join(temp, "capture.png"),
      runner,
      ownershipRunner,
      ownershipPlatform: "darwin",
      fetchImpl: async () => {
        order.push("fetch-targets");
        return {
          ok: true,
          async json() {
            return [{
              id: "main",
              type: "page",
              url: "app://-/index.html",
              webSocketDebuggerUrl: "ws://127.0.0.1:9341/devtools/page/main",
            }];
          },
        };
      },
      webSocketFactory: () => {
        order.push("websocket");
        throw new Error("isolated WebSocket stop");
      },
    }),
    /isolated WebSocket stop/,
  );
  assert.deepEqual(order, [
    "injector-verify",
    "owner-lsof", "owner-ps", "owner-plutil", "owner-plutil", "owner-codesign", "owner-codesign", "fetch-targets",
    "owner-lsof", "owner-ps", "owner-plutil", "owner-plutil", "owner-codesign", "owner-codesign", "websocket",
  ]);
});

test("native preview capture uses verified Codex layout metadata and restores viewport emulation", async (t) => {
  const { temp, libraryRoot } = await installedFixture();
  t.after(() => rm(temp, { recursive: true, force: true }));
  await writeFile(path.join(libraryRoot, "runtime-state.json"), JSON.stringify({ port: 9341, injectorPid: 4242 }));
  const jpeg = await sharp({ create: { width: 1200, height: 750, channels: 3, background: "#111111" } }).jpeg().toBuffer();
  const commands = [];
  let viewport = { width: 1440, height: 900 };
  class FakeSocket extends EventTarget {
    constructor() {
      super();
      queueMicrotask(() => this.dispatchEvent(new Event("open")));
    }
    send(raw) {
      const request = JSON.parse(raw);
      commands.push(request);
      let result = {};
      if (request.method === "Emulation.setDeviceMetricsOverride") viewport = { width: request.params.width, height: request.params.height };
      if (request.method === "Runtime.evaluate") {
        result = request.params.expression.includes("document.documentElement")
          ? { result: { value: {
              route: "home",
              themeId: "aurora-glass",
              compatibility: "verified",
              invariantSafety: "verified",
              invariants: { sidebar: "verified", suggestions: "verified", composer: "verified", attachments: "inactive" },
              viewport,
            } } }
          : { result: { value: true } };
      }
      if (request.method === "Page.captureScreenshot") result = { data: jpeg.toString("base64") };
      queueMicrotask(() => this.dispatchEvent(new MessageEvent("message", { data: JSON.stringify({ id: request.id, result }) })));
    }
    close() { this.dispatchEvent(new Event("close")); }
  }
  const ownershipRunner = async (command, args) => {
    if (command === "/usr/sbin/lsof") return { code: 0, stdout: "p4242\nf21\nn127.0.0.1:9341\n", stderr: "" };
    if (command === "/bin/ps") return { code: 0, stdout: "4242 1 /Applications/ChatGPT.app/Contents/MacOS/ChatGPT\n", stderr: "" };
    if (command === "/usr/bin/plutil") return { code: 0, stdout: args[1] === "CFBundleIdentifier" ? "com.openai.codex\n" : "ChatGPT\n", stderr: "" };
    if (command === "/usr/bin/codesign") return { code: 0, stdout: "", stderr: "Identifier=com.openai.codex\nTeamIdentifier=2DC432GLL2\n" };
    throw new Error(`Unexpected owner command: ${command}`);
  };
  const outputPath = path.join(temp, "home.jpg");
  const result = await captureRuntimePreview({
    libraryRoot,
    state: "home",
    expectedThemeId: "aurora-glass",
    outputPath,
    runner: async () => ({
      code: 0,
      stdout: JSON.stringify({ targets: [{ result: { installed: true, stylePresent: true, backgroundPresent: true } }] }),
      stderr: "",
    }),
    ownershipRunner,
    ownershipPlatform: "darwin",
    fetchImpl: async () => ({ ok: true, async json() { return [{ id: "main", type: "page", url: "app://-/index.html", webSocketDebuggerUrl: "ws://127.0.0.1:9341/devtools/page/main" }]; } }),
    webSocketFactory: () => new FakeSocket(),
  });
  assert.equal(result.width, 1200);
  assert.equal(result.height, 750);
  assert.equal((await readFile(outputPath)).subarray(0, 2).toString("hex"), "ffd8");
  assert.ok(commands.some(({ method, params }) => method === "Emulation.setDeviceMetricsOverride" && params.width === 1200 && params.height === 750));
  assert.equal(commands.at(-1).method, "Emulation.clearDeviceMetricsOverride");
  const metadataExpressions = commands.filter(({ method }) => method === "Runtime.evaluate").map(({ params }) => params.expression).filter((expression) => expression.includes("document.documentElement"));
  assert.ok(metadataExpressions.length >= 2);
  assert.ok(metadataExpressions.every((expression) => !/innerText|textContent|localStorage|indexedDB/i.test(expression)));
});

test("capture-preview finalizes a pack only after matching Home, Task, and narrow native captures", async (t) => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "gct-native-preview-pack-"));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const packDirectory = path.join(temp, "aurora-glass");
  const libraryRoot = path.join(temp, "library");
  await cp(sourceTheme, packDirectory, { recursive: true });
  await useTheme(packDirectory, { libraryRoot });
  const io = { stdout: { value: "", write(value) { this.value += value; } }, stderr: { value: "", write(value) { this.value += value; } } };
  const sizes = { home: [1200, 750], task: [1200, 750], narrow: [750, 1000] };
  const runtimePreviewCapture = async ({ state, outputPath }) => {
    const [width, height] = sizes[state];
    await sharp({ create: { width, height, channels: 3, background: state === "home" ? "#102040" : "#201020" } }).jpeg().toFile(outputPath);
    return {
      path: outputPath,
      state,
      width,
      height,
      route: state === "home" ? "home" : "task",
      compatibility: "verified",
      invariantSafety: "verified",
      invariants: { sidebar: "verified", suggestions: state === "home" ? "verified" : "inactive", composer: "verified", attachments: "inactive" },
    };
  };
  for (const state of ["home", "task", "narrow"]) {
    const exitCode = await runCli([
      "capture-preview", packDirectory,
      "--state", state,
      "--codex-version", "2026.7.21",
      "--confirm-clean",
      "--force",
      "--library", libraryRoot,
    ], io, { runtimePreviewCapture, platform: "darwin" });
    assert.equal(exitCode, 0, io.stderr.value);
  }
  const manifest = JSON.parse(await readFile(path.join(packDirectory, "manifest.json"), "utf8"));
  const evidence = JSON.parse(await readFile(path.join(packDirectory, "screenshots/capture-evidence.json"), "utf8"));
  assert.deepEqual(manifest.previewMetadata, {
    kind: "verified-capture",
    renderer: "native-capture",
    label: "Verified native Codex capture on macOS",
    platform: "macos",
    codexVersion: "2026.7.21",
  });
  assert.deepEqual(Object.keys(evidence.captures).sort(), ["home", "narrow", "task"]);
  assert.deepEqual(await readFile(path.join(packDirectory, "assets/preview.jpg")), await readFile(path.join(packDirectory, "screenshots/home.jpg")));
  assert.equal(validateManifest(manifest, { packDirectory, strictAssets: true }).valid, true);
  assert.match(io.stdout.value, /gallery preview and verified-capture metadata were finalized/);
});

test("capture-preview requires an explicit clean-workspace acknowledgement before any live access", async () => {
  const io = { stdout: { value: "", write(value) { this.value += value; } }, stderr: { value: "", write(value) { this.value += value; } } };
  let captures = 0;
  const exitCode = await runCli([
    "capture-preview", sourceTheme,
    "--state", "home",
    "--codex-version", "2026.7.21",
  ], io, { runtimePreviewCapture: async () => { captures += 1; } });
  assert.equal(exitCode, 1);
  assert.equal(captures, 0);
  assert.match(io.stderr.value, /clean demo workspace/);
});

test("render-preview uses the isolated HTML/CSS renderer without a Codex runtime", async (t) => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "gct-html-preview-test-"));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const packDirectory = path.join(temp, "theme");
  await cp(sourceTheme, packDirectory, { recursive: true });
  let invocation;
  let stdout = "";
  const code = await runCli(["render-preview", packDirectory, "--state", "all", "--force"], {
    stdin: null,
    stdout: { write(value) { stdout += value; } },
    stderr: { write() {} },
  }, {
    htmlPreviewRenderer: async (options) => {
      invocation = options;
      return {
        renderer: "html-css",
        browser: "test-browser",
        states: [
          { state: "home", width: 1200, height: 750, destination: "home.jpg" },
          { state: "task", width: 1200, height: 750, destination: "task.jpg" },
          { state: "narrow", width: 750, height: 1000, destination: "narrow.jpg" },
        ],
      };
    },
  });
  assert.equal(code, 0);
  assert.equal(invocation.packDirectory, packDirectory);
  assert.equal(invocation.state, "all");
  assert.equal(invocation.force, true);
  assert.match(stdout, /did not access the Codex app or user data/);
  const manifest = JSON.parse(await readFile(path.join(packDirectory, "manifest.json"), "utf8"));
  assert.deepEqual(manifest.previewMetadata, {
    kind: "illustrative",
    renderer: "html-css",
    label: "Illustrative HTML/CSS Codex preview — no user data",
  });
  assert.equal(manifest.assets.captureEvidence, undefined);
});

test("platform launchers auto-select a bounded port and still verify Codex ownership", async () => {
  const root = path.resolve(import.meta.dirname, "../../..");
  const [mac, lifecycle, windows] = await Promise.all([
    readFile(path.join(root, "platforms/macos/start.sh"), "utf8"),
    readFile(path.join(root, "runtime/macos-lifecycle.mjs"), "utf8"),
    readFile(path.join(root, "platforms/windows/start.ps1"), "utf8"),
  ]);
  assert.match(mac, /macos-lifecycle\.mjs/);
  assert.match(lifecycle, /FIRST_CDP_PORT = 9341/);
  assert.match(lifecycle, /LAST_CDP_PORT = 9441/);
  assert.match(lifecycle, /com\.openai\.codex/);
  assert.match(lifecycle, /findMacCodexApp/);
  assert.match(lifecycle, /remote-debugging-address=127\.0\.0\.1/);
  assert.match(lifecycle, /verifyCodexCdpOwner/);
  assert.match(windows, /9341\.\.9399/);
  assert.match(windows, /OwningProcess/);
  assert.match(windows, /Get-AppxPackage OpenAI\.Codex/);
  assert.doesNotMatch(windows, /Get-Process ChatGPT/);
  assert.match(windows, /app:\/\/-\/index\.html/);
});

test("create-from-image produces responsive assets and schema-mirrored zero-overlay tokens", async (t) => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "gct-image-command-"));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const image = path.join(temp, "source.jpg");
  await sharp({ create: { width: 2560, height: 1440, channels: 3, background: "#2563EB" } }).jpeg().toFile(image);
  const result = await createThemePackFromImage({
    imagePath: image,
    id: "derived-blue",
    name: "Derived Blue",
    mode: "dark",
    outputDirectory: temp,
  });
  assert.equal(result.manifest.layout.overlayStrength, 0);
  assert.equal(result.assets.length, 4);
  await Promise.all([
    access(path.join(result.packDirectory, "assets/background.jpg")),
    access(path.join(result.packDirectory, "assets/background-16x9.jpg")),
    access(path.join(result.packDirectory, "assets/background-4x3.jpg")),
    access(path.join(result.packDirectory, "assets/preview.jpg")),
  ]);
  const tokens = JSON.parse(await readFile(path.join(result.packDirectory, "tokens/visual-theme.json"), "utf8"));
  assert.deepEqual(tokens.palette, result.manifest.palette);
  assert.deepEqual(tokens.layout, result.manifest.layout);
  assert.equal(validateManifest(result.manifest, { packDirectory: result.packDirectory }).valid, true);
});
