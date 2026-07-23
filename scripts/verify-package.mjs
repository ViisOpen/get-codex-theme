#!/usr/bin/env node

import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const exec = promisify(execFile);
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = path.join(repositoryRoot, "packages", "theme-cli");
const sourcePackage = JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8"));
const temporary = await mkdtemp(path.join(os.tmpdir(), "get-codex-theme-package-"));
let tarballPath;

try {
  const packed = await exec("npm", ["pack", "--json", "--pack-destination", temporary], {
    cwd: packageRoot,
    maxBuffer: 8 * 1024 * 1024,
  });
  const report = JSON.parse(packed.stdout.trim());
  const artifact = Array.isArray(report) ? report[0] : Object.values(report)[0];
  if (!artifact || typeof artifact.filename !== "string" || !Array.isArray(artifact.files)) {
    throw new Error("npm pack returned an unsupported JSON report.");
  }
  tarballPath = path.join(temporary, artifact.filename);
  const files = new Set(artifact.files.map((entry) => entry.path));
  for (const required of [
    "LICENSE",
    "NOTICE.md",
    "NOTICE-RUNTIME.md",
    "THIRD_PARTY_NOTICES.md",
    "bin/get-codex-theme.mjs",
    "resources/runtime/injector.mjs",
    "resources/platforms/macos/start.sh",
    "resources/platforms/windows/start.ps1",
  ]) {
    if (!files.has(required)) throw new Error(`npm tarball is missing ${required}`);
  }
  for (const file of files) {
    if (/(^|\/)(\.env|runtime-state\.json|active-theme\.json)(\.|$)/.test(file)) {
      throw new Error(`npm tarball contains local or secret state: ${file}`);
    }
  }

  await exec("npm", ["init", "--yes"], { cwd: temporary });
  await exec("git", ["init", "--quiet"], { cwd: temporary });
  const ambientRoot = path.join(temporary, "themes", "free", "ambient");
  await mkdir(ambientRoot, { recursive: true });
  await writeFile(path.join(ambientRoot, "manifest.json"), `${JSON.stringify({
    schemaVersion: 1,
    id: "ambient",
    name: "Consumer Ambient",
    description: "A consumer-owned theme that must not leak into the installed CLI list.",
    version: "1.0.0",
    mode: "dark",
    platforms: ["macos"],
    delivery: ["visual-cdp"],
    palette: {},
    layout: {},
    assets: {},
    license: "Consumer fixture only",
    unofficial: true,
  }, null, 2)}\n`);
  await exec("npm", ["install", "--ignore-scripts", tarballPath], {
    cwd: temporary,
    maxBuffer: 8 * 1024 * 1024,
  });
  const bin = path.join(temporary, "node_modules", ".bin", process.platform === "win32" ? "get-codex-theme.cmd" : "get-codex-theme");
  const help = await exec(bin, ["--help"], { cwd: temporary });
  if (!help.stdout.includes("create-from-image") || !help.stdout.includes("doctor")) {
    throw new Error("installed npm CLI does not expose the release commands");
  }
  const consumerLibrary = path.join(temporary, "consumer-library");
  const listed = await exec(bin, ["list", "--json", "--library", consumerLibrary], {
    cwd: temporary,
    env: { ...process.env, CODEX_THEME_HOME: consumerLibrary },
  });
  const listedThemes = JSON.parse(listed.stdout);
  if (!Array.isArray(listedThemes) || listedThemes.some((theme) => theme?.id === "ambient") || listed.stdout.includes("Consumer Ambient")) {
    throw new Error("installed npm CLI leaked themes/free from the consumer repository");
  }
  if (listedThemes.length !== 0) {
    throw new Error(`installed npm CLI unexpectedly discovered ${listedThemes.length} consumer theme(s)`);
  }
  const themeArchive = path.join(temporary, "aurora-glass-theme-only.zip");
  const canonicalTheme = path.join(repositoryRoot, "themes", "free", "aurora-glass");
  await exec(bin, ["pack", canonicalTheme, "--output", themeArchive], { cwd: temporary, maxBuffer: 8 * 1024 * 1024 });
  await exec(bin, ["use", themeArchive, "--library", consumerLibrary], {
    cwd: temporary,
    env: { ...process.env, CODEX_THEME_HOME: consumerLibrary },
    maxBuffer: 8 * 1024 * 1024,
  });
  const installedStatus = await exec(bin, ["status", "--json", "--library", consumerLibrary], {
    cwd: temporary,
    env: { ...process.env, CODEX_THEME_HOME: consumerLibrary },
  });
  const parsedStatus = JSON.parse(installedStatus.stdout);
  if (parsedStatus.activeTheme?.id !== "aurora-glass" || parsedStatus.activeTheme?.version !== "1.0.0") {
    throw new Error("installed npm CLI could not apply a theme-only Registry-style archive with its bundled runtime");
  }
  const installedPackage = JSON.parse(await readFile(path.join(temporary, "node_modules", "get-codex-theme", "package.json"), "utf8"));
  if (installedPackage.version !== sourcePackage.version) {
    throw new Error(`unexpected installed version: ${installedPackage.version}; expected ${sourcePackage.version}`);
  }
  console.log(`Verified ${artifact.filename}: ${artifact.files.length} files, standalone install passed.`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
