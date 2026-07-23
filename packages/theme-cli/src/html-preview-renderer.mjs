import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import sharp from "sharp";

const execFileAsync = promisify(execFile);

export const HTML_PREVIEW_SPECS = Object.freeze({
  home: { width: 1200, height: 750, assetKey: "screenshotHome" },
  task: { width: 1200, height: 750, assetKey: "screenshotTask" },
  narrow: { width: 750, height: 1000, assetKey: "screenshotNarrow" },
});
export const HTML_PREVIEW_RENDERER_VERSION = "1.0.0";

const SAFE_COLORS = /^(#[0-9a-f]{6}|rgba?\([^\r\n{};]+\))$/i;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function safeColor(value, fallback) {
  return typeof value === "string" && SAFE_COLORS.test(value) ? value : fallback;
}

function containedPath(root, relativePath, label) {
  if (typeof relativePath !== "string" || !relativePath || path.isAbsolute(relativePath) || relativePath.split(/[\\/]/).includes("..")) {
    throw new Error(`${label} must stay inside the theme pack.`);
  }
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, relativePath);
  if (!resolved.startsWith(`${resolvedRoot}${path.sep}`)) throw new Error(`${label} must stay inside the theme pack.`);
  return resolved;
}

function imageMime(filePath, bytes) {
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  throw new Error(`Unsupported preview asset format: ${filePath}`);
}

async function imageDataUri(filePath) {
  const bytes = await readFile(filePath);
  return `data:${imageMime(filePath, bytes)};base64,${bytes.toString("base64")}`;
}

function icon(name) {
  const paths = {
    compose: '<path d="M4 16.5V20h3.5L18 9.5 14.5 6 4 16.5Z"/><path d="m13.5 7 3.5 3.5"/>',
    schedule: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
    plugin: '<path d="M8 4v5M16 4v5M6 9h12v2a6 6 0 0 1-12 0V9ZM12 17v3"/>',
    branch: '<circle cx="7" cy="6" r="2"/><circle cx="17" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="M7 8v2c0 3 5 2 5 6M17 8v2c0 3-5 2-5 6"/>',
    chat: '<path d="M5 5h14v10H9l-4 4V5Z"/>',
    folder: '<path d="M3 7h7l2 2h9v10H3V7Z"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 4 4"/>',
    sidebar: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
    code: '<path d="m9 8-4 4 4 4M15 8l4 4-4 4"/>',
    terminal: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 3 3-3 3M13 15h4"/>',
    send: '<path d="M12 19V5M6.5 10.5 12 5l5.5 5.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    chevron: '<path d="m8 10 4 4 4-4"/>',
    spark: '<path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4L12 3ZM18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8L18 15Z"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/>',
    hammer: '<path d="m14 6 4 4M12 4l2-2 6 6-2 2M13 7 5 19l-2-2L13 7Z"/>',
    review: '<path d="M5 7h14M5 12h9M5 17h7"/><path d="m17 15 2 2 3-4"/>',
    wrench: '<path d="M14 6a5 5 0 0 0-6 6L3 17l4 4 5-5a5 5 0 0 0 6-6l-3 3-3-1-1-3 3-3Z"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    shield: '<path d="M12 3 5 6v5c0 4.5 3 7.5 7 10 4-2.5 7-5.5 7-10V6l-7-3Z"/><path d="M12 8v5M12 16h.01"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m5 18 5-5 3 3 2-2 4 4"/>',
  };
  return `<svg aria-hidden="true" viewBox="0 0 24 24">${paths[name] ?? paths.spark}</svg>`;
}

function navigation() {
  return [
    ["compose", "New task"], ["schedule", "Scheduled"], ["plugin", "Plugins"],
    ["branch", "Pull requests"], ["chat", "Chats"],
  ].map(([symbol, label]) => `<div class="nav-item">${icon(symbol)}<span>${label}</span></div>`).join("");
}

function sidebar({ narrow = false, brandLogo = "" } = {}) {
  if (narrow) {
    return `<aside class="sidebar sidebar-narrow">
      <div class="traffic"><i></i><i></i><i></i></div>
      <div class="rail-icon">${icon("sidebar")}</div><div class="rail-icon active">${icon("compose")}</div>
      <div class="rail-icon">${icon("search")}</div><div class="rail-spacer"></div>
      <div class="avatar">CT</div>
    </aside>`;
  }
  return `<aside class="sidebar">
    <div class="sidebar-toolbar"><div class="traffic"><i></i><i></i><i></i></div><div class="history">${icon("sidebar")}<span>‹</span><span class="faded">›</span></div></div>
    <div class="brand-row">${brandLogo ? `<img src="${brandLogo}" alt=""/>` : "<strong>Codex</strong>"}<span>${icon("search")}</span></div>
    <nav>${navigation()}</nav>
    <div class="section-label">Pinned</div>
    <div class="chat-row active"><span>Preview renderer standard</span><b>•••</b></div>
    <div class="section-label projects-title">Projects</div>
    <div class="project"><span>${icon("folder")} Theme Studio</span><small>Build reliable previews</small></div>
    <div class="project"><span>${icon("folder")} Sample App</span><small>Review component states</small></div>
    <div class="project"><span>${icon("folder")} Demo Workspace</span><small>Polish accessible controls</small></div>
    <div class="account"><div class="avatar">CT</div><span>Theme preview</span><b>⌄</b></div>
  </aside>`;
}

function composer() {
  return `<div class="composer">
    <div class="composer-context"><span>${icon("folder")} Theme Studio</span><span>${icon("code")} Local</span><span>${icon("branch")} main</span></div>
    <div class="prompt">Ask Codex to work on a task</div>
    <div class="composer-actions"><div><button class="ghost-icon">${icon("plus")}</button><button class="access">${icon("shield")} Full access</button></div><div><span class="model">Codex 5.6 ${icon("chevron")}</span><button class="ghost-icon">${icon("image")}</button><button class="send">${icon("send")}</button></div></div>
  </div>`;
}

function suggestionCard(iconName, title, detail) {
  return `<button class="suggestion"><span class="suggestion-icon">${icon(iconName)}</span><strong>${title}</strong><small>${detail}</small></button>`;
}

function homeState() {
  return `<main class="main home-state"><header class="top-controls"><button>${icon("sidebar")}</button><button>${icon("code")}</button><button class="share">Share</button></header>
    <section class="home-center"><div class="codex-mark">${icon("terminal")}</div><h1>What should we work on?</h1><p>Start with a focused task in Theme Studio</p>
      <div class="suggestions">${suggestionCard("compass", "Explore code", "Understand a project")}${suggestionCard("hammer", "Build a feature", "Create something new")}${suggestionCard("review", "Review changes", "Find possible issues")}${suggestionCard("wrench", "Fix a problem", "Diagnose and repair")}</div>
    </section>${composer()}</main>`;
}

function taskState() {
  return `<main class="main task-state"><header class="task-header"><div><strong>Improve theme preview rendering</strong><span>Theme Studio</span></div><div class="top-controls"><button>${icon("sidebar")}</button><button>${icon("code")}</button><button class="share">Share</button></div></header>
    <section class="conversation"><div class="user-message"><span>Build an HTML and CSS preview renderer that never reads user chats.</span></div>
      <div class="assistant-message"><div class="codex-avatar">${icon("terminal")}</div><div><p>I’ll use the theme pack’s public assets and fixed demo content, then verify the three required layouts.</p>
        <div class="tool-card"><header><span>${icon("code")} Inspecting theme tokens</span><small>Completed ${icon("check")}</small></header><div class="tool-body"><code>sidebar · suggestions · composer · image controls</code><div class="progress"><i></i></div></div></div>
        <p class="result"><span>${icon("check")}</span> The preview is deterministic and contains no local Codex data.</p></div></div>
    </section>${composer()}</main>`;
}

function disclosure() {
  return '<div class="disclosure">Illustrative HTML/CSS preview · No user data</div>';
}

export function renderPreviewHtml({ manifest, tokens = {}, state = "home", backgroundDataUri, brandLogoDataUri = "" }) {
  const spec = HTML_PREVIEW_SPECS[state];
  if (!spec) throw new Error(`Unknown HTML preview state: ${state}`);
  const palette = manifest.palette ?? {};
  const ui = tokens.uiTokens ?? {};
  const components = tokens.components ?? {};
  const accent = safeColor(palette.accent, "#8B7CFF");
  const secondary = safeColor(palette.secondary, accent);
  const foreground = safeColor(ui.text?.primary ?? palette.foreground, "#F7F7F8");
  const muted = safeColor(ui.text?.secondary ?? palette.muted, "#A7A7AD");
  const surface = safeColor(ui.sidebar?.background ?? palette.surface, "rgba(16,16,20,.90)");
  const elevated = safeColor(ui.card?.background ?? palette.surfaceElevated, "rgba(24,24,28,.96)");
  const input = safeColor(ui.input?.background ?? palette.inputBackground, "rgba(19,19,23,.96)");
  const subtleBorder = safeColor(components.foundation?.border ?? ui.border?.subtle ?? palette.border, "rgba(255,255,255,.13)");
  const codeBackground = safeColor(components.taskArtifacts?.codeBackground ?? palette.codeBackground, "rgba(7,7,9,.97)");
  const buttonForeground = safeColor(palette.buttonForeground, "#0A0A0A");
  const background = escapeHtml(backgroundDataUri);
  const title = escapeHtml(manifest.name ?? "Theme preview");
  const narrow = state === "narrow";
  const content = narrow
    ? `<main class="main home-state narrow-main"><header class="top-controls"><button>${icon("sidebar")}</button><button>${icon("code")}</button></header><section class="home-center"><div class="codex-mark">${icon("terminal")}</div><h1>What should we work on?</h1><p>Start with a focused task</p><div class="suggestions">${suggestionCard("compass", "Explore code", "Understand a project")}${suggestionCard("hammer", "Build a feature", "Create something new")}</div></section>${composer()}</main>`
    : state === "task" ? taskState() : homeState();
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · ${state}</title><style>
    :root{--accent:${accent};--secondary:${secondary};--fg:${foreground};--muted:${muted};--surface:${surface};--elevated:${elevated};--input:${input};--border:${subtleBorder};--code:${codeBackground};--button-fg:${buttonForeground};--shadow-sm:0 1px 2px -1px #00000014;--shadow-md:0 2px 4px -1px #00000014;--shadow-lg:0 4px 8px -2px #0000001a;--shadow-xl:0 8px 16px -4px #0000001f;--shadow-2xl:0 16px 32px -8px #00000030}
    *{box-sizing:border-box}html,body{height:100%;margin:0;overflow:hidden}body{background:#050505;color:var(--fg);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:14px;-webkit-font-smoothing:antialiased}.app{background-image:linear-gradient(rgba(0,0,0,.08),rgba(0,0,0,.08)),url("${background}");background-position:${Number(manifest.layout?.focusX ?? 50)}% ${Number(manifest.layout?.focusY ?? 50)}%;background-size:cover;display:flex;height:${spec.height}px;isolation:isolate;overflow:hidden;position:relative;width:${spec.width}px}.app:after{background:radial-gradient(circle at 52% 44%,transparent 20%,rgba(0,0,0,.16) 75%);content:"";inset:0;pointer-events:none;position:absolute;z-index:-1}svg{display:block;fill:none;height:18px;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round;stroke-width:1.75;width:18px}
    .sidebar{backdrop-filter:blur(20px);background:color-mix(in srgb,var(--surface) 86%,transparent);border-right:1px solid var(--border);display:flex;flex:0 0 260px;flex-direction:column;min-width:0;overflow:visible;padding:12px 12px 14px;position:relative}.sidebar:after{background:linear-gradient(90deg,color-mix(in srgb,var(--surface) 52%,transparent),transparent);content:"";inset:0 -16px 0 auto;pointer-events:none;width:16px}.sidebar-toolbar{align-items:center;display:flex;height:34px;justify-content:space-between}.traffic{display:flex;gap:7px;padding-left:1px}.traffic i{background:#ff5f57;border-radius:50%;height:11px;width:11px}.traffic i:nth-child(2){background:#febc2e}.traffic i:nth-child(3){background:#28c840}.history{align-items:center;color:var(--muted);display:flex;gap:12px}.history svg{height:17px;width:17px}.history span{font-size:20px;font-weight:300;line-height:1}.faded{opacity:.25}.brand-row{align-items:center;display:flex;height:66px;justify-content:space-between;padding:5px 7px 6px}.brand-row img{height:52px;max-width:176px;object-fit:contain;object-position:left center;width:auto}.brand-row strong{font-size:20px;letter-spacing:-.04em}.brand-row span{color:var(--muted)}nav{display:grid;gap:1px}.nav-item{align-items:center;border-radius:8px;color:var(--fg);display:flex;gap:10px;height:34px;padding:0 9px}.nav-item svg{color:var(--muted);height:17px;width:17px}.nav-item:first-child{background:color-mix(in srgb,var(--accent) 11%,transparent)}.section-label{color:var(--muted);font-size:11px;font-weight:600;margin:19px 9px 7px;text-transform:none}.projects-title{margin-top:21px}.chat-row{align-items:center;border-radius:8px;display:flex;height:32px;justify-content:space-between;overflow:hidden;padding:0 9px}.chat-row.active{background:color-mix(in srgb,var(--accent) 16%,transparent)}.chat-row span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.chat-row b{color:var(--muted);font-size:10px;letter-spacing:1px}.project{border-radius:8px;display:flex;flex-direction:column;gap:3px;padding:7px 9px}.project>span{align-items:center;display:flex;gap:9px}.project svg{color:var(--muted);height:16px;width:16px}.project small{color:var(--muted);font-size:11px;margin-left:25px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.account{align-items:center;border-top:1px solid var(--border);display:flex;gap:9px;margin-top:auto;padding:13px 6px 0}.account span{flex:1}.account b{color:var(--muted)}.avatar{align-items:center;background:var(--accent);border-radius:50%;color:var(--button-fg);display:flex;font-size:9px;font-weight:700;height:24px;justify-content:center;width:24px}
    .main{flex:1;min-width:0;position:relative}.top-controls{align-items:center;display:flex;gap:7px;position:absolute;right:18px;top:14px;z-index:5}.top-controls button,.ghost-icon{align-items:center;background:color-mix(in srgb,var(--elevated) 78%,transparent);border:1px solid var(--border);border-radius:8px;color:var(--fg);display:flex;height:32px;justify-content:center;padding:0;width:32px}.top-controls .share{padding:0 13px;width:auto}.home-center{left:50%;position:absolute;text-align:center;top:47%;transform:translate(-50%,-50%);width:min(850px,calc(100% - 72px))}.codex-mark{align-items:center;border:1px solid color-mix(in srgb,var(--fg) 28%,transparent);border-radius:18px;color:color-mix(in srgb,var(--fg) 54%,transparent);display:flex;height:48px;justify-content:center;margin:0 auto 20px;width:48px}.codex-mark svg{height:28px;width:28px}.home-center h1{font-size:28px;font-weight:500;letter-spacing:-.035em;line-height:1.2;margin:0}.home-center p{color:var(--muted);font-size:13px;margin:8px 0 26px}.suggestions{display:grid;gap:10px;grid-template-columns:repeat(4,1fr);margin:auto;max-width:750px}.suggestion{background:color-mix(in srgb,var(--elevated) 84%,transparent);border:1px solid var(--border);border-radius:12px;box-shadow:var(--shadow-lg);color:var(--fg);display:flex;flex-direction:column;height:112px;justify-content:flex-start;padding:13px;text-align:left}.suggestion-icon{align-items:center;background:color-mix(in srgb,var(--accent) 14%,transparent);border-radius:9px;color:var(--accent);display:flex;height:32px;justify-content:center;margin-bottom:11px;width:32px}.suggestion-icon svg{height:17px;width:17px}.suggestion strong{font-size:12px;font-weight:550;line-height:1.25}.suggestion small{color:var(--muted);font-size:10px;margin-top:3px}.composer{background:var(--input);border:1px solid var(--border);border-radius:16px;bottom:22px;box-shadow:var(--shadow-2xl);height:132px;left:50%;overflow:hidden;position:absolute;transform:translateX(-50%);width:min(760px,calc(100% - 64px));z-index:4}.composer-context{align-items:center;border-bottom:1px solid color-mix(in srgb,var(--border) 70%,transparent);display:flex;gap:7px;height:36px;padding:0 10px}.composer-context span{align-items:center;background:color-mix(in srgb,var(--accent) 9%,transparent);border:1px solid color-mix(in srgb,var(--accent) 30%,transparent);border-radius:7px;color:var(--fg);display:flex;font-size:11px;gap:5px;height:25px;padding:0 8px}.composer-context svg{height:13px;width:13px}.prompt{color:var(--muted);font-size:14px;padding:14px 15px 7px}.composer-actions{align-items:center;bottom:9px;display:flex;justify-content:space-between;left:10px;position:absolute;right:10px}.composer-actions>div{align-items:center;display:flex;gap:6px}.composer-actions button{border:0}.ghost-icon{background:transparent;border:0;height:28px;width:28px}.ghost-icon svg{height:17px;width:17px}.access{align-items:center;background:transparent;color:var(--accent);display:flex;font-size:11px;gap:5px}.access svg{height:15px;width:15px}.model{align-items:center;color:var(--muted);display:flex;font-size:11px;gap:3px}.model svg{height:12px;width:12px}.send{align-items:center;background:var(--accent);border-radius:50%;color:var(--button-fg);display:flex;height:30px;justify-content:center;width:30px}.send svg{height:16px;width:16px}
    .task-header{align-items:center;border-bottom:1px solid var(--border);display:flex;height:61px;justify-content:space-between;padding:0 18px 0 24px}.task-header>div:first-child{display:flex;flex-direction:column;gap:3px}.task-header strong{font-size:13px;font-weight:600}.task-header span{color:var(--muted);font-size:11px}.task-header .top-controls{position:static}.conversation{height:calc(100% - 210px);margin:0 auto;max-width:720px;overflow:hidden;padding:44px 4px 24px}.user-message{display:flex;justify-content:flex-end;margin-bottom:30px}.user-message span{background:color-mix(in srgb,var(--elevated) 92%,transparent);border:1px solid var(--border);border-radius:14px 14px 4px 14px;box-shadow:var(--shadow-md);font-size:13px;line-height:1.5;max-width:520px;padding:11px 14px}.assistant-message{display:grid;gap:13px;grid-template-columns:30px 1fr}.assistant-message p{font-size:13px;line-height:1.55;margin:1px 0 14px}.codex-avatar{align-items:center;border:1px solid var(--border);border-radius:9px;color:var(--muted);display:flex;height:28px;justify-content:center;width:28px}.codex-avatar svg{height:17px;width:17px}.tool-card{background:color-mix(in srgb,var(--surface) 94%,transparent);border:1px solid var(--border);border-radius:12px;box-shadow:var(--shadow-lg);margin:14px 0;overflow:hidden}.tool-card header{align-items:center;background:color-mix(in srgb,var(--elevated) 82%,transparent);border-bottom:1px solid var(--border);display:flex;height:38px;justify-content:space-between;padding:0 12px}.tool-card header span,.tool-card header small{align-items:center;display:flex;gap:7px}.tool-card header span{font-size:11px;font-weight:550}.tool-card header small{color:var(--muted);font-size:10px}.tool-card svg{height:14px;width:14px}.tool-body{background:var(--code);padding:13px}.tool-body code{color:var(--muted);font-family:ui-monospace,"SFMono-Regular",Menlo,monospace;font-size:10px}.progress{background:color-mix(in srgb,var(--fg) 8%,transparent);border-radius:9px;height:4px;margin-top:12px;overflow:hidden}.progress i{background:linear-gradient(90deg,var(--secondary),var(--accent));display:block;height:100%;width:100%}.result{align-items:center;color:var(--muted);display:flex!important;gap:8px}.result span{color:var(--accent)}.result svg{height:16px;width:16px}
    .disclosure{backdrop-filter:blur(12px);background:rgba(0,0,0,.64);border:1px solid rgba(255,255,255,.17);border-radius:999px;color:rgba(255,255,255,.72);font-size:9px;left:50%;letter-spacing:.01em;padding:5px 9px;position:absolute;top:8px;transform:translateX(-50%);z-index:12}
    .state-task .disclosure{bottom:8px;left:268px;top:auto;transform:none}
    .sidebar-narrow{align-items:center;flex-basis:62px;padding:12px 8px}.sidebar-narrow:after{right:-10px;width:10px}.sidebar-narrow .traffic{gap:4px;padding:0}.sidebar-narrow .traffic i{height:7px;width:7px}.rail-icon{align-items:center;border-radius:9px;color:var(--muted);display:flex;height:38px;justify-content:center;margin-top:16px;width:38px}.rail-icon.active{background:color-mix(in srgb,var(--accent) 16%,transparent);color:var(--fg)}.rail-spacer{flex:1}.narrow-main .top-controls{right:12px;top:12px}.narrow-main .home-center{top:41%;width:calc(100% - 42px)}.narrow-main .suggestions{grid-template-columns:repeat(2,1fr);max-width:420px}.narrow-main .composer{bottom:20px;width:calc(100% - 30px)}.narrow-main .composer-context span:nth-child(2),.narrow-main .composer-context span:nth-child(3){display:none}.narrow-main .home-center h1{font-size:25px}
  </style></head><body><div class="app state-${state}">${sidebar({ narrow, brandLogo: escapeHtml(brandLogoDataUri) })}${content}${disclosure()}</div></body></html>`;
}

export function discoverPreviewBrowser(explicitPath) {
  const candidates = [
    explicitPath,
    process.platform === "darwin" ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : null,
    process.platform === "darwin" ? "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" : null,
    process.platform === "win32" ? path.join(process.env.PROGRAMFILES ?? "C:\\Program Files", "Google/Chrome/Application/chrome.exe") : null,
    process.platform === "win32" ? path.join(process.env.PROGRAMFILES ?? "C:\\Program Files", "Microsoft/Edge/Application/msedge.exe") : null,
    "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/microsoft-edge",
  ].filter(Boolean);
  const browser = candidates.find((candidate) => existsSync(candidate));
  if (!browser) throw new Error("No supported Chromium browser was found. Install Chrome/Edge or pass --browser PATH.");
  return browser;
}

async function replaceFile(temporary, destination, force) {
  if (existsSync(destination) && !force) throw new Error(`Refusing to overwrite existing preview: ${destination}. Pass --force after reviewing it.`);
  await mkdir(path.dirname(destination), { recursive: true });
  const backup = `${destination}.${process.pid}.html-preview-backup`;
  await rm(backup, { force: true });
  if (existsSync(destination)) await rename(destination, backup);
  try {
    await rename(temporary, destination);
    await rm(backup, { force: true });
  } catch (error) {
    if (existsSync(backup)) await rename(backup, destination);
    throw error;
  }
}

async function rasterizeHtml({ browser, htmlPath, outputPath, width, height }) {
  const pngPath = `${outputPath}.png`;
  await execFileAsync(browser, [
    "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", "--no-default-browser-check",
    "--force-device-scale-factor=1", "--run-all-compositor-stages-before-draw", "--virtual-time-budget=1200",
    `--window-size=${width},${height}`, `--screenshot=${pngPath}`, pathToFileURL(htmlPath).href,
  ], { timeout: 30_000, maxBuffer: 4 * 1024 * 1024 });
  await sharp(pngPath).flatten({ background: "#050505" }).jpeg({ quality: 92, chromaSubsampling: "4:4:4" }).toFile(outputPath);
  await rm(pngPath, { force: true });
}

export async function renderHtmlThemePreviews({ packDirectory, manifest, tokens, state = "all", browserPath, force = false }) {
  const states = state === "all" ? Object.keys(HTML_PREVIEW_SPECS) : [state];
  if (states.some((item) => !HTML_PREVIEW_SPECS[item])) throw new Error(`--state must be one of: all, ${Object.keys(HTML_PREVIEW_SPECS).join(", ")}.`);
  const browser = discoverPreviewBrowser(browserPath);
  const browserVersion = await execFileAsync(browser, ["--version"], { timeout: 5_000, maxBuffer: 16 * 1024 })
    .then(({ stdout, stderr }) => String(stdout || stderr).trim().slice(0, 120))
    .catch(() => "unknown");
  const backgroundPath = containedPath(packDirectory, manifest.assets.background16x10, "assets.background16x10");
  const backgroundDataUri = await imageDataUri(backgroundPath);
  const brandLogoDataUri = manifest.assets.brandLogo
    ? await imageDataUri(containedPath(packDirectory, manifest.assets.brandLogo, "assets.brandLogo"))
    : "";
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "codex-theme-html-preview-"));
  const outputs = [];
  try {
    for (const item of states) {
      const spec = HTML_PREVIEW_SPECS[item];
      const htmlPath = path.join(temporaryRoot, `${item}.html`);
      const temporaryOutput = path.join(temporaryRoot, `${item}.jpg`);
      const html = renderPreviewHtml({ manifest, tokens, state: item, backgroundDataUri, brandLogoDataUri });
      await writeFile(htmlPath, html, "utf8");
      await rasterizeHtml({ browser, htmlPath, outputPath: temporaryOutput, width: spec.width, height: spec.height });
      const destination = containedPath(packDirectory, manifest.assets[spec.assetKey], `assets.${spec.assetKey}`);
      await replaceFile(temporaryOutput, destination, force);
      outputs.push({ state: item, destination, width: spec.width, height: spec.height });
    }
    if (states.includes("home")) {
      const home = containedPath(packDirectory, manifest.assets.screenshotHome, "assets.screenshotHome");
      const preview = containedPath(packDirectory, manifest.assets.preview, "assets.preview");
      const temporaryPreview = path.join(temporaryRoot, "preview.jpg");
      await copyFile(home, temporaryPreview);
      await replaceFile(temporaryPreview, preview, force);
    }
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
  return { renderer: "html-css", rendererVersion: HTML_PREVIEW_RENDERER_VERSION, browserVersion, states: outputs };
}
