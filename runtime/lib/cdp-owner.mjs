import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";

const MAX_PROCESS_OUTPUT = 64 * 1024;
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]", "::1"]);
const CODEX_BUNDLE_ID = "com.openai.codex";
const CODEX_TEAM_ID = "2DC432GLL2";
const macIdentityCache = new Map();
const macPath = path.posix;

function assertPort(value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error(`CDP port must be an integer between 1024 and 65535: ${value}`);
  }
  return port;
}

export function assertSupportedLivePlatform(platform = process.platform) {
  if (!["darwin", "win32"].includes(platform)) {
    throw new Error(`Live CDP runtime is supported only on macOS and Windows; found ${platform}.`);
  }
  return platform;
}

export function isMainCodexTarget(target) {
  if (target?.type !== "page" || typeof target.url !== "string") return false;
  try {
    const url = new URL(target.url);
    return url.protocol === "app:" && url.hostname === "-" && url.pathname === "/index.html" &&
      !url.searchParams.has("initialRoute");
  } catch {
    return false;
  }
}

export function assertLoopbackWebSocket(value, expectedPort) {
  const endpoint = new URL(value);
  if (!["ws:", "wss:"].includes(endpoint.protocol) || !LOOPBACK_HOSTS.has(endpoint.hostname)) {
    throw new Error("Refusing a non-loopback DevTools WebSocket endpoint.");
  }
  if (expectedPort !== undefined && Number(endpoint.port) !== assertPort(expectedPort)) {
    throw new Error(`Refusing a DevTools WebSocket outside the verified CDP port ${expectedPort}.`);
  }
  return endpoint;
}

export function defaultProcessRunner(command, args, { timeoutMs = 1_500 } = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    const stdout = [];
    const stderr = [];
    let bytes = 0;
    let settled = false;
    let timer;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        ...result,
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
      });
    };
    const collect = (target) => (chunk) => {
      bytes += chunk.byteLength;
      if (bytes > MAX_PROCESS_OUTPUT) {
        child.kill();
        finish({ code: 1, error: new Error("Ownership command exceeded its output limit.") });
      } else {
        target.push(chunk);
      }
    };
    child.stdout.on("data", collect(stdout));
    child.stderr.on("data", collect(stderr));
    child.once("error", (error) => finish({ code: 1, error }));
    child.once("close", (code, signal) => finish({ code: code ?? 1, signal }));
    timer = setTimeout(() => {
      child.kill();
      finish({ code: 1, error: new Error("Ownership command timed out.") });
    }, timeoutMs);
    timer.unref?.();
  });
}

async function runChecked(runner, command, args, label, timeoutMs = 1_500) {
  const result = await runner(command, args, { timeoutMs });
  if (!result || result.code !== 0) {
    const detail = result?.error?.message ?? result?.stderr?.trim() ?? `exit code ${result?.code ?? "unknown"}`;
    throw new Error(`${label} failed: ${detail}`);
  }
  return result;
}

async function runOrThrow(runner, command, args, label, timeoutMs) {
  const result = await runChecked(runner, command, args, label, timeoutMs);
  return result.stdout?.trim() ?? "";
}

async function verifyMacBundleIdentity(appBundlePath, executablePath, runner) {
  const cached = runner === defaultProcessRunner ? macIdentityCache.get(appBundlePath) : null;
  if (cached && (!executablePath || cached.executablePath === executablePath) && cached.expiresAt > Date.now()) return cached.identity;

  const infoPlist = macPath.join(appBundlePath, "Contents", "Info.plist");
  const bundleIdentifier = await runOrThrow(runner, "/usr/bin/plutil", [
    "-extract", "CFBundleIdentifier", "raw", "-o", "-", infoPlist,
  ], "Could not read the listener bundle identifier");
  const executableName = await runOrThrow(runner, "/usr/bin/plutil", [
    "-extract", "CFBundleExecutable", "raw", "-o", "-", infoPlist,
  ], "Could not read the listener bundle executable");
  if (bundleIdentifier !== CODEX_BUNDLE_ID || !executableName || executableName.includes("/")) {
    throw new Error(`Refusing listener bundle: expected ${CODEX_BUNDLE_ID}.`);
  }
  const expectedExecutable = macPath.join(appBundlePath, "Contents", "MacOS", executableName);
  if (executablePath && macPath.resolve(executablePath) !== macPath.resolve(expectedExecutable)) {
    throw new Error("Refusing listener bundle: process is not its declared main executable.");
  }

  await runChecked(runner, "/usr/bin/codesign", ["--verify", "--strict", appBundlePath], "Codex app signature verification", 5_000);
  const signature = await runChecked(runner, "/usr/bin/codesign", ["-dv", "--verbose=4", appBundlePath], "Could not inspect the Codex app signature", 3_000);
  const signatureText = `${signature.stdout ?? ""}\n${signature.stderr ?? ""}`;
  if (!new RegExp(`^Identifier=${CODEX_BUNDLE_ID.replaceAll(".", "\\.")}$`, "m").test(signatureText) ||
      !new RegExp(`^TeamIdentifier=${CODEX_TEAM_ID}$`, "m").test(signatureText)) {
    throw new Error("Refusing listener bundle: code-signing identity is not the official Codex application.");
  }
  const identity = { appBundlePath, bundleIdentifier, teamIdentifier: CODEX_TEAM_ID, executablePath: expectedExecutable };
  if (runner === defaultProcessRunner) {
    macIdentityCache.set(appBundlePath, { executablePath, expiresAt: Date.now() + 30_000, identity });
  }
  return identity;
}

export async function verifyMacCodexAppBundle(appBundlePath, { runner = defaultProcessRunner } = {}) {
  const resolvedBundle = macPath.resolve(appBundlePath);
  if (!resolvedBundle.endsWith(".app")) throw new Error("Codex application path must end in .app.");
  return verifyMacBundleIdentity(resolvedBundle, null, runner);
}

export async function findMacCodexApp({ runner = defaultProcessRunner } = {}) {
  let spotlight = "";
  try {
    spotlight = await runOrThrow(runner, "/usr/bin/mdfind", [
      "kMDItemCFBundleIdentifier == 'com.openai.codex'",
    ], "Could not resolve the Codex application by bundle identifier", 3_000);
  } catch {
    // Standard locations below remain usable when Spotlight is disabled.
  }
  const standard = [
    "/Applications/ChatGPT.app",
    "/Applications/Codex.app",
    macPath.join(os.homedir(), "Applications", "ChatGPT.app"),
    macPath.join(os.homedir(), "Applications", "Codex.app"),
  ];
  const candidates = [...new Set([
    ...standard,
    ...spotlight.split(/\r?\n/).map((value) => value.trim()).filter((value) => value.endsWith(".app")),
  ])]
    .sort((left, right) => Number(!left.startsWith("/Applications/")) - Number(!right.startsWith("/Applications/")) || left.localeCompare(right));
  if (candidates.length === 0) throw new Error(`No macOS application with bundle identifier ${CODEX_BUNDLE_ID} was found.`);
  let lastError;
  for (const candidate of candidates) {
    try {
      return await verifyMacCodexAppBundle(candidate, { runner });
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`No verified ${CODEX_BUNDLE_ID} application was found: ${lastError?.message ?? "identity check failed"}`);
}

async function verifyMacListenerProcess(listenerPid, port, runner) {
  const visited = new Set();
  let currentPid = listenerPid;
  let listenerExecutablePath = "";
  let lastBundleError = null;
  for (let depth = 0; depth < 32 && currentPid > 1 && !visited.has(currentPid); depth += 1) {
    visited.add(currentPid);
    const processRow = await runOrThrow(runner, "/bin/ps", [
      "-p", String(currentPid), "-o", "pid=,ppid=,comm=",
    ], "Could not inspect the CDP listener process tree");
    const match = /^\s*([1-9][0-9]*)\s+([0-9]+)\s+(.+?)\s*$/.exec(processRow);
    if (!match || Number(match[1]) !== currentPid) {
      throw new Error(`Refusing CDP port ${port}: listener process identity changed during verification.`);
    }
    const parentPid = Number(match[2]);
    const executablePath = match[3];
    if (!listenerExecutablePath) listenerExecutablePath = executablePath;
    const appMatch = /^(.+\.app)\/Contents\/MacOS\/[^/]+$/.exec(executablePath);
    if (appMatch) {
      try {
        const identity = await verifyMacBundleIdentity(macPath.resolve(appMatch[1]), macPath.resolve(executablePath), runner);
        return {
          mainPid: currentPid,
          owner: {
            verified: true,
            platform: "darwin",
            port,
            pid: listenerPid,
            ...(currentPid === listenerPid ? {} : { rootPid: currentPid, listenerExecutablePath }),
            ...identity,
          },
        };
      } catch (error) {
        lastBundleError = error;
        // A signed Codex renderer/helper may itself live in a nested .app.
        // Continue through its parent chain until the official main bundle is found.
      }
    }
    if (!Number.isInteger(parentPid) || parentPid <= 1 || parentPid === currentPid) break;
    currentPid = parentPid;
  }
  const detail = lastBundleError?.message ? ` ${lastBundleError.message}` : "";
  throw new Error(`Refusing CDP port ${port}: listener is not the official Codex process or one of its descendants.${detail}`);
}

export function parseMacListenerRecords(stdout) {
  const records = [];
  let pid = null;
  for (const line of String(stdout).split(/\r?\n/)) {
    const processMatch = /^p([1-9][0-9]*)$/.exec(line);
    if (processMatch) {
      pid = Number(processMatch[1]);
      continue;
    }
    if (pid && line.startsWith("n")) records.push({ pid, name: line.slice(1) });
  }
  return [...new Map(records.map((record) => [`${record.pid}:${record.name}`, record])).values()];
}

async function verifyMacOwner(port, runner) {
  const listener = await runOrThrow(runner, "/usr/sbin/lsof", [
    "-nP", "-a", `-iTCP@127.0.0.1:${port}`, "-sTCP:LISTEN", "-Fpfn",
  ], "Could not identify the CDP listener");
  const records = parseMacListenerRecords(listener);
  if (records.length === 0) throw new Error(`No loopback CDP listener was found on port ${port}.`);
  if (records.length > 16) throw new Error(`Refusing CDP port ${port}: too many listener records (${records.length}).`);
  if (records.some(({ name }) => name !== `127.0.0.1:${port}`)) {
    throw new Error(`Refusing CDP port ${port}: listener is not bound exactly to 127.0.0.1.`);
  }
  const pids = [...new Set(records.map(({ pid }) => pid))];
  const verified = [];
  for (const pid of pids) verified.push(await verifyMacListenerProcess(pid, port, runner));
  const expected = verified[0];
  const sameOfficialTree = verified.every(({ mainPid, owner }) => (
    mainPid === expected.mainPid &&
    owner.appBundlePath === expected.owner.appBundlePath &&
    owner.executablePath === expected.owner.executablePath &&
    owner.bundleIdentifier === expected.owner.bundleIdentifier &&
    owner.teamIdentifier === expected.owner.teamIdentifier
  ));
  if (!sameOfficialTree) {
    throw new Error(`Refusing CDP port ${port}: listeners do not belong to the same verified Codex process tree.`);
  }
  if (pids.length === 1) return expected.owner;
  return {
    ...expected.owner,
    rootPid: expected.mainPid,
    listenerPids: pids,
  };
}

const WINDOWS_OWNER_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
$port = __GCT_VERIFIED_PORT__
$listeners = @(Get-NetTCPConnection -LocalPort $port -State Listen | Where-Object { $_.LocalAddress -eq '127.0.0.1' })
if ($listeners.Count -ne 1) { throw "Expected exactly one loopback listener; found $($listeners.Count)." }
$process = Get-CimInstance Win32_Process -Filter "ProcessId = $([int]$listeners[0].OwningProcess)"
if (-not $process) { throw 'Listener process was not found.' }
$executable = [string]$process.ExecutablePath
$package = Get-AppxPackage OpenAI.Codex | Where-Object {
  $root = [string]$_.InstallLocation
  $root -and $executable.StartsWith(($root.TrimEnd('\\') + '\\'), [StringComparison]::OrdinalIgnoreCase)
} | Select-Object -First 1
if (-not $package) { throw 'Listener does not belong to the installed OpenAI.Codex Appx package.' }
[pscustomobject]@{
  pid = [int]$process.ProcessId
  executablePath = $executable
  packageRoot = [string]$package.InstallLocation
} | ConvertTo-Json -Compress
`;

async function verifyWindowsOwner(port, runner) {
  const script = WINDOWS_OWNER_SCRIPT.replace("__GCT_VERIFIED_PORT__", String(port));
  const raw = await runOrThrow(runner, "powershell.exe", [
    "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script,
  ], "Could not identify the CDP listener");
  let owner;
  try {
    owner = JSON.parse(raw.replace(/^\uFEFF/, ""));
  } catch {
    throw new Error("Windows CDP ownership probe returned malformed JSON.");
  }
  const executablePath = typeof owner?.executablePath === "string" ? path.win32.resolve(owner.executablePath) : "";
  const packageRoot = typeof owner?.packageRoot === "string" ? path.win32.resolve(owner.packageRoot) : "";
  const relative = packageRoot && executablePath ? path.win32.relative(packageRoot, executablePath) : "";
  const packageName = path.win32.basename(packageRoot);
  if (!packageRoot || !executablePath || !relative || relative.startsWith("..") || path.win32.isAbsolute(relative) ||
      path.win32.basename(executablePath).toLowerCase() !== "chatgpt.exe" || !/^OpenAI\.Codex_/i.test(packageName)) {
    throw new Error(`Refusing CDP port ${port}: listener is not ChatGPT.exe inside the OpenAI.Codex Appx package.`);
  }
  const pid = Number(owner.pid);
  if (!Number.isInteger(pid) || pid <= 0) throw new Error("Windows CDP ownership probe returned an invalid process id.");
  return { verified: true, platform: "win32", port, pid, executablePath, packageRoot };
}

export async function verifyCodexCdpOwner({ port, platform = process.platform, runner = defaultProcessRunner } = {}) {
  const checkedPort = assertPort(port);
  assertSupportedLivePlatform(platform);
  return platform === "darwin" ? verifyMacOwner(checkedPort, runner) : verifyWindowsOwner(checkedPort, runner);
}

export async function listOwnedCodexTargets(port, {
  platform = process.platform,
  runner = defaultProcessRunner,
  fetchImpl = globalThis.fetch,
  timeoutMs = 1_500,
} = {}) {
  await verifyCodexCdpOwner({ port, platform, runner });
  if (typeof fetchImpl !== "function") throw new Error("This Node.js version does not provide fetch().");
  const response = await fetchImpl(`http://127.0.0.1:${assertPort(port)}/json/list`, {
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`CDP target list returned HTTP ${response.status}`);
  const targets = await response.json();
  return Array.isArray(targets) ? targets.filter(isMainCodexTarget) : [];
}

export async function ownedCodexEndpointReady(port, options = {}) {
  try {
    return (await listOwnedCodexTargets(port, options)).length > 0;
  } catch {
    return false;
  }
}
