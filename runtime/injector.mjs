#!/usr/bin/env node
import { watch as watchFileSystem } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundleSignature, defaultLibraryRoot, loadActiveTheme } from "./lib/theme-loader.mjs";
import { getThemeSurfaceSnapshot, handleThemeControlAction } from "./lib/theme-state.mjs";
import {
  assertLoopbackWebSocket,
  assertSupportedLivePlatform,
  listOwnedCodexTargets,
  verifyCodexCdpOwner,
} from "./lib/cdp-owner.mjs";
import { isMainModule } from "./lib/main-module.mjs";

const runtimeRoot = path.dirname(fileURLToPath(import.meta.url));
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const CONTROL_BINDING = "getCodexThemeControl";
const DEFAULT_CDP_CONNECT_TIMEOUT_MS = 8_000;
const DEFAULT_CDP_COMMAND_TIMEOUT_MS = 15_000;

function parseArguments(argv) {
  const options = {
    mode: "watch",
    port: 9341,
    timeoutMs: 30_000,
    libraryRoot: defaultLibraryRoot(),
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (["--watch", "--once", "--verify", "--remove", "--validate", "--dry-run"].includes(argument)) {
      options.mode = argument.slice(2);
    } else if (argument === "--port") {
      options.port = Number(argv[++index]);
    } else if (argument === "--timeout-ms") {
      options.timeoutMs = Number(argv[++index]);
    } else if (argument === "--library") {
      options.libraryRoot = path.resolve(argv[++index]);
    } else if (argument === "--help" || argument === "-h") {
      options.mode = "help";
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  if (!Number.isInteger(options.port) || options.port < 1024 || options.port > 65535) {
    throw new Error(`Port must be an integer between 1024 and 65535: ${options.port}`);
  }
  if (!Number.isFinite(options.timeoutMs) || options.timeoutMs < 250) {
    throw new Error(`Invalid timeout: ${options.timeoutMs}`);
  }
  return options;
}

function printHelp() {
  console.log(`GetCodexTheme companion runtime (unofficial)

Usage: node runtime/injector.mjs [mode] [options]

Modes:
  --validate   Validate the active pointer, manifest and background without Codex
  --dry-run    Print the resolved injection plan without connecting to Codex
  --once       Inject once into the current Codex renderer
  --watch      Keep injecting after Codex navigation/reloads (default)
  --verify     Verify runtime markers in the current renderer
  --remove     Remove injected styles from the current renderer

Options:
  --library PATH       Theme library (default: ~/.codex/get-codex-theme)
  --port PORT          Loopback DevTools port (default: 9341)
  --timeout-ms NUMBER  Connection timeout (default: 30000)

This runtime uses loopback Chromium DevTools Protocol injection. It does not
modify the signed Codex app and it does not add themes to official Appearance.`);
}

async function listTargets(port) {
  return listOwnedCodexTargets(port);
}

async function waitForTargets(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastMessage = "no matching renderer";
  while (Date.now() < deadline) {
    try {
      const targets = await listTargets(port);
      if (targets.length) return targets;
      lastMessage = "the endpoint was reachable but the main Codex renderer was not present";
    } catch (error) {
      lastMessage = error.message;
    }
    await sleep(350);
  }
  throw new Error(`Could not find Codex on loopback CDP port ${port}: ${lastMessage}`);
}

export class CdpSession {
  constructor(target, expectedPort, {
    WebSocketImpl = globalThis.WebSocket,
    verifyOwner = verifyCodexCdpOwner,
    connectTimeoutMs = DEFAULT_CDP_CONNECT_TIMEOUT_MS,
    commandTimeoutMs = DEFAULT_CDP_COMMAND_TIMEOUT_MS,
  } = {}) {
    if (typeof WebSocketImpl !== "function") throw new Error("Node.js 22 or later is required (WebSocket is unavailable).");
    this.endpoint = assertLoopbackWebSocket(target.webSocketDebuggerUrl, expectedPort);
    this.expectedPort = expectedPort;
    this.target = target;
    this.WebSocketImpl = WebSocketImpl;
    this.verifyOwner = verifyOwner;
    this.connectTimeoutMs = connectTimeoutMs;
    this.commandTimeoutMs = commandTimeoutMs;
    this.socket = null;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.closed = false;
  }

  async open() {
    await this.verifyOwner({ port: this.expectedPort });
    try {
      this.socket = new this.WebSocketImpl(this.endpoint);
      await new Promise((resolve, reject) => {
        let settled = false;
        const finish = (callback, value) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          this.socket.removeEventListener?.("open", onOpen);
          this.socket.removeEventListener?.("error", onError);
          this.socket.removeEventListener?.("close", onClose);
          callback(value);
        };
        const onOpen = () => finish(resolve);
        const onError = () => finish(reject, new Error("CDP WebSocket connection failed."));
        const onClose = () => finish(reject, new Error("CDP WebSocket closed before it opened."));
        const timer = setTimeout(() => {
          finish(reject, new Error(`CDP WebSocket connection timed out after ${this.connectTimeoutMs}ms.`));
          try { this.socket.close(); } catch {}
        }, this.connectTimeoutMs);
        timer.unref?.();
        this.socket.addEventListener("open", onOpen, { once: true });
        this.socket.addEventListener("error", onError, { once: true });
        this.socket.addEventListener("close", onClose, { once: true });
      });
    } catch (error) {
      this.close(error);
      throw error;
    }
    try {
      this.socket.addEventListener("message", (event) => this.onMessage(event));
      this.socket.addEventListener("error", () => this.close(new Error("CDP WebSocket failed.")));
      this.socket.addEventListener("close", () => this.fail(new Error("CDP WebSocket closed.")));
      await this.send("Runtime.enable");
      await this.send("Page.enable");
      return this;
    } catch (error) {
      this.close(error);
      throw error;
    }
  }

  onMessage(event) {
    let message;
    try {
      message = JSON.parse(String(event.data));
    } catch {
      this.close(new Error("CDP WebSocket returned malformed JSON."));
      return;
    }
    if (message.id) {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      clearTimeout(pending.timer);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
      return;
    }
    for (const listener of this.listeners.get(message.method) ?? []) listener(message.params ?? {});
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) ?? [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
  }

  send(method, params = {}) {
    if (this.closed || !this.socket) return Promise.reject(new Error("CDP socket is closed."));
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      const timer = setTimeout(() => {
        if (!this.pending.delete(id)) return;
        const error = new Error(`CDP command ${method} timed out after ${this.commandTimeoutMs}ms.`);
        reject(error);
        this.close(error);
      }, this.commandTimeoutMs);
      timer.unref?.();
      this.pending.set(id, { resolve, reject, timer });
      try {
        this.socket.send(JSON.stringify({ id, method, params }));
      } catch (error) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(error);
        this.close(error);
      }
    });
  }

  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: false,
    });
    if (result.exceptionDetails) {
      const description = result.exceptionDetails.exception?.description ?? result.exceptionDetails.text;
      throw new Error(`Renderer evaluation failed: ${description}`);
    }
    return result.result?.value;
  }

  fail(error) {
    if (this.closed && this.pending.size === 0) return;
    this.closed = true;
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
  }

  close(reason = new Error("CDP session closed.")) {
    const shouldCloseSocket = !this.closed;
    this.closed = true;
    this.fail(reason);
    if (shouldCloseSocket) {
      try { this.socket?.close(); } catch {}
    }
  }
}

function createThemeChangeMonitor(libraryRoot) {
  let dirty = false;
  const watchers = [];
  const addWatcher = (directory, options, accepts) => {
    try {
      const watcher = watchFileSystem(directory, { persistent: false, ...options }, (_event, filename) => {
        if (!filename || accepts(String(filename))) dirty = true;
      });
      watcher.on("error", () => { dirty = true; });
      watchers.push(watcher);
    } catch {
      // The periodic fallback below remains authoritative when fs.watch is unavailable.
    }
  };
  addWatcher(libraryRoot, {}, (filename) => [
    "active-theme.json",
    "active-theme",
    "runtime-control.json",
  ].includes(filename));
  addWatcher(path.join(libraryRoot, "themes"), { recursive: true }, () => true);
  return {
    consume() {
      if (!dirty) return false;
      dirty = false;
      return true;
    },
    close() {
      for (const watcher of watchers) watcher.close();
    },
  };
}

export async function loadBundle(libraryRoot) {
  const [cssText, rendererTemplate, menuInstaller, loadedTheme, snapshot] = await Promise.all([
    fs.readFile(path.join(runtimeRoot, "assets", "theme.css"), "utf8"),
    fs.readFile(path.join(runtimeRoot, "assets", "renderer-inject.js"), "utf8"),
    fs.readFile(path.join(runtimeRoot, "assets", "theme-menu.js"), "utf8"),
    loadActiveTheme({ libraryRoot, includeImage: true }),
    getThemeSurfaceSnapshot({ libraryRoot }),
  ]);
  const rendererText = rendererTemplate
    .replace("__GCT_MENU_INSTALLER__", menuInstaller.trim())
    .replace("__GCT_MENU_SNAPSHOT__", JSON.stringify(snapshot));
  const bundleId = bundleSignature(cssText, `${rendererText}\0${JSON.stringify(snapshot)}`, loadedTheme);
  const payload = rendererText
    .replace("__GCT_CSS__", JSON.stringify(cssText))
    .replace("__GCT_THEME__", JSON.stringify(loadedTheme.theme))
    .replace("__GCT_ART__", JSON.stringify(loadedTheme.imageDataUrls))
    .replace("__GCT_BRAND__", JSON.stringify(loadedTheme.brandLogoDataUrl))
    .replace("__GCT_BUNDLE__", JSON.stringify(bundleId));
  const menuPayload = `(${menuInstaller.trim()})(${JSON.stringify({ bindingName: CONTROL_BINDING, snapshot })})`;
  return { bundleId, payload, menuPayload, loadedTheme, snapshot };
}

async function validate(options, dryRun = false) {
  const bundle = await loadBundle(options.libraryRoot);
  try {
    new Function(bundle.payload);
    new Function(bundle.menuPayload);
  } catch (error) {
    throw new Error(`Generated renderer payload is invalid: ${error.message}`);
  }
  const loadedTheme = bundle.loadedTheme;
  const result = {
    valid: true,
    dryRun,
    delivery: "visual-cdp",
    officialAppearance: false,
    theme: { id: loadedTheme.theme.id, name: loadedTheme.theme.name, mode: loadedTheme.theme.mode, version: loadedTheme.theme.version },
    libraryRoot: loadedTheme.libraryRoot,
    pointerPath: loadedTheme.pointerPath,
    manifestPath: loadedTheme.manifestPath,
    backgrounds: Object.fromEntries(Object.keys(loadedTheme.imagePaths).map((key) => [key, {
      path: loadedTheme.imagePaths[key],
      bytes: loadedTheme.imageBytesByLayout[key],
    }])),
    bundleId: bundle.bundleId,
    payloadBytes: Buffer.byteLength(bundle.payload),
  };
  console.log(JSON.stringify(result, null, 2));
}

const REMOVE_EXPRESSION = `(() => {
  const state = globalThis.__GET_CODEX_THEME_RUNTIME__;
  if (state?.cleanup) return state.cleanup();
  document.getElementById('get-codex-theme-style')?.remove();
  document.getElementById('get-codex-theme-background')?.remove();
  // Compatibility cleanup for runtime builds that rendered a floating logo.
  document.getElementById('get-codex-theme-brand')?.remove();
  document.getElementById('get-codex-theme-workspace-brand')?.remove();
  document.getElementById('get-codex-theme-shell-brand')?.remove();
  globalThis.__GET_CODEX_THEME_MENU__?.cleanup?.();
  document.documentElement.classList.remove('get-codex-theme-active');
  document.documentElement.removeAttribute('data-codex-theme');
  document.documentElement.removeAttribute('data-gct-route');
  document.querySelectorAll('.gct-home').forEach((node) => node.classList.remove('gct-home'));
  document.querySelectorAll('.gct-home-shell').forEach((node) => node.classList.remove('gct-home-shell'));
  return true;
})()`;

const VERIFY_EXPRESSION = `(() => ({
  installed: document.documentElement.classList.contains('get-codex-theme-active'),
  themeId: document.documentElement.dataset.codexTheme ?? null,
  route: document.documentElement.dataset.gctRoute ?? null,
  stylePresent: Boolean(document.getElementById('get-codex-theme-style')),
  backgroundPresent: Boolean(document.getElementById('get-codex-theme-background')),
  invariantSafety: document.documentElement.dataset.gctInvariantSafety ?? null,
  invariantStatus: globalThis.__GET_CODEX_THEME_RUNTIME__?.getInvariantStatus?.() ?? null,
  bundleId: globalThis.__GET_CODEX_THEME_RUNTIME__?.bundleId ?? null
}))()`;

const PAUSE_EXPRESSION = `(() => {
  const state = globalThis.__GET_CODEX_THEME_RUNTIME__;
  return state?.pause?.() ?? false;
})()`;

async function installControlBinding(session, options) {
  await session.send("Runtime.addBinding", { name: CONTROL_BINDING });
  session.on("Runtime.bindingCalled", ({ name, payload }) => {
    if (name !== CONTROL_BINDING || typeof payload !== "string" || payload.length > 2_048) return;
    void (async () => {
      let action;
      try {
        action = JSON.parse(payload);
        await handleThemeControlAction(action, { libraryRoot: options.libraryRoot });
        console.log(`[get-codex-theme] surface action accepted: ${action.action}${action.themeId ? ` ${action.themeId}` : ""}`);
      } catch (error) {
        console.error(`[get-codex-theme] surface action rejected: ${error.message}`);
      }
    })();
  });
}

async function runAcrossTargets(options, mode) {
  const targets = await waitForTargets(options.port, options.timeoutMs);
  const bundle = mode === "once" ? await loadBundle(options.libraryRoot) : null;
  const results = [];
  for (const target of targets) {
    const session = await new CdpSession(target, options.port).open();
    try {
      const value = mode === "once"
        ? await session.evaluate(bundle.payload)
        : mode === "remove"
          ? await session.evaluate(REMOVE_EXPRESSION)
          : await session.evaluate(VERIFY_EXPRESSION);
      results.push({ targetId: target.id, title: target.title, result: value });
    } finally {
      session.close();
    }
  }
  const output = { mode, port: options.port, targets: results };
  console.log(JSON.stringify(output, null, 2));
  if (mode === "verify" && results.some(({ result }) => !result.installed || !result.stylePresent || !result.backgroundPresent)) {
    process.exitCode = 2;
  }
}

async function runWatch(options) {
  let bundle = await loadBundle(options.libraryRoot);
  const sessions = new Map();
  const changes = createThemeChangeMonitor(options.libraryRoot);
  let stopping = false;
  let lastThemeCheck = Date.now();
  let lastLoadError = "";
  const stop = () => {
    stopping = true;
    for (const session of sessions.values()) session.close(new Error("Theme watcher is stopping."));
    sessions.clear();
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  console.log(`[get-codex-theme] watching Codex on 127.0.0.1:${options.port}; theme ${bundle.loadedTheme.theme.id}${bundle.snapshot.paused ? " (paused)" : ""}`);

  try {
    while (!stopping) {
      if (changes.consume() || Date.now() - lastThemeCheck > 5_000) {
        lastThemeCheck = Date.now();
        try {
          const nextBundle = await loadBundle(options.libraryRoot);
          if (nextBundle.bundleId !== bundle.bundleId) {
            bundle = nextBundle;
            for (const session of sessions.values()) {
              if (bundle.snapshot.paused) {
                await session.evaluate(PAUSE_EXPRESSION).catch(() => {});
                await session.evaluate(bundle.menuPayload).catch(() => {});
              } else {
                await session.evaluate(bundle.payload).catch(() => {});
              }
            }
            console.log(`[get-codex-theme] ${bundle.snapshot.paused ? "paused visuals for" : "applied theme"} ${bundle.loadedTheme.theme.id}; bundle ${bundle.bundleId}`);
          }
          lastLoadError = "";
        } catch (error) {
          if (error.message !== lastLoadError) console.error(`[get-codex-theme] theme reload skipped: ${error.message}`);
          lastLoadError = error.message;
        }
      }

      let targets = [];
      try {
        targets = await listTargets(options.port);
      } catch {
        for (const session of sessions.values()) session.close();
        sessions.clear();
        await sleep(600);
        continue;
      }
      const liveIds = new Set(targets.map((target) => target.id));
      for (const [id, session] of sessions) {
        if (!liveIds.has(id) || session.closed) {
          session.close();
          sessions.delete(id);
        }
      }
      for (const target of targets) {
        if (sessions.has(target.id)) continue;
        try {
          const session = await new CdpSession(target, options.port).open();
          await installControlBinding(session, options);
          session.on("Page.loadEventFired", () => {
            setTimeout(() => session.evaluate(bundle.snapshot.paused ? bundle.menuPayload : bundle.payload).catch((error) => {
              if (!session.closed) console.error(`[get-codex-theme] reinjection failed: ${error.message}`);
            }), 75);
          });
          const result = await session.evaluate(bundle.snapshot.paused ? bundle.menuPayload : bundle.payload);
          sessions.set(target.id, session);
          console.log(`[get-codex-theme] ${bundle.snapshot.paused ? "mounted controls on" : result.reused ? "reused" : "injected"} target ${target.id}; bundle ${bundle.bundleId}`);
        } catch (error) {
          console.error(`[get-codex-theme] injection failed for ${target.id}: ${error.message}`);
        }
      }
      await sleep(sessions.size === 0 ? 120 : 400);
    }
  } finally {
    changes.close();
    for (const session of sessions.values()) session.close();
  }
}

export async function runInjector(argv = process.argv.slice(2)) {
  const options = parseArguments(argv);
  if (options.mode === "help") printHelp();
  else if (options.mode === "validate") await validate(options, false);
  else if (options.mode === "dry-run") await validate(options, true);
  else {
    assertSupportedLivePlatform();
    if (options.mode === "watch") await runWatch(options);
    else await runAcrossTargets(options, options.mode);
  }
}

if (isMainModule(import.meta.url)) {
  try {
    await runInjector();
  } catch (error) {
    console.error(`[get-codex-theme] ${error.message}`);
    process.exitCode = 1;
  }
}
