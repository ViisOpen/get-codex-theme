(function installGetCodexThemeMenu(options = {}) {
  const HOST_ID = "get-codex-theme-menu-host";
  const STATE_KEY = "__GET_CODEX_THEME_MENU__";
  const bindingName = typeof options.bindingName === "string" ? options.bindingName : "getCodexThemeControl";
  const snapshot = options.snapshot && typeof options.snapshot === "object" ? options.snapshot : {};
  const themes = Array.isArray(snapshot.themes) ? snapshot.themes : [];
  const active = themes.find((theme) => theme.id === snapshot.activeThemeId) ?? null;

  globalThis[STATE_KEY]?.cleanup?.();
  document.getElementById(HOST_ID)?.remove();

  const host = document.createElement("div");
  host.id = HOST_ID;
  host.setAttribute("data-gct-surface", "theme-menu");
  host.style.cssText = "all:initial;position:fixed;top:10px;right:154px;z-index:2147483000;width:max-content;height:32px;pointer-events:auto;color-scheme:light dark;-webkit-app-region:no-drag";
  const shadow = host.attachShadow({ mode: "closed" });

  const style = document.createElement("style");
  style.textContent = `
    :host { all: initial; }
    * { box-sizing: border-box; }
    button { font: 500 12px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .trigger, .panel, .item { -webkit-app-region: no-drag; pointer-events: auto; }
    .trigger {
      min-width: 92px; max-width: 210px; height: 30px; display: flex; align-items: center;
      gap: 7px; padding: 0 10px; border: 1px solid rgba(127,127,127,.25);
      border-radius: 9px; color: CanvasText; background: color-mix(in srgb, Canvas 88%, transparent);
      box-shadow: 0 2px 10px rgba(0,0,0,.08); backdrop-filter: blur(14px); cursor: pointer;
    }
    .trigger:hover, .trigger:focus-visible { border-color: rgba(127,127,127,.45); outline: none; }
    .dot { width: 7px; height: 7px; flex: 0 0 auto; border-radius: 999px; background: ${snapshot.paused ? "#9CA3AF" : "#22C55E"}; }
    .label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .chevron { margin-left: auto; opacity: .58; font-size: 9px; }
    .panel {
      position: absolute; top: 36px; right: 0; width: 244px; max-height: min(460px, calc(100vh - 58px));
      overflow: auto; padding: 7px; border: 1px solid rgba(127,127,127,.22); border-radius: 13px;
      color: CanvasText; background: color-mix(in srgb, Canvas 94%, transparent);
      box-shadow: 0 16px 46px rgba(0,0,0,.22); backdrop-filter: blur(22px);
    }
    .panel[hidden] { display: none; }
    .heading { padding: 6px 8px 5px; color: color-mix(in srgb, CanvasText 58%, transparent); font: 600 10px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; text-transform: uppercase; letter-spacing: .08em; }
    .item { width: 100%; min-height: 34px; display: flex; align-items: center; gap: 8px; padding: 7px 9px; border: 0; border-radius: 8px; color: CanvasText; background: transparent; text-align: left; cursor: pointer; }
    .item:hover, .item:focus-visible { background: color-mix(in srgb, CanvasText 8%, transparent); outline: none; }
    .item[aria-current="true"] { background: color-mix(in srgb, CanvasText 11%, transparent); font-weight: 650; }
    .item:disabled { opacity: .45; cursor: default; }
    .theme-mode { margin-left: auto; color: color-mix(in srgb, CanvasText 48%, transparent); font-size: 10px; text-transform: capitalize; }
    .separator { height: 1px; margin: 6px 5px; background: color-mix(in srgb, CanvasText 11%, transparent); }
    .status { min-height: 18px; padding: 5px 8px 2px; color: color-mix(in srgb, CanvasText 56%, transparent); font: 11px/1.35 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    @media (max-width: 720px) { :host { display: none !important; } }
    @media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; } }
  `;

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "trigger";
  trigger.setAttribute("aria-haspopup", "menu");
  trigger.setAttribute("aria-expanded", "false");
  const dot = document.createElement("span");
  dot.className = "dot";
  dot.setAttribute("aria-hidden", "true");
  const label = document.createElement("span");
  label.className = "label";
  label.textContent = snapshot.paused ? "Themes paused" : active?.name ?? "Themes";
  const chevron = document.createElement("span");
  chevron.className = "chevron";
  chevron.textContent = "▾";
  chevron.setAttribute("aria-hidden", "true");
  trigger.append(dot, label, chevron);

  const panel = document.createElement("div");
  panel.className = "panel";
  panel.hidden = true;
  panel.setAttribute("role", "menu");
  const status = document.createElement("div");
  status.className = "status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");

  function item(text, action, { current = false, disabled = false, suffix = "", themeId } = {}) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "item";
    button.setAttribute("role", "menuitem");
    if (current) button.setAttribute("aria-current", "true");
    button.disabled = disabled;
    const title = document.createElement("span");
    title.textContent = text;
    button.append(title);
    if (suffix) {
      const detail = document.createElement("span");
      detail.className = "theme-mode";
      detail.textContent = suffix;
      button.append(detail);
    }
    button.addEventListener("click", () => send(action, themeId));
    return button;
  }

  function heading(text) {
    const node = document.createElement("div");
    node.className = "heading";
    node.textContent = text;
    return node;
  }

  function separator() {
    const node = document.createElement("div");
    node.className = "separator";
    node.setAttribute("role", "separator");
    return node;
  }

  function send(action, themeId) {
    const binding = globalThis[bindingName];
    if (typeof binding !== "function") {
      status.textContent = "Theme controller is unavailable. Use the menu bar or CLI.";
      return;
    }
    try {
      binding(JSON.stringify({ version: 1, action, ...(themeId ? { themeId } : {}) }));
      if (action === "pause") {
        globalThis.__GET_CODEX_THEME_RUNTIME__?.pause?.();
      }
      status.textContent = action === "switch" ? `Switching to ${themeId}…` : `${action[0].toUpperCase()}${action.slice(1)}…`;
      panel.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
    } catch {
      status.textContent = "The theme action could not be sent.";
    }
  }

  panel.append(heading("Appearance"));
  panel.append(heading("Installed themes"));
  if (themes.length === 0) {
    panel.append(item("No installed themes", "status", { disabled: true }));
  } else {
    for (const theme of themes) {
      panel.append(item(theme.name, "switch", {
        current: theme.id === snapshot.activeThemeId && !snapshot.paused,
        suffix: theme.mode,
        themeId: theme.id,
      }));
    }
  }
  panel.append(separator());
  panel.append(snapshot.paused
    ? item("Resume selected theme", "resume", { disabled: !snapshot.activeThemeId })
    : item("Pause theme", "pause", { disabled: !snapshot.activeThemeId }));
  panel.append(status);
  shadow.append(style, trigger, panel);

  const toggle = () => {
    panel.hidden = !panel.hidden;
    trigger.setAttribute("aria-expanded", String(!panel.hidden));
  };
  const onDocumentPointer = (event) => {
    if (!panel.hidden && !event.composedPath().includes(host)) {
      panel.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
    }
  };
  const onDocumentKey = (event) => {
    if (event.key === "Escape" && !panel.hidden) {
      panel.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      trigger.focus();
    }
  };
  trigger.addEventListener("click", toggle);
  document.addEventListener("pointerdown", onDocumentPointer, true);
  document.addEventListener("keydown", onDocumentKey, true);

  const ensure = () => {
    const mount = document.body ?? document.documentElement;
    if (mount && host.parentNode !== mount) mount.append(host);
  };
  ensure();
  const observer = new MutationObserver(ensure);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  const cleanup = () => {
    observer.disconnect();
    document.removeEventListener("pointerdown", onDocumentPointer, true);
    document.removeEventListener("keydown", onDocumentKey, true);
    host.remove();
    if (globalThis[STATE_KEY]?.host === host) delete globalThis[STATE_KEY];
  };
  const controller = { host, ensure, cleanup };
  globalThis[STATE_KEY] = controller;
  return controller;
})
