#!/usr/bin/env node
import { execFile, spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { defaultLibraryRoot } from "./lib/theme-loader.mjs";
import { assertSupportedLivePlatform, findMacCodexApp, ownedCodexEndpointReady } from "./lib/cdp-owner.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const exec = promisify(execFile);

function parseArguments(argv) {
  const options = { libraryRoot: defaultLibraryRoot(), port: 9341, maxRestarts: 3, restartWindowMs: 60_000, allowCodexRestart: false, launchScript: null };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--library") options.libraryRoot = path.resolve(argv[++index]);
    else if (argument === "--port") options.port = Number(argv[++index]);
    else if (argument === "--max-restarts") options.maxRestarts = Number(argv[++index]);
    else if (argument === "--restart-window-ms") options.restartWindowMs = Number(argv[++index]);
    else if (argument === "--launch-script") options.launchScript = path.resolve(argv[++index]);
    else if (argument === "--allow-codex-restart") options.allowCodexRestart = true;
    else if (["--help", "-h"].includes(argument)) options.help = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  if (!Number.isInteger(options.port) || options.port < 1024 || options.port > 65535) throw new Error("Invalid watchdog port.");
  if (!Number.isInteger(options.maxRestarts) || options.maxRestarts < 0 || options.maxRestarts > 20) throw new Error("Invalid max restart count.");
  if (!Number.isFinite(options.restartWindowMs) || options.restartWindowMs < 5_000) throw new Error("Invalid restart window.");
  if (options.allowCodexRestart && (!options.launchScript || process.platform !== "darwin")) {
    throw new Error("Persistent Codex restart requires a macOS launch script.");
  }
  return options;
}

async function codexIsRunning(executablePath) {
  if (process.platform !== "darwin" || !executablePath) return false;
  try {
    const { stdout } = await exec("/bin/ps", ["-axo", "comm="], { maxBuffer: 4 * 1024 * 1024 });
    return stdout.split("\n").some((command) => command.trim() === executablePath);
  } catch {
    return false;
  }
}

function runProcess(command, args, { stdio = "inherit" } = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio, env: process.env });
    child.once("error", (error) => resolve({ code: 1, error }));
    child.once("exit", (code, signal) => resolve({ code: code ?? 1, signal }));
  });
}

async function injectorIsHealthy(options) {
  const result = await runProcess(process.execPath, [path.join(here, "injector.mjs"), "--verify", "--port", String(options.port), "--timeout-ms", "1000"], { stdio: "ignore" });
  return result.code === 0;
}

function runChild(options) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(here, "injector.mjs"), "--watch", "--library", options.libraryRoot, "--port", String(options.port)], {
      stdio: "inherit",
      env: process.env,
    });
    const forward = (signal) => child.kill(signal);
    process.once("SIGINT", forward);
    process.once("SIGTERM", forward);
    child.once("exit", (code, signal) => {
      process.removeListener("SIGINT", forward);
      process.removeListener("SIGTERM", forward);
      resolve({ code, signal });
    });
  });
}

try {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    console.log(`GetCodexTheme optional watchdog

Usage: node runtime/watchdog.mjs [--library PATH] [--port PORT]
       [--max-restarts 3] [--restart-window-ms 60000]
       [--launch-script PATH --allow-codex-restart]

The watchdog waits for an already debug-enabled Codex session, then supervises
the companion injector. Persistent restart is disabled unless the user
explicitly enables it with a launch script. Install the opt-in LaunchAgent
separately to enable either mode.`);
  } else {
    assertSupportedLivePlatform();
    const codexIdentity = process.platform === "darwin" ? await findMacCodexApp() : null;
    const failures = [];
    const launchFailures = [];
    let stopping = false;
    let persistentArmed = options.allowCodexRestart ? !(await codexIsRunning(codexIdentity?.executablePath)) : false;
    process.on("SIGINT", () => { stopping = true; });
    process.on("SIGTERM", () => { stopping = true; });
    while (!stopping) {
      if (!(await ownedCodexEndpointReady(options.port))) {
        const codexRunning = await codexIsRunning(codexIdentity?.executablePath);
        if (options.allowCodexRestart) {
          if (!persistentArmed && !codexRunning) persistentArmed = true;
          else if (persistentArmed && codexRunning) {
            const launched = await runProcess(options.launchScript, ["--library", options.libraryRoot, "--port", String(options.port), "--restart"]);
            if (launched.code !== 0) {
              launchFailures.push(Date.now());
              while (launchFailures[0] < Date.now() - options.restartWindowMs) launchFailures.shift();
              if (launchFailures.length > options.maxRestarts) throw new Error("Persistent Codex recovery exceeded its restart limit.");
            } else {
              launchFailures.length = 0;
            }
          }
        }
        await sleep(2_000);
        continue;
      }
      if (await injectorIsHealthy(options)) {
        await sleep(2_000);
        continue;
      }
      const startedAt = Date.now();
      const result = await runChild(options);
      if (stopping || result.signal === "SIGINT" || result.signal === "SIGTERM") break;
      if (!(await ownedCodexEndpointReady(options.port))) {
        failures.length = 0;
        continue;
      }
      if (Date.now() - startedAt >= options.restartWindowMs) failures.length = 0;
      failures.push(Date.now());
      while (failures[0] < Date.now() - options.restartWindowMs) failures.shift();
      if (failures.length > options.maxRestarts) {
        throw new Error(`Injector stopped ${failures.length} times within ${options.restartWindowMs}ms; automatic recovery disabled.`);
      }
      const backoff = Math.min(5_000, 400 * (2 ** Math.max(0, failures.length - 1)));
      console.error(`[get-codex-theme] injector stopped (${result.code ?? result.signal}); retrying in ${backoff}ms`);
      await sleep(backoff);
    }
  }
} catch (error) {
  console.error(`[get-codex-theme] watchdog stopped: ${error.message}`);
  process.exitCode = 1;
}
