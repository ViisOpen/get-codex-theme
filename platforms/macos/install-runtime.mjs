#!/usr/bin/env node

import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stopInstalledInjector, withMacLaunchLock } from "../../runtime/macos-lifecycle.mjs";
import { isMainModule } from "../../runtime/lib/main-module.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const ALIASES = ["runtime", "bin", "menu-bar"];
const BIN_FILES = [
  ["start.sh", "start-macos.sh"],
  ["restore.sh", "restore-macos.sh"],
  ["watchdog-enable.sh", "enable-watchdog-macos.sh"],
  ["watchdog-disable.sh", "disable-watchdog-macos.sh"],
];
const SHARED_BIN_FILES = [
  ["platforms/windows/start.ps1", "start-windows.ps1"],
  ["platforms/windows/restore.ps1", "restore-windows.ps1"],
  ["platforms/windows/tray.ps1", "tray-windows.ps1"],
  ["platforms/windows/tray-start.ps1", "start-tray-windows.ps1"],
  ["platforms/windows/tray-stop.ps1", "stop-tray-windows.ps1"],
];
const EXECUTABLES = [
  "runtime/injector.mjs",
  "runtime/macos-lifecycle.mjs",
  "runtime/theme-control.mjs",
  "runtime/watchdog.mjs",
  "runtime/write-watchdog-plist.mjs",
  "bin/start-macos.sh",
  "bin/restore-macos.sh",
  "bin/enable-watchdog-macos.sh",
  "bin/disable-watchdog-macos.sh",
  "menu-bar/build.sh",
];

function parseArguments(argv) {
  const options = {
    sourceRoot: path.resolve(here, "../.."),
    libraryRoot: path.join(process.env.HOME ?? "", ".codex", "get-codex-theme"),
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--source-root") options.sourceRoot = path.resolve(argv[++index] ?? "");
    else if (argument === "--library") options.libraryRoot = path.resolve(argv[++index] ?? "");
    else if (["--help", "-h"].includes(argument)) options.help = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

async function pathStatus(filePath) {
  try { return await fs.lstat(filePath); }
  catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function runChecked(command, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"], shell: false });
    const stderr = [];
    let bytes = 0;
    child.stderr.on("data", (chunk) => {
      bytes += chunk.byteLength;
      if (bytes <= 64 * 1024) stderr.push(chunk);
    });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} failed: ${Buffer.concat(stderr).toString("utf8").trim() || `exit ${code}`}`));
    });
  });
}

async function validateRelease(releaseRoot) {
  for (const relative of EXECUTABLES.filter((value) => value.endsWith(".mjs"))) {
    await runChecked(process.execPath, ["--check", path.join(releaseRoot, relative)]);
  }
  for (const relative of EXECUTABLES.filter((value) => value.endsWith(".sh"))) {
    await runChecked("/bin/zsh", ["-n", path.join(releaseRoot, relative)]);
  }
}

async function replaceSymlink(linkPath, target) {
  const temporary = `${linkPath}.next-${process.pid}-${Date.now()}`;
  await fs.symlink(target, temporary);
  try { await fs.rename(temporary, linkPath); }
  catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}

async function readSymlink(linkPath) {
  try { return await fs.readlink(linkPath); }
  catch { return null; }
}

async function buildStagedRelease(sourceRoot, stageRoot) {
  await fs.mkdir(path.join(stageRoot, "bin"), { recursive: true, mode: 0o700 });
  await Promise.all([
    fs.cp(path.join(sourceRoot, "runtime"), path.join(stageRoot, "runtime"), { recursive: true }),
    fs.cp(path.join(sourceRoot, "platforms", "macos", "menu-bar"), path.join(stageRoot, "menu-bar"), { recursive: true }),
    ...BIN_FILES.map(([source, destination]) => fs.copyFile(
      path.join(sourceRoot, "platforms", "macos", source),
      path.join(stageRoot, "bin", destination),
    )),
    ...SHARED_BIN_FILES.map(([source, destination]) => fs.copyFile(
      path.join(sourceRoot, source),
      path.join(stageRoot, "bin", destination),
    )),
  ]);
  await Promise.all(EXECUTABLES.map((relative) => fs.chmod(path.join(stageRoot, relative), 0o755)));
}

export async function pruneRuntimeReleases(releasesRoot, { keep = [] } = {}) {
  const root = path.resolve(releasesRoot);
  const keepNames = new Set(keep.filter(Boolean).map((value) => path.basename(value)));
  const removed = [];
  let entries;
  try { entries = await fs.readdir(root, { withFileTypes: true }); }
  catch (error) {
    if (error?.code === "ENOENT") return removed;
    throw error;
  }
  for (const entry of entries) {
    const removable = entry.name.startsWith(".staging-") || (entry.name.startsWith("runtime-") && !keepNames.has(entry.name));
    if (!removable || (!entry.isDirectory() && !entry.isSymbolicLink())) continue;
    await fs.rm(path.join(root, entry.name), { recursive: entry.isDirectory(), force: true });
    removed.push(entry.name);
  }
  return removed.sort();
}

function releaseNameFromTarget(target, currentLink, releasesRoot) {
  if (!target) return null;
  const resolved = path.resolve(path.dirname(currentLink), target);
  return path.dirname(resolved) === path.resolve(releasesRoot) ? path.basename(resolved) : null;
}

export async function installMacRuntime({ sourceRoot, libraryRoot }, {
  lock = (operation) => withMacLaunchLock(libraryRoot, operation),
  stopInjector = () => stopInstalledInjector(libraryRoot),
  validate = validateRelease,
  releaseId = `runtime-${Date.now()}-${process.pid}-${randomUUID().slice(0, 8)}`,
} = {}) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(releaseId)) {
    throw new Error(`Invalid runtime release id: ${releaseId}`);
  }
  const resolvedSource = path.resolve(sourceRoot);
  const resolvedLibrary = path.resolve(libraryRoot);
  const releasesRoot = path.join(resolvedLibrary, "runtime-releases");
  const stageRoot = path.join(releasesRoot, `.staging-${releaseId}`);
  const releaseRoot = path.join(releasesRoot, releaseId);
  const backupRoot = path.join(resolvedLibrary, "backups", `runtime-migration-${releaseId}`);
  const currentLink = path.join(resolvedLibrary, "current-runtime");
  const previousLink = path.join(resolvedLibrary, "previous-runtime");

  let installed = false;
  let releaseCreated = false;
  let previousReleaseId = null;
  try {
    await fs.mkdir(releasesRoot, { recursive: true, mode: 0o700 });
    if (await pathStatus(releaseRoot)) {
      throw new Error(`Runtime release already exists: ${releaseRoot}`);
    }
    await fs.rm(stageRoot, { recursive: true, force: true });
    await buildStagedRelease(resolvedSource, stageRoot);
    await validate(stageRoot);

    await lock(async () => {
      await stopInjector();
      await fs.rename(stageRoot, releaseRoot);
      releaseCreated = true;
      const oldCurrentTarget = await readSymlink(currentLink);
      previousReleaseId = releaseNameFromTarget(oldCurrentTarget, currentLink, releasesRoot);
      const moved = [];
      const createdAliases = [];
      let movedCurrent = null;
      try {
        const currentStatus = await pathStatus(currentLink);
        if (currentStatus && !currentStatus.isSymbolicLink()) {
          await fs.mkdir(backupRoot, { recursive: true, mode: 0o700 });
          movedCurrent = path.join(backupRoot, "current-runtime");
          await fs.rename(currentLink, movedCurrent);
        }
        await replaceSymlink(currentLink, path.relative(resolvedLibrary, releaseRoot));

        for (const name of ALIASES) {
          const destination = path.join(resolvedLibrary, name);
          const expected = `current-runtime/${name}`;
          const status = await pathStatus(destination);
          if (status?.isSymbolicLink() && await readSymlink(destination) === expected) continue;
          if (status) {
            await fs.mkdir(backupRoot, { recursive: true, mode: 0o700 });
            const backup = path.join(backupRoot, name);
            await fs.rename(destination, backup);
            moved.push({ destination, backup });
          }
          await replaceSymlink(destination, expected);
          createdAliases.push(destination);
        }

        if (oldCurrentTarget) await replaceSymlink(previousLink, oldCurrentTarget);
        installed = true;
      } catch (error) {
        for (const destination of createdAliases.reverse()) await fs.rm(destination, { force: true }).catch(() => {});
        for (const { destination, backup } of moved.reverse()) await fs.rename(backup, destination).catch(() => {});
        if (oldCurrentTarget) await replaceSymlink(currentLink, oldCurrentTarget).catch(() => {});
        else await fs.rm(currentLink, { force: true }).catch(() => {});
        if (movedCurrent) await fs.rename(movedCurrent, currentLink).catch(() => {});
        throw error;
      }
    });
    await pruneRuntimeReleases(releasesRoot, { keep: [releaseId, previousReleaseId] }).catch(() => {});
  } finally {
    await fs.rm(stageRoot, { recursive: true, force: true }).catch(() => {});
    if (releaseCreated && !installed) await fs.rm(releaseRoot, { recursive: true, force: true }).catch(() => {});
  }

  return { releaseId, releaseRoot, previousReleaseId, backupRoot, currentLink };
}

function printHelp() {
  console.log(`GetCodexTheme transactional macOS runtime installer

Usage: node platforms/macos/install-runtime.mjs --source-root PATH --library PATH

Stages and validates a complete runtime release, stops only the previous theme
watcher, then atomically switches a shared current-runtime link. Codex itself is
never closed or restarted by installation.`);
}

if (isMainModule(import.meta.url)) {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) printHelp();
    else {
      const result = await installMacRuntime(options);
      console.log(`GetCodexTheme runtime ${result.releaseId} installed at ${result.releaseRoot}`);
    }
  } catch (error) {
    console.error(`[get-codex-theme] RUNTIME_INSTALL_FAILED: ${error.message}`);
    process.exitCode = 1;
  }
}
