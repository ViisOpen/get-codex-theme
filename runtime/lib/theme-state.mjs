import fs from "node:fs/promises";
import path from "node:path";
import { defaultLibraryRoot } from "./theme-loader.mjs";

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CONTROL_SCHEMA_VERSION = 1;

function controlPath(libraryRoot) {
  return path.join(libraryRoot, "runtime-control.json");
}

async function readJson(filePath) {
  return JSON.parse((await fs.readFile(filePath, "utf8")).replace(/^\uFEFF/, ""));
}

async function readActiveThemeId(libraryRoot) {
  try {
    const pointer = await readJson(path.join(libraryRoot, "active-theme.json"));
    const id = typeof pointer === "string" ? pointer : pointer?.themeId ?? pointer?.id;
    return typeof id === "string" && ID_PATTERN.test(id) ? id : null;
  } catch (error) {
    if (error?.code !== "ENOENT") return null;
  }
  try {
    const id = (await fs.readFile(path.join(libraryRoot, "active-theme"), "utf8")).trim();
    return ID_PATTERN.test(id) ? id : null;
  } catch {
    return null;
  }
}

async function atomicWriteJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
    await fs.rename(temporary, filePath);
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}

export async function readThemeControlState({ libraryRoot = defaultLibraryRoot() } = {}) {
  const root = path.resolve(libraryRoot);
  try {
    const state = await readJson(controlPath(root));
    if (state?.schemaVersion !== CONTROL_SCHEMA_VERSION) throw new Error("unsupported control state schema");
    return {
      schemaVersion: CONTROL_SCHEMA_VERSION,
      paused: state.paused === true,
      stockAppearance: state.stockAppearance === true,
      updatedAt: typeof state.updatedAt === "string" ? state.updatedAt : null,
      lastAction: typeof state.lastAction === "string" ? state.lastAction : null,
    };
  } catch (error) {
    if (error?.code !== "ENOENT") {
      return { schemaVersion: CONTROL_SCHEMA_VERSION, paused: true, stockAppearance: true, updatedAt: null, lastAction: "invalid-state-fail-closed" };
    }
    return { schemaVersion: CONTROL_SCHEMA_VERSION, paused: false, stockAppearance: false, updatedAt: null, lastAction: null };
  }
}

export async function listInstalledThemes({ libraryRoot = defaultLibraryRoot() } = {}) {
  const root = path.resolve(libraryRoot);
  const themesRoot = path.join(root, "themes");
  let entries;
  try {
    entries = await fs.readdir(themesRoot, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }

  const themes = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory() || !ID_PATTERN.test(entry.name)) continue;
    try {
      const manifest = await readJson(path.join(themesRoot, entry.name, "manifest.json"));
      if (manifest?.id !== entry.name || ![1, 2].includes(manifest?.schemaVersion) || !["light", "dark"].includes(manifest.mode)) continue;
      themes.push({
        id: manifest.id,
        name: typeof manifest.name === "string" && manifest.name.trim() ? manifest.name.trim().slice(0, 80) : manifest.id,
        version: typeof manifest.version === "string" ? manifest.version : null,
        mode: manifest.mode,
      });
    } catch {
      // A broken pack should not make the switcher unusable. Validation remains
      // the installer's responsibility, so invalid entries are simply omitted.
    }
  }
  return themes;
}

export async function getThemeSurfaceSnapshot({ libraryRoot = defaultLibraryRoot() } = {}) {
  const root = path.resolve(libraryRoot);
  const [themes, state, activeThemeId] = await Promise.all([
    listInstalledThemes({ libraryRoot: root }),
    readThemeControlState({ libraryRoot: root }),
    readActiveThemeId(root),
  ]);
  return {
    schemaVersion: 1,
    libraryRoot: root,
    activeThemeId,
    paused: state.paused,
    stockAppearance: state.stockAppearance,
    themes,
  };
}

async function writeControlState(libraryRoot, { paused, stockAppearance, lastAction }) {
  const value = {
    schemaVersion: CONTROL_SCHEMA_VERSION,
    paused,
    stockAppearance,
    lastAction,
    updatedAt: new Date().toISOString(),
  };
  await atomicWriteJson(controlPath(libraryRoot), value);
  return value;
}

export async function switchInstalledTheme(themeId, { libraryRoot = defaultLibraryRoot() } = {}) {
  if (!ID_PATTERN.test(themeId ?? "")) throw new Error("Theme id must be lowercase kebab-case.");
  const root = path.resolve(libraryRoot);
  const themes = await listInstalledThemes({ libraryRoot: root });
  if (!themes.some((theme) => theme.id === themeId)) throw new Error(`Installed theme not found or invalid: ${themeId}`);

  const pointer = path.join(root, "active-theme.json");
  const previous = path.join(root, "backups", "previous-active-theme.json");
  await fs.mkdir(path.dirname(previous), { recursive: true });
  try {
    await fs.copyFile(pointer, previous);
  } catch (error) {
    if (error?.code === "ENOENT") await fs.rm(previous, { force: true });
    else throw error;
  }
  await atomicWriteJson(pointer, { schemaVersion: 1, themeId, activatedAt: new Date().toISOString() });
  await writeControlState(root, { paused: false, stockAppearance: false, lastAction: "switch" });
  return getThemeSurfaceSnapshot({ libraryRoot: root });
}

export async function pauseTheme({ libraryRoot = defaultLibraryRoot(), stockAppearance = false } = {}) {
  const root = path.resolve(libraryRoot);
  await writeControlState(root, { paused: true, stockAppearance, lastAction: stockAppearance ? "stock" : "pause" });
  return getThemeSurfaceSnapshot({ libraryRoot: root });
}

export async function resumeTheme({ libraryRoot = defaultLibraryRoot() } = {}) {
  const root = path.resolve(libraryRoot);
  const activeThemeId = await readActiveThemeId(root);
  if (!activeThemeId) throw new Error("No active theme is selected.");
  const themes = await listInstalledThemes({ libraryRoot: root });
  if (!themes.some((theme) => theme.id === activeThemeId)) throw new Error(`Active theme is not installed or valid: ${activeThemeId}`);
  await writeControlState(root, { paused: false, stockAppearance: false, lastAction: "resume" });
  return getThemeSurfaceSnapshot({ libraryRoot: root });
}

export async function handleThemeControlAction(message, { libraryRoot = defaultLibraryRoot() } = {}) {
  if (!message || typeof message !== "object" || Array.isArray(message)) throw new Error("Invalid theme control action.");
  if (message.version !== 1) throw new Error("Unsupported theme control action version.");
  if (message.action === "switch") return switchInstalledTheme(message.themeId, { libraryRoot });
  if (message.action === "pause") return pauseTheme({ libraryRoot });
  if (message.action === "resume") return resumeTheme({ libraryRoot });
  if (message.action === "stock") return pauseTheme({ libraryRoot, stockAppearance: true });
  if (message.action === "status") return getThemeSurfaceSnapshot({ libraryRoot });
  throw new Error(`Unsupported theme control action: ${String(message.action)}`);
}
