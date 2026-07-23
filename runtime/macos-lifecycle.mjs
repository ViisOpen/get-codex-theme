#!/usr/bin/env node

import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { closeSync, openSync, writeSync } from "node:fs";
import {
  appendFile,
  mkdir,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { defaultLibraryRoot } from "./lib/theme-loader.mjs";
import {
  defaultProcessRunner,
  findMacCodexApp,
  ownedCodexEndpointReady,
  verifyMacCodexAppBundle,
  verifyCodexCdpOwner,
} from "./lib/cdp-owner.mjs";
import { isMainModule } from "./lib/main-module.mjs";

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const FIRST_CDP_PORT = 9341;
const LAST_CDP_PORT = 9441;
const EXIT_WAIT_MS = 20_000;
const CDP_WAIT_MS = 45_000;
const LOCK_INITIALIZATION_GRACE_MS = 5_000;
const INJECTOR_EXIT_WAIT_MS = 2_000;
const CODEX_BUNDLE_ID = "com.openai.codex";

export class MacLifecycleError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "MacLifecycleError";
    this.code = code;
  }
}

function checkedPort(value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new MacLifecycleError("INVALID_PORT", `CDP port must be an integer between 1024 and 65535: ${value}`);
  }
  return port;
}

function parseArguments(argv) {
  const options = { libraryRoot: defaultLibraryRoot(), port: null, restart: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--library") options.libraryRoot = path.resolve(argv[++index] ?? "");
    else if (argument === "--port") options.port = checkedPort(argv[++index]);
    else if (argument === "--restart") options.restart = true;
    else if (["--help", "-h"].includes(argument)) options.help = true;
    else throw new MacLifecycleError("INVALID_ARGUMENT", `Unknown argument: ${argument}`);
  }
  return options;
}

export function parseMacProcessRows(stdout, executablePath) {
  return String(stdout)
    .split(/\r?\n/)
    .map((line) => /^\s*([1-9][0-9]*)\s+(.+?)\s*$/.exec(line))
    .filter(Boolean)
    .map((match) => ({ pid: Number(match[1]), command: match[2] }))
    .filter(({ command }) => command === executablePath || command.startsWith(`${executablePath} `));
}

export function macCommandHasCdpFlags(command, port) {
  const value = String(command);
  const escapedPort = String(checkedPort(port)).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return /(?:^|\s)--remote-debugging-address(?:=|\s+)127\.0\.0\.1(?:\s|$)/.test(value) &&
    new RegExp(`(?:^|\\s)--remote-debugging-port(?:=|\\s+)${escapedPort}(?:\\s|$)`).test(value);
}

async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    return null;
  }
}

async function writeJsonAtomic(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, filePath);
}

async function appendDiagnostic(libraryRoot, event, detail = {}) {
  const logDirectory = path.join(libraryRoot, "logs");
  await mkdir(logDirectory, { recursive: true, mode: 0o700 });
  await appendFile(path.join(logDirectory, "macos-lifecycle.log"), `${JSON.stringify({
    at: new Date().toISOString(),
    event,
    ...detail,
  })}\n`, { mode: 0o600 });
}

export async function withMacLaunchLock(libraryRoot, operation, {
  processAlive = (pid) => {
    try { process.kill(pid, 0); return true; }
    catch { return false; }
  },
} = {}) {
  await mkdir(libraryRoot, { recursive: true });
  const lockPath = path.join(libraryRoot, "runtime-launch.lock");
  const ownerToken = randomUUID();
  let descriptor;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      descriptor = openSync(lockPath, "wx", 0o600);
      try {
        writeSync(descriptor, `${JSON.stringify({ pid: process.pid, token: ownerToken, startedAt: new Date().toISOString() })}\n`);
      } catch (error) {
        try { closeSync(descriptor); } catch {}
        descriptor = undefined;
        await unlink(lockPath).catch(() => {});
        throw error;
      }
      break;
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      const lock = await readJson(lockPath);
      if (Number.isInteger(lock?.pid) && lock.pid > 0 && processAlive(lock.pid)) {
        throw new MacLifecycleError("LAUNCH_IN_PROGRESS", `Another theme launch is already running as process ${lock.pid}.`);
      }
      const lockAge = await stat(lockPath).then((value) => Date.now() - value.mtimeMs).catch(() => 0);
      if (!lock && lockAge < LOCK_INITIALIZATION_GRACE_MS) {
        throw new MacLifecycleError("LAUNCH_IN_PROGRESS", "Another theme launch is initializing its lock.");
      }
      const confirmed = await readJson(lockPath);
      const fingerprint = (value) => value ? `${value.pid ?? ""}:${value.token ?? ""}:${value.startedAt ?? ""}` : "";
      if (fingerprint(confirmed) !== fingerprint(lock)) continue;
      await unlink(lockPath).catch(() => {});
    }
  }
  if (descriptor === undefined) throw new MacLifecycleError("LAUNCH_LOCK_FAILED", "Could not acquire the macOS theme launch lock.");
  try {
    return await operation();
  } finally {
    try { closeSync(descriptor); } catch {}
    const current = await readJson(lockPath);
    if (current?.token === ownerToken) await unlink(lockPath).catch(() => {});
  }
}

function openLogDescriptors(libraryRoot, prefix) {
  const logs = path.join(libraryRoot, "logs");
  const stdoutPath = path.join(logs, `${prefix}.log`);
  const stderrPath = path.join(logs, `${prefix}-error.log`);
  return mkdir(logs, { recursive: true, mode: 0o700 }).then(() => ({
    stdout: openSync(stdoutPath, "a", 0o600),
    stderr: openSync(stderrPath, "a", 0o600),
  }));
}

async function spawnDetached(command, args, { libraryRoot, logPrefix }) {
  const descriptors = await openLogDescriptors(libraryRoot, logPrefix);
  let child;
  try {
    child = spawn(command, args, {
      detached: true,
      shell: false,
      stdio: ["ignore", descriptors.stdout, descriptors.stderr],
      env: process.env,
    });
    await new Promise((resolve, reject) => {
      child.once("spawn", resolve);
      child.once("error", reject);
    });
  } finally {
    closeSync(descriptors.stdout);
    closeSync(descriptors.stderr);
  }
  if (!Number.isInteger(child?.pid) || child.pid <= 0) {
    throw new MacLifecycleError("SPAWN_FAILED", `Could not start ${command}.`);
  }
  child.unref();
  return { pid: child.pid };
}

function processInspectionDetail(result) {
  return result?.error?.message ?? result?.stderr?.trim() ?? `exit code ${result?.code ?? "unknown"}`;
}

function isEmptyLookupResult(result) {
  return result?.code === 1 && !result?.error && !result?.stdout?.trim() && !result?.stderr?.trim();
}

async function listRunningMacApplications(bundleIdentifier, runner) {
  const source = `ObjC.import("AppKit");
function run() {
  const apps = $.NSRunningApplication.runningApplicationsWithBundleIdentifier(${JSON.stringify(bundleIdentifier)}).js;
  return JSON.stringify(apps.map((app) => ({
    pid: Number(app.processIdentifier),
    appBundlePath: app.bundleURL.path.js,
  })));
}`;
  const lookup = await runner("/usr/bin/osascript", [
    "-l", "JavaScript", "-e", source,
  ], { timeoutMs: 3_000 });
  if (lookup?.code !== 0) {
    throw new MacLifecycleError(
      "PROCESS_INSPECTION_FAILED",
      `Could not find running Codex process candidates: ${processInspectionDetail(lookup)}`,
    );
  }

  let applications;
  try {
    applications = JSON.parse(lookup.stdout);
  } catch {
    throw new MacLifecycleError("PROCESS_INSPECTION_FAILED", "macOS returned an invalid Codex application list.");
  }
  return Array.isArray(applications) ? applications : [];
}

export async function findRunningMacCodexApp({
  runner = defaultProcessRunner,
  verifyBundle = (appBundlePath) => verifyMacCodexAppBundle(appBundlePath, { runner }),
} = {}) {
  const applications = await listRunningMacApplications(CODEX_BUNDLE_ID, runner);
  const bundlePaths = [...new Set(applications
    .map((application) => application?.appBundlePath)
    .filter((value) => typeof value === "string" && value.endsWith(".app")))];
  for (const appBundlePath of bundlePaths) {
    try { return await verifyBundle(appBundlePath); }
    catch {}
  }
  return null;
}

export async function listMacCodexProcesses(identity, runner = defaultProcessRunner) {
  const applications = await listRunningMacApplications(identity.bundleIdentifier, runner);
  const candidatePids = [...new Set(applications
    .filter((application) => path.resolve(application?.appBundlePath ?? "") === path.resolve(identity.appBundlePath))
    .map((application) => Number(application.pid))
    .filter((pid) => Number.isInteger(pid) && pid > 0))];
  const processes = [];
  for (const pid of candidatePids) {
    const result = await runner("/bin/ps", ["-p", String(pid), "-o", "pid=,command="], { timeoutMs: 2_000 });
    if (isEmptyLookupResult(result)) continue;
    if (result?.code !== 0) {
      throw new MacLifecycleError(
        "PROCESS_INSPECTION_FAILED",
        `Could not inspect Codex process ${pid}: ${processInspectionDetail(result)}`,
      );
    }
    processes.push(...parseMacProcessRows(result.stdout, identity.executablePath));
  }
  return processes;
}

async function requestNormalQuit(processes) {
  const source = `ObjC.import("AppKit");
function run(argv) {
  const app = $.NSRunningApplication.runningApplicationWithProcessIdentifier(Number(argv[0]));
  if (app.isNil()) return true;
  return Boolean(app.terminate);
}`;
  for (const item of processes) {
    const result = await defaultProcessRunner("/usr/bin/osascript", [
      "-l", "JavaScript", "-e", source, "--", String(item.pid),
    ], { timeoutMs: 5_000 });
    if (result.code !== 0 || result.stdout.trim() !== "true") {
      throw new MacLifecycleError("QUIT_REQUEST_FAILED", `Codex process ${item.pid} did not accept a normal quit request.`);
    }
  }
}

async function waitForCodexExit(identity) {
  const deadline = Date.now() + EXIT_WAIT_MS;
  while (Date.now() < deadline) {
    if ((await listMacCodexProcesses(identity)).length === 0) return;
    await sleep(250);
  }
  throw new MacLifecycleError(
    "QUIT_TIMEOUT",
    "Codex is still running after the normal quit request. It was not force-closed; finish or save active tasks, quit Codex, and try again.",
  );
}

export async function macPortIsFree(port, runner = defaultProcessRunner) {
  const checked = checkedPort(port);
  const result = await runner("/usr/sbin/lsof", [
    "-nP", `-iTCP:${checked}`, "-sTCP:LISTEN", "-t",
  ], { timeoutMs: 2_000 });
  if (result?.code === 0) return !result.stdout.trim();
  if (isEmptyLookupResult(result)) return true;
  throw new MacLifecycleError(
    "PORT_INSPECTION_FAILED",
    `Could not inspect loopback port ${checked}: ${processInspectionDetail(result)}`,
  );
}

async function readRememberedPort(libraryRoot) {
  const state = await readJson(path.join(libraryRoot, "runtime-state.json"));
  try { return state?.port === undefined ? null : checkedPort(state.port); }
  catch { return null; }
}

async function choosePort(libraryRoot, explicitPort, dependencies) {
  const remembered = explicitPort ?? await readRememberedPort(libraryRoot);
  const candidates = [...new Set([
    ...(remembered ? [remembered] : []),
    ...Array.from({ length: LAST_CDP_PORT - FIRST_CDP_PORT + 1 }, (_, index) => FIRST_CDP_PORT + index),
  ])];
  if (explicitPort) {
    if (await dependencies.endpointReady(explicitPort)) return { port: explicitPort, endpointReady: true };
    if (await dependencies.portIsFree(explicitPort)) return { port: explicitPort, endpointReady: false };
    throw new MacLifecycleError("PORT_OCCUPIED", `Requested CDP port ${explicitPort} is already used by another process.`);
  }
  for (const port of candidates) {
    if (await dependencies.endpointReady(port)) return { port, endpointReady: true };
  }
  for (const port of candidates) {
    if (await dependencies.portIsFree(port)) return { port, endpointReady: false };
  }
  throw new MacLifecycleError("NO_FREE_PORT", `No free loopback CDP port was found in ${FIRST_CDP_PORT}-${LAST_CDP_PORT}.`);
}

async function waitForDebugArguments(identity, pid, port) {
  const deadline = Date.now() + 6_000;
  while (Date.now() < deadline) {
    const processes = await listMacCodexProcesses(identity);
    const matching = processes.find((item) => item.pid === pid && macCommandHasCdpFlags(item.command, port)) ??
      processes.find((item) => macCommandHasCdpFlags(item.command, port));
    if (matching) return matching;
    await sleep(150);
  }
  throw new MacLifecycleError(
    "LAUNCH_ARGUMENTS_MISSING",
    `Codex started without the required loopback CDP arguments for port ${port}.`,
  );
}

async function waitForEndpoint(port) {
  const deadline = Date.now() + CDP_WAIT_MS;
  while (Date.now() < deadline) {
    if (await ownedCodexEndpointReady(port)) return await verifyCodexCdpOwner({ port });
    await sleep(150);
  }
  throw new MacLifecycleError("CDP_TIMEOUT", `Codex did not expose its verified loopback CDP endpoint on port ${port}.`);
}

export async function stopInstalledInjector(
  libraryRoot,
  runner = defaultProcessRunner,
  stopper = stopInjectorProcess,
) {
  const state = await readJson(path.join(libraryRoot, "runtime-state.json"));
  const recordedPid = Number(state?.injectorPid);
  const injectorPath = path.join(libraryRoot, "runtime", "injector.mjs");
  const lookup = await runner("/usr/bin/pgrep", ["-f", escapePosixRegex(injectorPath)], { timeoutMs: 2_000 });
  if (!isEmptyLookupResult(lookup) && lookup?.code !== 0) {
    throw new MacLifecycleError(
      "PROCESS_INSPECTION_FAILED",
      `Could not find installed theme watchers: ${processInspectionDetail(lookup)}`,
    );
  }
  const candidates = new Set(parseProcessIds(lookup?.stdout));
  if (Number.isInteger(recordedPid) && recordedPid > 0) candidates.add(recordedPid);
  candidates.delete(process.pid);

  for (const pid of candidates) {
    const command = await runner("/bin/ps", ["-p", String(pid), "-o", "command="], { timeoutMs: 2_000 });
    if (isEmptyLookupResult(command)) continue;
    if (command?.code !== 0) {
      throw new MacLifecycleError(
        "PROCESS_INSPECTION_FAILED",
        `Could not inspect theme watcher ${pid}: ${processInspectionDetail(command)}`,
      );
    }
    if (commandMatchesInstalledInjector(command.stdout, { injectorPath, libraryRoot })) {
      await stopper(pid);
    }
  }
}

function escapePosixRegex(value) {
  return String(value).replace(/[\\.^$*+?()[\]{}|]/g, "\\$&");
}

function parseProcessIds(stdout) {
  return String(stdout)
    .split(/\s+/)
    .filter((value) => /^[1-9][0-9]*$/.test(value))
    .map(Number);
}

function commandMatchesInstalledInjector(command, { injectorPath, libraryRoot }) {
  const value = String(command).trim();
  return value.includes(injectorPath) &&
    value.includes(`--library ${libraryRoot}`) &&
    /(?:^|\s)--watch(?:\s|$)/.test(value);
}

async function stopInjectorProcess(pid) {
  try { process.kill(pid, "SIGTERM"); }
  catch (error) {
    if (error?.code === "ESRCH") return;
    throw new MacLifecycleError("INJECTOR_STOP_FAILED", `Could not stop theme watcher ${pid}: ${error.message}`);
  }
  const deadline = Date.now() + INJECTOR_EXIT_WAIT_MS;
  while (Date.now() < deadline) {
    try { process.kill(pid, 0); }
    catch (error) {
      if (error?.code === "ESRCH") return;
      if (error?.code !== "EPERM") {
        throw new MacLifecycleError("INJECTOR_STOP_FAILED", `Could not inspect theme watcher ${pid}: ${error.message}`);
      }
    }
    await sleep(50);
  }
  // This PID was either just spawned by us or matched our exact injector path.
  // Force-stopping the watcher never terminates Codex itself.
  try { process.kill(pid, "SIGKILL"); }
  catch (error) {
    if (error?.code !== "ESRCH") {
      throw new MacLifecycleError("INJECTOR_STOP_FAILED", `Could not terminate theme watcher ${pid}: ${error.message}`);
    }
  }
}

async function startInjector(libraryRoot, port) {
  await stopInstalledInjector(libraryRoot);
  return spawnDetached(process.execPath, [
    path.join(libraryRoot, "runtime", "injector.mjs"),
    "--watch", "--port", String(port), "--library", libraryRoot,
  ], { libraryRoot, logPrefix: "runtime" });
}

function runtimeCommandDetail(result) {
  const detail = result?.error?.message ?? result?.stderr?.trim() ?? result?.stdout?.trim() ?? `exit code ${result?.code ?? "unknown"}`;
  return detail.length > 2_000 ? `${detail.slice(0, 2_000)}…` : detail;
}

export async function injectAndVerify(libraryRoot, port, injectorPid, {
  runner = defaultProcessRunner,
  processAlive = (pid) => {
    try { process.kill(pid, 0); return true; }
    catch { return false; }
  },
} = {}) {
  const injector = path.join(libraryRoot, "runtime", "injector.mjs");
  const applied = await runner(process.execPath, [
    injector, "--once", "--port", String(port), "--timeout-ms", "15000", "--library", libraryRoot,
  ], { timeoutMs: 25_000 });
  if (applied.code !== 0) {
    throw new MacLifecycleError("INJECTION_FAILED", `Codex opened, but applying the theme failed: ${runtimeCommandDetail(applied)}`);
  }

  let lastDetail = "renderer markers were not present";
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const result = await runner(process.execPath, [
      injector, "--verify", "--port", String(port), "--timeout-ms", "3000", "--library", libraryRoot,
    ], { timeoutMs: 8_000 });
    if (result.code === 0) return;
    lastDetail = runtimeCommandDetail(result);
    if (!processAlive(injectorPid)) {
      throw new MacLifecycleError("INJECTOR_EXITED", `The theme watcher exited before the theme could be verified: ${lastDetail}`);
    }
    await sleep(250);
  }
  throw new MacLifecycleError("INJECTION_TIMEOUT", `Codex opened, but the theme could not be verified in its renderer: ${lastDetail}`);
}

function defaultDependencies(libraryRoot) {
  return {
    validateTheme: async () => {
      const result = await defaultProcessRunner(process.execPath, [
        path.join(libraryRoot, "runtime", "injector.mjs"), "--validate", "--library", libraryRoot,
      ], { timeoutMs: 15_000 });
      if (result.code !== 0) throw new MacLifecycleError("THEME_INVALID", result.stderr.trim() || "The selected theme failed validation.");
    },
    findRunningApp: () => findRunningMacCodexApp(),
    findApp: () => findMacCodexApp(),
    endpointReady: (port) => ownedCodexEndpointReady(port),
    portIsFree: (port) => macPortIsFree(port),
    listCodexProcesses: (identity) => listMacCodexProcesses(identity),
    requestNormalQuit,
    waitForCodexExit,
    spawnCodex: (identity, port) => spawnDetached(identity.executablePath, [
      "--remote-debugging-address=127.0.0.1",
      `--remote-debugging-port=${port}`,
    ], { libraryRoot, logPrefix: "codex" }),
    waitForDebugArguments,
    waitForEndpoint,
    verifyOwner: (port) => verifyCodexCdpOwner({ port }),
    startInjector: (port) => startInjector(libraryRoot, port),
    verifyInjection: (port, pid) => injectAndVerify(libraryRoot, port, pid),
    stopInjector: stopInjectorProcess,
    withLock: (operation) => withMacLaunchLock(libraryRoot, operation),
  };
}

async function writeRuntimeState(libraryRoot, value) {
  await writeJsonAtomic(path.join(libraryRoot, "runtime-state.json"), {
    schemaVersion: 2,
    ...value,
  });
}

async function launchUnlocked(options, dependencies) {
  const { libraryRoot, restart, port: explicitPort } = options;
  let selectedPort = null;
  let codexPid = null;
  let injectorPid = null;
  let injectorNeedsCleanup = false;
  let executablePath = null;
  try {
    await dependencies.validateTheme();
    const identity = await dependencies.findRunningApp() ?? await dependencies.findApp();
    executablePath = identity.executablePath;
    const selected = await choosePort(libraryRoot, explicitPort, dependencies);
    selectedPort = selected.port;
    let owner;
    let mode;

    if (selected.endpointReady) {
      owner = await dependencies.verifyOwner(selectedPort);
      codexPid = owner.rootPid ?? owner.pid;
      mode = "attached";
    } else {
      const running = await dependencies.listCodexProcesses(identity);
      if (running.length > 0) {
        if (!restart) {
          throw new MacLifecycleError(
            "RESTART_REQUIRED",
            "Codex is already running without a CDP endpoint. Active tasks were not interrupted; save them, then launch again with --restart.",
          );
        }
        await dependencies.requestNormalQuit(running);
        await dependencies.waitForCodexExit(identity);
      }

      const launched = await dependencies.spawnCodex(identity, selectedPort);
      codexPid = launched.pid;
      await writeRuntimeState(libraryRoot, {
        phase: "launching",
        port: selectedPort,
        codexPid,
        executablePath,
        startedAt: new Date().toISOString(),
      });
      const debugProcess = await dependencies.waitForDebugArguments(identity, codexPid, selectedPort);
      codexPid = debugProcess.pid;
      owner = await dependencies.waitForEndpoint(selectedPort);
      codexPid = owner.rootPid ?? codexPid;
      mode = "launched";
    }

    const injector = await dependencies.startInjector(selectedPort);
    injectorPid = injector.pid;
    injectorNeedsCleanup = true;
    await writeRuntimeState(libraryRoot, {
      phase: "injecting",
      port: selectedPort,
      codexPid,
      executablePath,
      injectorPid,
      startedAt: new Date().toISOString(),
    });
    await dependencies.verifyInjection(selectedPort, injectorPid);
    const result = {
      phase: "active",
      mode,
      port: selectedPort,
      codexPid,
      executablePath,
      injectorPid,
      startedAt: new Date().toISOString(),
    };
    await writeRuntimeState(libraryRoot, result);
    injectorNeedsCleanup = false;
    await appendDiagnostic(libraryRoot, "active", { mode, port: selectedPort, codexPid, injectorPid }).catch(() => {});
    return result;
  } catch (error) {
    const code = error?.code ?? "LAUNCH_FAILED";
    if (injectorNeedsCleanup && injectorPid) {
      try {
        await dependencies.stopInjector(injectorPid);
        injectorPid = null;
      } catch (cleanupError) {
        await appendDiagnostic(libraryRoot, "injector-cleanup-failed", {
          injectorPid,
          message: cleanupError.message,
        }).catch(() => {});
      }
    }
    await appendDiagnostic(libraryRoot, "failed", { code, message: error.message, port: selectedPort }).catch(() => {});
    if (selectedPort) {
      await writeRuntimeState(libraryRoot, {
        phase: "failed",
        port: selectedPort,
        codexPid,
        executablePath,
        injectorPid,
        failedAt: new Date().toISOString(),
        lastError: { code, message: error.message },
      }).catch(() => {});
    }
    throw error;
  }
}

export async function launchMacThemeRuntime({
  libraryRoot = defaultLibraryRoot(),
  port = null,
  restart = false,
} = {}, overrides = {}) {
  if (process.platform !== "darwin" && !overrides.allowNonMacForTests) {
    throw new MacLifecycleError("UNSUPPORTED_PLATFORM", `The macOS lifecycle controller cannot run on ${process.platform}.`);
  }
  const options = { libraryRoot: path.resolve(libraryRoot), port: port === null ? null : checkedPort(port), restart };
  const dependencies = { ...defaultDependencies(options.libraryRoot), ...overrides };
  return dependencies.withLock(() => launchUnlocked(options, dependencies));
}

function printHelp() {
  console.log(`GetCodexTheme macOS lifecycle controller

Usage: node runtime/macos-lifecycle.mjs [--library PATH] [--port PORT] [--restart]

Starts the verified official Codex executable with a loopback-only CDP port,
then starts and verifies the theme watcher. A running non-CDP Codex session is
never closed unless --restart is explicitly provided.`);
}

if (isMainModule(import.meta.url)) {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) printHelp();
    else {
      const result = await launchMacThemeRuntime(options);
      console.log(`GetCodexTheme is active (${result.mode}) on loopback port ${result.port}. Runtime PID: ${result.injectorPid}`);
      console.log("The effect is unofficial CDP injection and does not modify the signed Codex application.");
    }
  } catch (error) {
    console.error(`[get-codex-theme] ${error.code ?? "LAUNCH_FAILED"}: ${error.message}`);
    process.exitCode = error.code === "RESTART_REQUIRED" ? 20 : 1;
  }
}
