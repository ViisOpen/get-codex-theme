import { spawn } from "node:child_process";
import { constants, existsSync } from "node:fs";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RUNTIME_STATE_FILE = "runtime-state.json";
const CONTROL_STATE_FILE = "runtime-control.json";
const MAX_SCREENSHOT_BYTES = 32 * 1024 * 1024;
export const PREVIEW_CAPTURE_SPECS = Object.freeze({
  home: Object.freeze({ width: 1200, height: 750, route: "home", requiredInvariants: Object.freeze(["sidebar", "suggestions", "composer"]) }),
  task: Object.freeze({ width: 1200, height: 750, route: "task", requiredInvariants: Object.freeze(["sidebar", "composer"]) }),
  narrow: Object.freeze({ width: 750, height: 1000, route: "task", requiredInvariants: Object.freeze(["sidebar", "composer"]) }),
});
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(HERE, "..");
const REPOSITORY_ROOT = path.resolve(HERE, "../../..");

function supportedPlatform(platform) {
  if (platform === "darwin") return "macos";
  if (platform === "win32") return "windows";
  throw new Error(`Runtime control is supported on macOS and Windows; found ${platform}.`);
}

function assertPort(value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error(`Port must be an integer between 1024 and 65535: ${value}`);
  }
  return port;
}

async function defaultRunner(command, args) {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    const stdout = [];
    const stderr = [];
    let bytes = 0;
    const collect = (target) => (chunk) => {
      bytes += chunk.byteLength;
      if (bytes > 2 * 1024 * 1024) {
        child.kill();
        reject(new Error("Platform command produced more than 2 MB of output."));
        return;
      }
      target.push(chunk);
    };
    child.stdout.on("data", collect(stdout));
    child.stderr.on("data", collect(stderr));
    child.once("error", reject);
    child.once("close", (code) => resolve({
      code: code ?? 1,
      stdout: Buffer.concat(stdout).toString("utf8"),
      stderr: Buffer.concat(stderr).toString("utf8"),
    }));
  });
}

function actionCommand(action, { libraryRoot, platform = process.platform, port, restart = false }) {
  const platformName = supportedPlatform(platform);
  const bin = path.join(libraryRoot, "bin");
  const script = path.join(bin, platformName === "macos" ? "start-macos.sh" : "start-windows.ps1");
  if (!existsSync(script)) throw new Error(`Runtime launcher is not installed: ${script}`);

  if (platformName === "macos") {
    const args = ["--library", libraryRoot];
    if (port !== undefined) args.push("--port", String(assertPort(port)));
    if (restart) args.push("--restart");
    return { command: script, args, platformName };
  }

  const args = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script, "-Library", libraryRoot];
  if (port !== undefined) args.push("-Port", String(assertPort(port)));
  if (restart) args.push("-Restart");
  return { command: "powershell.exe", args, platformName };
}

export async function readRuntimeState(libraryRoot) {
  const statePath = path.join(libraryRoot, RUNTIME_STATE_FILE);
  if (!existsSync(statePath)) return null;
  let state;
  try {
    state = JSON.parse(await readFile(statePath, "utf8"));
  } catch (error) {
    throw new Error(`Invalid runtime state ${statePath}: ${error.message}`);
  }
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new Error(`Invalid runtime state ${statePath}.`);
  return {
    port: assertPort(state.port),
    injectorPid: Number.isInteger(Number(state.injectorPid)) && Number(state.injectorPid) > 0 ? Number(state.injectorPid) : null,
    startedAt: typeof state.startedAt === "string" ? state.startedAt : null,
  };
}

export async function isRuntimePaused(libraryRoot) {
  const statePath = path.join(libraryRoot, CONTROL_STATE_FILE);
  if (!existsSync(statePath)) return false;
  try {
    const state = JSON.parse(await readFile(statePath, "utf8"));
    if (state?.schemaVersion !== 1) return true;
    return state.paused === true;
  } catch {
    return true;
  }
}

async function runSurfaceControl(libraryRoot, action, runner) {
  const controller = path.join(libraryRoot, "runtime", "theme-control.mjs");
  if (!existsSync(controller)) throw new Error(`Theme surface controller is not installed: ${controller}`);
  const result = await runner(process.execPath, [controller, "--library", libraryRoot, action]);
  if (!result || result.code !== 0) {
    const detail = result?.stderr?.trim() || result?.stdout?.trim() || `exit code ${result?.code ?? "unknown"}`;
    throw new Error(`${action} failed: ${detail}`);
  }
  return result.stdout?.trim() ?? "";
}

export async function runRuntimeAction(action, {
  libraryRoot,
  platform = process.platform,
  port,
  restart = false,
  runner = defaultRunner,
} = {}) {
  if (!["launch", "pause", "resume"].includes(action)) throw new Error(`Unsupported runtime action: ${action}`);
  if (action === "pause") {
    const stdout = await runSurfaceControl(libraryRoot, "pause", runner);
    return { action, platform: supportedPlatform(platform), port: (await readRuntimeState(libraryRoot).catch(() => null))?.port ?? null, stdout };
  }
  if (action === "resume") await runSurfaceControl(libraryRoot, "resume", runner);
  const command = actionCommand(action, { libraryRoot, platform, port, restart });
  const result = await runner(command.command, command.args);
  if (!result || result.code !== 0) {
    const detail = result?.stderr?.trim() || result?.stdout?.trim() || `exit code ${result?.code ?? "unknown"}`;
    if (action === "resume") await runSurfaceControl(libraryRoot, "pause", runner).catch(() => {});
    throw new Error(`${action} failed: ${detail}`);
  }
  const state = await readRuntimeState(libraryRoot).catch(() => null);
  return {
    action,
    platform: command.platformName,
    port: state?.port ?? (port === undefined ? null : assertPort(port)),
    stdout: result.stdout?.trim() ?? "",
  };
}

export async function runSurfaceAction(surface, action, {
  libraryRoot,
  platform = process.platform,
  persistent = false,
  runner = defaultRunner,
} = {}) {
  if (!libraryRoot) throw new Error("A theme library path is required.");
  if (surface === "menu-bar") {
    if (platform !== "darwin") throw new Error("The menu bar surface is available only on macOS.");
    if (!['install', 'start', 'stop'].includes(action)) throw new Error(`Unsupported menu bar action: ${action}`);
    const sourceRoot = path.join(libraryRoot, "menu-bar");
    const buildScript = path.join(sourceRoot, "build.sh");
    const app = path.join(sourceRoot, "build", "GetCodexThemeMenu.app");
    if (action !== "stop" && !existsSync(buildScript)) throw new Error(`Menu bar source is not installed: ${buildScript}`);
    if ((action === "install" || action === "start") && !existsSync(app)) {
      const built = await runner(buildScript, [app]);
      if (!built || built.code !== 0) throw new Error(`menu bar build failed: ${built?.stderr?.trim() || built?.stdout?.trim() || "unknown error"}`);
    }
    if (action === "start") {
      const opened = await runner("/usr/bin/open", ["-na", app]);
      if (!opened || opened.code !== 0) throw new Error(`menu bar start failed: ${opened?.stderr?.trim() || "unknown error"}`);
    } else if (action === "stop") {
      const stopped = await runner("/usr/bin/osascript", ["-e", 'tell application id "com.getcodextheme.menubar" to quit']);
      if (!stopped || ![0, 1].includes(stopped.code)) throw new Error(`menu bar stop failed: ${stopped?.stderr?.trim() || "unknown error"}`);
    }
    return { surface, action, app };
  }

  if (surface === "tray") {
    if (platform !== "win32") throw new Error("The tray surface is available only on Windows.");
    if (!['start', 'stop'].includes(action)) throw new Error(`Unsupported tray action: ${action}`);
    const script = path.join(libraryRoot, "bin", action === "start" ? "start-tray-windows.ps1" : "stop-tray-windows.ps1");
    if (!existsSync(script)) throw new Error(`Tray control is not installed: ${script}`);
    const result = await runner("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script, "-Library", libraryRoot]);
    if (!result || result.code !== 0) throw new Error(`tray ${action} failed: ${result?.stderr?.trim() || result?.stdout?.trim() || "unknown error"}`);
    return { surface, action };
  }
  if (surface === "watchdog") {
    if (platform !== "darwin") throw new Error("The packaged Watchdog service is currently available only on macOS.");
    if (!['enable', 'disable'].includes(action)) throw new Error(`Unsupported Watchdog action: ${action}`);
    const script = path.join(libraryRoot, "bin", action === "enable" ? "enable-watchdog-macos.sh" : "disable-watchdog-macos.sh");
    if (!existsSync(script)) throw new Error(`Watchdog control is not installed: ${script}`);
    const args = ["--library", libraryRoot];
    if (action === "enable" && persistent) args.push("--persistent");
    const result = await runner(script, args);
    if (!result || result.code !== 0) throw new Error(`watchdog ${action} failed: ${result?.stderr?.trim() || result?.stdout?.trim() || "unknown error"}`);
    return { surface, action };
  }
  throw new Error(`Unsupported surface: ${surface}`);
}

async function runInjector(libraryRoot, args, runner = defaultRunner) {
  const injector = path.join(libraryRoot, "runtime", "injector.mjs");
  if (!existsSync(injector)) throw new Error(`Runtime is not installed: ${injector}`);
  const result = await runner(process.execPath, [injector, ...args]);
  if (!result || result.code !== 0) {
    const detail = result?.stderr?.trim() || result?.stdout?.trim() || `exit code ${result?.code ?? "unknown"}`;
    throw new Error(detail);
  }
  return result.stdout?.trim() ?? "";
}

async function loadOwnershipHelper(libraryRoot, { requireInstalled = false } = {}) {
  const installed = path.join(libraryRoot, "runtime", "lib", "cdp-owner.mjs");
  const candidates = requireInstalled ? [installed] : [
    installed,
    path.join(PACKAGE_ROOT, "resources", "runtime", "lib", "cdp-owner.mjs"),
    path.join(REPOSITORY_ROOT, "runtime", "lib", "cdp-owner.mjs"),
  ];
  const helperPath = candidates.find(existsSync);
  if (!helperPath) {
    throw new Error(requireInstalled
      ? `CDP ownership helper is not installed: ${installed}`
      : "CDP ownership helper is unavailable in the library, package resources, and source repository.");
  }
  return import(pathToFileURL(helperPath).href);
}

function createCdpClient(socket) {
  let nextId = 1;
  const pending = new Map();
  const rejectAll = (error) => {
    for (const { reject, timeout } of pending.values()) {
      clearTimeout(timeout);
      reject(error);
    }
    pending.clear();
  };
  socket.addEventListener("message", (event) => {
    let message;
    try { message = JSON.parse(String(event.data)); }
    catch { return; }
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    clearTimeout(request.timeout);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result ?? {});
  });
  socket.addEventListener("error", () => rejectAll(new Error("The Codex renderer connection failed.")));
  socket.addEventListener("close", () => rejectAll(new Error("The Codex renderer connection closed.")));
  return {
    async send(method, params = {}, timeoutMs = 8_000) {
      const id = nextId++;
      return await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`${method} timed out.`));
        }, timeoutMs);
        pending.set(id, { resolve, reject, timeout });
        try { socket.send(JSON.stringify({ id, method, params })); }
        catch (error) {
          clearTimeout(timeout);
          pending.delete(id);
          reject(error);
        }
      });
    },
  };
}

async function withOwnedCodexRenderer(libraryRoot, port, {
  fetchImpl = globalThis.fetch,
  ownershipRunner,
  ownershipPlatform = process.platform,
  webSocketFactory,
} = {}, callback) {
  const ownership = await loadOwnershipHelper(libraryRoot, { requireInstalled: true });
  const targets = await ownership.listOwnedCodexTargets(port, { platform: ownershipPlatform, runner: ownershipRunner, fetchImpl });
  const target = targets[0] ?? null;
  if (!target?.webSocketDebuggerUrl) throw new Error("The verified endpoint has no main Codex renderer.");
  await ownership.verifyCodexCdpOwner({ port, platform: ownershipPlatform, runner: ownershipRunner });
  const endpoint = ownership.assertLoopbackWebSocket(target.webSocketDebuggerUrl, port);
  const createWebSocket = webSocketFactory ?? ((url) => {
    if (typeof WebSocket !== "function") throw new Error("Node.js 22 or later is required to capture a runtime screenshot.");
    return new WebSocket(url);
  });
  const socket = createWebSocket(endpoint);
  try {
    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", reject, { once: true });
    });
    return await callback(createCdpClient(socket));
  } finally {
    socket.close();
  }
}

function inspectJpeg(bytes) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset += 1; continue; }
    const marker = bytes[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (offset + 2 > bytes.length) break;
    const length = bytes.readUInt16BE(offset);
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker) && offset + 7 <= bytes.length) {
      return { width: bytes.readUInt16BE(offset + 5), height: bytes.readUInt16BE(offset + 3) };
    }
    offset += Math.max(length, 2);
  }
  return null;
}

const PREVIEW_STATE_EXPRESSION = `(() => {
  const root = document.documentElement;
  return {
    route: root.dataset.gctRoute ?? "unknown",
    themeId: root.dataset.codexTheme ?? null,
    compatibility: root.dataset.gctCompatibility ?? "unknown",
    invariantSafety: root.dataset.gctInvariantSafety ?? "unknown",
    invariants: {
      sidebar: root.dataset.gctInvariantSidebar ?? "unknown",
      suggestions: root.dataset.gctInvariantSuggestions ?? "unknown",
      composer: root.dataset.gctInvariantComposer ?? "unknown",
      attachments: root.dataset.gctInvariantAttachments ?? "unknown",
    },
    viewport: { width: innerWidth, height: innerHeight },
  };
})()`;

async function readPreviewState(client) {
  const response = await client.send("Runtime.evaluate", { expression: PREVIEW_STATE_EXPRESSION, returnByValue: true });
  const value = response?.result?.value;
  if (!value || typeof value !== "object") throw new Error("Codex returned invalid preview state metadata.");
  return value;
}

function assertPreviewState(state, spec, expectedThemeId) {
  if (state.themeId !== expectedThemeId) throw new Error(`The live Codex renderer is using ${state.themeId ?? "no theme"}; expected ${expectedThemeId}.`);
  if (state.route !== spec.route) throw new Error(`Open the Codex ${spec.route === "home" ? "Home" : "Task"} page before capturing this preview; current route is ${state.route}.`);
  if (state.compatibility !== "verified") throw new Error(`The current Codex page structure is ${state.compatibility}; preview capture requires a verified native layout.`);
  if (state.invariantSafety === "fallback") throw new Error("The theme changed native Codex geometry, so preview capture was refused.");
  for (const invariant of spec.requiredInvariants) {
    if (state.invariants?.[invariant] !== "verified") {
      throw new Error(`The native ${invariant} layout is ${state.invariants?.[invariant] ?? "unknown"}; preview capture requires it to be verified.`);
    }
  }
}

async function captureScreenshot(libraryRoot, port, outputPath, {
  fetchImpl = globalThis.fetch,
  ownershipRunner,
  ownershipPlatform = process.platform,
  webSocketFactory,
} = {}) {
  return await withOwnedCodexRenderer(libraryRoot, port, { fetchImpl, ownershipRunner, ownershipPlatform, webSocketFactory }, async (client) => {
    const payload = await client.send("Page.captureScreenshot", { format: "png", fromSurface: true });
    const bytes = Buffer.from(payload?.data ?? "", "base64");
    if (bytes.length < 8 || bytes.length > MAX_SCREENSHOT_BYTES || !bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
      throw new Error("DevTools returned an invalid or oversized PNG screenshot.");
    }
    const absolute = path.resolve(outputPath);
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, bytes, { flag: "wx" });
    return absolute;
  });
}

export async function captureRuntimePreview({
  libraryRoot,
  port,
  state,
  expectedThemeId,
  outputPath,
  runner = defaultRunner,
  fetchImpl,
  ownershipRunner,
  ownershipPlatform = process.platform,
  webSocketFactory,
} = {}) {
  const spec = PREVIEW_CAPTURE_SPECS[state];
  if (!spec) throw new Error(`Preview state must be one of: ${Object.keys(PREVIEW_CAPTURE_SPECS).join(", ")}.`);
  if (typeof expectedThemeId !== "string" || expectedThemeId.length === 0) throw new Error("An expected theme id is required.");
  if (!outputPath) throw new Error("A preview output path is required.");
  const runtimeState = await readRuntimeState(libraryRoot);
  const resolvedPort = port === undefined ? runtimeState?.port : assertPort(port);
  if (!resolvedPort) throw new Error("No runtime port is recorded. Launch the theme runtime first or pass --port.");
  const raw = await runInjector(libraryRoot, ["--verify", "--port", String(resolvedPort), "--timeout-ms", "2500"], runner);
  let report;
  try { report = JSON.parse(raw); }
  catch { throw new Error("Runtime verification returned malformed JSON."); }
  const failed = !Array.isArray(report.targets) || report.targets.length === 0 || report.targets.some(({ result }) => (
    !result?.installed || !result?.stylePresent || !result?.backgroundPresent
  ));
  if (failed) throw new Error("The Codex renderer did not contain a complete GetCodexTheme installation.");

  return await withOwnedCodexRenderer(libraryRoot, resolvedPort, {
    fetchImpl,
    ownershipRunner,
    ownershipPlatform,
    webSocketFactory,
  }, async (client) => {
    let metricsOverridden = false;
    try {
      const initialState = await readPreviewState(client);
      assertPreviewState(initialState, spec, expectedThemeId);
      await client.send("Emulation.setDeviceMetricsOverride", {
        width: spec.width,
        height: spec.height,
        deviceScaleFactor: 1,
        mobile: false,
        screenWidth: spec.width,
        screenHeight: spec.height,
      });
      metricsOverridden = true;
      await client.send("Runtime.evaluate", {
        expression: "new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => resolve(true), 120))))",
        awaitPromise: true,
        returnByValue: true,
      });
      const captureState = await readPreviewState(client);
      assertPreviewState(captureState, spec, expectedThemeId);
      if (captureState.viewport?.width !== spec.width || captureState.viewport?.height !== spec.height) {
        throw new Error(`Codex did not adopt the requested ${spec.width}x${spec.height} preview viewport.`);
      }
      const payload = await client.send("Page.captureScreenshot", {
        format: "jpeg",
        quality: 92,
        fromSurface: true,
        captureBeyondViewport: false,
      }, 12_000);
      const bytes = Buffer.from(payload?.data ?? "", "base64");
      const dimensions = bytes.length <= MAX_SCREENSHOT_BYTES ? inspectJpeg(bytes) : null;
      if (!dimensions || dimensions.width !== spec.width || dimensions.height !== spec.height) {
        throw new Error(`DevTools returned an invalid preview image; expected ${spec.width}x${spec.height} JPEG.`);
      }
      const absolute = path.resolve(outputPath);
      await mkdir(path.dirname(absolute), { recursive: true });
      await writeFile(absolute, bytes, { flag: "wx" });
      return {
        path: absolute,
        state,
        width: dimensions.width,
        height: dimensions.height,
        route: captureState.route,
        compatibility: captureState.compatibility,
        invariantSafety: captureState.invariantSafety,
        invariants: captureState.invariants,
        port: resolvedPort,
      };
    } finally {
      if (metricsOverridden) await client.send("Emulation.clearDeviceMetricsOverride").catch(() => {});
    }
  });
}

export async function verifyRuntime({
  libraryRoot,
  port,
  screenshot,
  runner = defaultRunner,
  fetchImpl,
  ownershipRunner,
  ownershipPlatform,
  webSocketFactory,
} = {}) {
  const state = await readRuntimeState(libraryRoot);
  const resolvedPort = port === undefined ? state?.port : assertPort(port);
  if (!resolvedPort) throw new Error("No runtime port is recorded. Launch the theme runtime first or pass --port.");
  const raw = await runInjector(libraryRoot, ["--verify", "--port", String(resolvedPort), "--timeout-ms", "2500"], runner);
  let report;
  try { report = JSON.parse(raw); }
  catch { throw new Error("Runtime verification returned malformed JSON."); }
  const failed = !Array.isArray(report.targets) || report.targets.length === 0 || report.targets.some(({ result }) => (
    !result?.installed || !result?.stylePresent || !result?.backgroundPresent
  ));
  if (failed) throw new Error("The Codex renderer did not contain a complete GetCodexTheme installation.");
  const screenshotPath = screenshot
    ? await captureScreenshot(libraryRoot, resolvedPort, screenshot, { fetchImpl, ownershipRunner, ownershipPlatform, webSocketFactory })
    : null;
  return { verified: true, port: resolvedPort, targets: report.targets, screenshotPath };
}

function check(id, status, message, detail) {
  return { id, status, message, ...(detail ? { detail } : {}) };
}

export async function diagnoseRuntime({
  libraryRoot,
  platform = process.platform,
  live = false,
  runner = defaultRunner,
  ownershipRunner = defaultRunner,
} = {}) {
  const checks = [];
  const nodeMajor = Number(process.versions.node.split(".")[0]);
  checks.push(check("node", nodeMajor >= 22 ? "pass" : "fail", nodeMajor >= 22 ? `Node.js ${process.versions.node}` : "Node.js 22 or later is required for the runtime."));
  let platformName = null;
  try {
    platformName = supportedPlatform(platform);
    checks.push(check("platform", "pass", platformName === "macos" ? "macOS runtime is supported." : "Windows runtime is supported."));
  } catch (error) {
    checks.push(check("platform", "fail", error.message));
  }
  checks.push(check("library", existsSync(libraryRoot) ? "pass" : "fail", existsSync(libraryRoot) ? `Theme library exists at ${libraryRoot}.` : `Theme library is missing at ${libraryRoot}.`));

  const pointer = path.join(libraryRoot, "active-theme.json");
  checks.push(check("active-theme", existsSync(pointer) ? "pass" : "fail", existsSync(pointer) ? "An active theme is selected." : "No active theme is selected."));
  const injector = path.join(libraryRoot, "runtime", "injector.mjs");
  checks.push(check("runtime", existsSync(injector) ? "pass" : "fail", existsSync(injector) ? "Companion runtime is installed." : "Companion runtime is not installed."));
  if (platformName === "macos") {
    try {
      const ownership = await loadOwnershipHelper(libraryRoot);
      const app = await ownership.findMacCodexApp({ runner: ownershipRunner });
      checks.push(check("codex-app", "pass", `Verified ${app.bundleIdentifier} at ${app.appBundlePath}.`));
    } catch (error) {
      checks.push(check("codex-app", "fail", "The signed com.openai.codex application could not be verified.", error.message));
    }
  }
  if (platformName) {
    const launcher = path.join(libraryRoot, "bin", platformName === "macos" ? "start-macos.sh" : "start-windows.ps1");
    checks.push(check("launcher", existsSync(launcher) ? "pass" : "fail", existsSync(launcher) ? "Platform launcher is installed." : `Platform launcher is missing: ${launcher}`));
    if (existsSync(launcher) && platformName === "macos") {
      try {
        await access(launcher, constants.X_OK);
        checks.push(check("launcher-permission", "pass", "The macOS launcher is executable."));
      } catch {
        checks.push(check("launcher-permission", "fail", `The macOS launcher is not executable: ${launcher}`));
      }
    }
    if (platformName === "windows") {
      const version = await runner("powershell.exe", [
        "-NoProfile", "-Command",
        "(Get-AppxPackage OpenAI.Codex | Sort-Object Version -Descending | Select-Object -First 1).Version.ToString()",
      ]).catch(() => null);
      checks.push(check("codex-install", version?.code === 0 && version.stdout.trim() ? "pass" : "warn", version?.code === 0 && version.stdout.trim()
        ? `Codex ${version.stdout.trim()} is installed.`
        : "The OpenAI.Codex Windows package version could not be read."));
    }
  }

  if (existsSync(injector) && existsSync(pointer)) {
    try {
      await runInjector(libraryRoot, ["--validate", "--library", libraryRoot], runner);
      checks.push(check("theme-files", "pass", "The selected theme and runtime assets validate."));
    } catch (error) {
      checks.push(check("theme-files", "fail", "The selected theme failed offline validation.", error.message));
    }
  }

  let state = null;
  try {
    state = await readRuntimeState(libraryRoot);
    if (!state) checks.push(check("runtime-state", "warn", "The runtime is not currently recorded as running."));
    else {
      let alive = false;
      if (state.injectorPid) {
        try { process.kill(state.injectorPid, 0); alive = true; }
        catch { alive = false; }
      }
      checks.push(check("runtime-state", alive ? "pass" : "warn", alive
        ? `Runtime process ${state.injectorPid} is recorded on loopback port ${state.port}.`
        : `Runtime state records port ${state.port}, but its watcher process is not running.`));
    }
  } catch (error) {
    checks.push(check("runtime-state", "fail", "Runtime state is invalid.", error.message));
  }
  checks.push(check("paused", await isRuntimePaused(libraryRoot) ? "warn" : "pass", await isRuntimePaused(libraryRoot) ? "Theme runtime is paused." : "Theme runtime is not paused."));

  if (live) {
    try {
      const verification = await verifyRuntime({ libraryRoot, port: state?.port, runner });
      checks.push(check("live-renderer", "pass", `Verified ${verification.targets.length} Codex renderer target(s).`));
    } catch (error) {
      checks.push(check("live-renderer", "fail", "Live renderer verification failed.", error.message));
    }
  }
  return {
    ok: checks.every(({ status }) => status !== "fail"),
    checks,
  };
}
