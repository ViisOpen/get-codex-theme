((cssText, theme, artDataUrls, brandLogoDataUrl, bundleId) => {
  const STATE_KEY = "__GET_CODEX_THEME_RUNTIME__";
  const STYLE_ID = "get-codex-theme-style";
  const BACKGROUND_ID = "get-codex-theme-background";
  const SHELL_BRAND_ID = "get-codex-theme-shell-brand";
  const WORKSPACE_BRAND_ID = "get-codex-theme-workspace-brand";
  const BRAND_HOST_ATTRIBUTE = "data-gct-brand-host";
  const HOME_CLASS = "gct-home";
  const HOME_SHELL_CLASS = "gct-home-shell";
  const COMPONENT_ATTRIBUTE = "data-gct-component";
  const INVARIANT_TOLERANCE = 1;
  const INVARIANT_RETRY_LIMIT = 8;
  const INVARIANT_SURFACES = ["sidebar", "suggestions", "composer", "attachments"];
  const GEOMETRY_STYLE_KEYS = [
    "position", "display", "boxSizing", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
    "marginTop", "marginRight", "marginBottom", "marginLeft", "borderTopWidth", "borderRightWidth",
    "borderBottomWidth", "borderLeftWidth", "borderRadius", "transform", "boxShadow", "zIndex", "order",
    "pointerEvents", "visibility",
  ];
  const COMPONENT_RULES = [
    { token: "button-primary", selectors: ['button[class~="bg-token-foreground"]'] },
    { token: "button-destructive", selectors: ['button[data-variant="destructive"]', 'button[data-destructive="true"]', 'button[class~="text-token-error"]'] },
    { token: "button-icon", selectors: ['button[aria-label]'] },
    { token: "button-suggestion", selectors: ['[class~="group/home-suggestions"] button'] },
    { token: "button-project", selectors: ['[class~="group/project-selector"] > button'] },
    { token: "button-review", selectors: ['[class~="group/turn-diff-header"] button[class~="bg-token-bg-fog"]'] },
    { token: "button-feedback", selectors: ['[data-sonner-toast] button', '[role="status"] button', '[role="alert"] button'] },
    { token: "settings-panel", selectors: ['div[style*="background-color: var(--color-background-panel"]'] },
    { token: "input-switch", selectors: ['button[role="switch"]'] },
    { token: "settings-option-selected", selectors: ['div[style*="background-color: var(--color-background-panel"] button[class~="bg-token-foreground/5"]'] },
    { token: "button-secondary", selectors: ['.composer-surface-chrome button:not([class~="bg-token-foreground"])', '[role="dialog"] button', '[role="menu"] button', '[role="menuitem"]'] },
    { token: "button-navigation", selectors: ['aside.app-shell-left-panel button', 'aside.app-shell-left-panel a', 'header.app-header-tint button'] },
    { token: "icon", selectors: ['aside.app-shell-left-panel svg', 'header.app-header-tint button svg', '.composer-surface-chrome button svg', '[role="dialog"] button svg', '[role="menu"] svg', '[class~="group/home-suggestions"] button svg'] },
    { token: "overlay", selectors: ['[role="dialog"]', '[role="menu"]', '[role="listbox"]', '[role="tooltip"]', '[data-radix-popper-content-wrapper] > *'] },
    { token: "form-field", selectors: ['textarea', 'input:not([type="checkbox"]):not([type="radio"])', 'select', '.ProseMirror'] },
    { token: "form-choice", selectors: ['input[type="checkbox"]', 'input[type="radio"]', '[role="checkbox"]', '[role="radio"]', '[role="switch"]'] },
    { token: "form-tab", selectors: ['[role="tab"]'] },
    { token: "message", selectors: ['[data-user-message-bubble]', '[data-local-conversation-final-assistant]'] },
    { token: "approval", selectors: ['[data-codex-approval-surface]'] },
    { token: "tool-call", selectors: ['[data-testid*="tool-call"]', '[data-testid*="tool-output"]', '[data-codex-tool-call]'] },
    { token: "attachment", selectors: ['[data-testid*="attachment"]', '[data-testid*="file-card"]'] },
    { token: "code-block", selectors: ['pre', '.monaco-editor'] },
    { token: "terminal", selectors: ['[data-testid*="terminal"]', '.xterm'] },
    { token: "diff", selectors: ['[data-testid*="diff"]', '.monaco-diff-editor'] },
    { token: "table", selectors: ['[role="main"] table'] },
    { token: "quote", selectors: ['[role="main"] blockquote'] },
    { token: "toast", selectors: ['[data-sonner-toast]', '[role="status"]'] },
    { token: "alert", selectors: ['[role="alert"]'] },
    { token: "progress", selectors: ['progress', '[role="progressbar"]'] },
    { token: "skeleton", selectors: ['[data-loading="true"]', '[class*="skeleton"]'] },
    { token: "badge", selectors: ['[data-testid*="badge"]', '[class~="badge"]'] },
    { token: "utility-surface", selectors: ['main.main-surface [role="main"]'] },
  ];

  const previous = globalThis[STATE_KEY];
  const installThemeMenu = __GCT_MENU_INSTALLER__;
  const menuController = installThemeMenu({ bindingName: "getCodexThemeControl", snapshot: __GCT_MENU_SNAPSHOT__ });
  if (previous?.bundleId === bundleId) {
    previous.menuController = menuController;
    previous.resume?.();
    previous.ensure?.();
    return { installed: true, reused: true, themeId: theme.id, bundleId };
  }
  previous?.cleanup?.();

  const root = document.documentElement;
  const markedComponents = new Set();
  const invariantStatus = Object.fromEntries(INVARIANT_SURFACES.map((name) => [name, { status: "pending", checked: 0, reason: null }]));
  let observedRoot = null;
  let scheduledFrame = null;
  let scheduledKind = null;
  let verificationGeneration = 0;
  let disposed = false;
  let paused = false;
  let baseline = null;

  const cssName = (value) => value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  const setVariables = () => {
    const values = {
      "--gct-color-scheme": theme.mode,
      "--gct-accent": theme.palette.accent,
      "--gct-secondary": theme.palette.secondary ?? theme.palette.accent,
      "--gct-success": theme.palette.success ?? theme.palette.accent,
      "--gct-warning": theme.palette.warning ?? theme.palette.accent,
      "--gct-danger": theme.palette.danger ?? theme.palette.accent,
      "--gct-focus-ring": theme.palette.focusRing ?? theme.palette.accent,
      "--gct-background": theme.palette.background,
      "--gct-foreground": theme.palette.foreground,
      "--gct-muted": theme.palette.muted,
      "--gct-surface": theme.palette.surface,
      "--gct-surface-elevated": theme.palette.surfaceElevated,
      "--gct-border": theme.palette.border,
      "--gct-code-background": theme.palette.codeBackground,
      "--gct-code-foreground": theme.palette.codeForeground,
      "--gct-input": theme.palette.inputBackground,
      "--gct-button": theme.palette.buttonBackground,
      "--gct-button-foreground": theme.palette.buttonForeground,
      "--gct-focus-x": `${theme.layout.focusX}%`,
      "--gct-focus-y": `${theme.layout.focusY}%`,
      "--gct-art-16x10": `url(${JSON.stringify(artDataUrls.background16x10)})`,
      "--gct-art-16x9": `url(${JSON.stringify(artDataUrls.background16x9 ?? artDataUrls.background16x10)})`,
      "--gct-art-4x3": `url(${JSON.stringify(artDataUrls.background4x3 ?? artDataUrls.background16x10)})`,
    };
    for (const [name, value] of Object.entries(values)) root.style.setProperty(name, value, "important");
    for (const [group, groupValues] of Object.entries(theme.components?.values ?? {})) {
      for (const [name, value] of Object.entries(groupValues)) root.style.setProperty(`--gct-${cssName(group)}-${cssName(name)}`, String(value), "important");
    }
    root.dataset.gctComponents = (theme.components?.enabled ?? []).join(" ");
    root.dataset.gctAuthoringPath = theme.components?.path ?? "assisted";
    root.dataset.gctRuntimeVersion = "4";
  };

  const findHome = () => {
    const suggestions = document.querySelector('[class~="group/home-suggestions"]');
    if (suggestions) return suggestions.closest('[role="main"]');
    return document.querySelector('[data-testid="home-icon"]')?.closest('[role="main"]') ?? null;
  };

  const utilityRoute = () => {
    const routes = [
      ["scheduled", ['[aria-current="page"][href*="scheduled"]', '[data-testid*="scheduled-page"]']],
      ["plugins", ['[aria-current="page"][href*="plugin"]', '[data-testid*="plugins-page"]']],
      ["pull-requests", ['[aria-current="page"][href*="pull"]', '[data-testid*="pull-request"]']],
      ["chat", ['[aria-current="page"][href*="chat"]', '[data-testid*="chat-page"]']],
      ["search", ['[aria-current="page"][href*="search"]', '[data-testid*="search-page"]']],
    ];
    for (const [route, selectors] of routes) if (selectors.some((selector) => document.querySelector(selector))) return route;
    return null;
  };

  const syncRoute = () => {
    const home = findHome();
    const shellMain = document.querySelector("main.main-surface") ?? document.querySelector("main");
    for (const node of document.querySelectorAll(`.${HOME_CLASS}`)) if (node !== home) node.classList.remove(HOME_CLASS);
    for (const node of document.querySelectorAll(`.${HOME_SHELL_CLASS}`)) if (node !== shellMain || !home) node.classList.remove(HOME_SHELL_CLASS);
    if (home && !home.classList.contains(HOME_CLASS)) home.classList.add(HOME_CLASS);
    if (shellMain && Boolean(home) !== shellMain.classList.contains(HOME_SHELL_CLASS)) shellMain.classList.toggle(HOME_SHELL_CLASS, Boolean(home));
    root.dataset.gctRoute = home ? "home" : (utilityRoute() ?? (document.querySelector(".thread-scroll-container") ? "task" : "unknown"));
  };

  const tagComponents = () => {
    const assignments = new Map();
    const assign = (node, token) => {
      if (!node) return;
      const tokens = assignments.get(node) ?? new Set();
      tokens.add(token);
      assignments.set(node, tokens);
    };
    for (const node of markedComponents) node.removeAttribute?.(COMPONENT_ATTRIBUTE);
    markedComponents.clear();
    for (const rule of COMPONENT_RULES) {
      for (const selector of rule.selectors) {
        let nodes;
        try { nodes = document.querySelectorAll(selector); } catch { continue; }
        for (const node of nodes) assign(node, rule.token);
      }
    }
    for (const terminal of document.querySelectorAll('[data-testid*="terminal"], .xterm')) {
      let node = terminal;
      for (let depth = 0; node && depth < 8; depth += 1, node = node.parentElement) {
        if (node.matches?.("html, body, main.main-surface")) break;
        assign(node, "terminal");
      }
    }
    for (const [node, tokens] of assignments) {
      node.setAttribute(COMPONENT_ATTRIBUTE, [...tokens].join(" "));
      markedComponents.add(node);
    }
    const anchorCount = document.querySelectorAll("aside.app-shell-left-panel, main.main-surface, .composer-surface-chrome").length;
    root.dataset.gctCompatibility = anchorCount >= 3 ? "verified" : anchorCount > 0 ? "partial" : "unknown";
  };

  const unique = (nodes) => [...new Set(nodes.filter(Boolean))].filter((node) => node?.isConnected).slice(0, 96);
  const descendants = (host, selector) => host ? [...host.querySelectorAll(selector)] : [];
  const locateInvariantSurfaces = () => {
    const sidebar = document.querySelector("aside.app-shell-left-panel");
    const suggestions = document.querySelector('[class~="group/home-suggestions"]');
    const composer = document.querySelector(".composer-surface-chrome");
    const composerHost = composer?.closest("[data-codex-composer-root]") ?? composer?.parentElement;
    const attachmentSelector = '[data-testid*="attachment"], [data-testid*="file-card"], [aria-label*="image" i], [aria-label*="attach" i], [aria-label*="upload" i], [aria-label*="remove" i], [aria-label*="delete" i]';
    return {
      sidebar: unique([sidebar, ...descendants(sidebar, "button, a, [role=button]")]),
      suggestions: unique([suggestions, ...descendants(suggestions, "button, [role=button], button > *")]),
      composer: unique([composerHost, composer, ...descendants(composer, "textarea, input, button, [role=button], [class~=\"group/project-selector\"]")]),
      attachments: unique(descendants(composer, attachmentSelector)),
    };
  };

  const visible = (node, rect, style) => node.isConnected && rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.bottom > 0 && rect.left < innerWidth && rect.top < innerHeight && style.display !== "none" && style.visibility !== "hidden";
  const hitTargetWorks = (node, rect, style) => {
    if (!visible(node, rect, style)) return true;
    if (style.pointerEvents === "none" || typeof document.elementFromPoint !== "function") return style.pointerEvents !== "none";
    const x = Math.max(0, Math.min(innerWidth - 1, rect.left + rect.width / 2));
    const y = Math.max(0, Math.min(innerHeight - 1, rect.top + rect.height / 2));
    const hit = document.elementFromPoint(x, y);
    return Boolean(hit && (node === hit || node.contains(hit)));
  };

  const snapshotNode = (node) => {
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    const interactive = node.matches?.("button, a[href], input, textarea, select, [role=button], [role=link]") ?? false;
    return {
      node,
      parent: node.parentElement,
      siblingIndex: node.parentElement ? [...node.parentElement.children].indexOf(node) : -1,
      rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      style: Object.fromEntries(GEOMETRY_STYLE_KEYS.map((key) => [key, style[key]])),
      interactive,
      hitTargetWorking: !interactive || hitTargetWorks(node, rect, style),
    };
  };

  const captureNativeBaseline = () => {
    const wasActive = root.classList.contains("get-codex-theme-active");
    root.classList.remove("get-codex-theme-active");
    const surfaces = locateInvariantSurfaces();
    const captured = Object.fromEntries(INVARIANT_SURFACES.map((name) => [name, surfaces[name].map(snapshotNode)]));
    if (wasActive) root.classList.add("get-codex-theme-active");
    return captured;
  };

  const compareSnapshot = (snapshot) => {
    const { node } = snapshot;
    if (!node.isConnected || node.parentElement !== snapshot.parent) return "node-parent-changed";
    if (snapshot.parent && [...snapshot.parent.children].indexOf(node) !== snapshot.siblingIndex) return "node-order-changed";
    const rect = node.getBoundingClientRect();
    for (const key of ["left", "top", "width", "height"]) if (Math.abs(rect[key] - snapshot.rect[key]) > INVARIANT_TOLERANCE) return `geometry-${key}`;
    const style = getComputedStyle(node);
    for (const key of GEOMETRY_STYLE_KEYS) if (style[key] !== snapshot.style[key]) return `style-${cssName(key)}`;
    if (snapshot.interactive && snapshot.hitTargetWorking && !hitTargetWorks(node, rect, style)) return "hit-test";
    return null;
  };

  const setInvariantStatus = (name, status, reason = null, checked = 0) => {
    invariantStatus[name] = { status, reason, checked };
    root.setAttribute(`data-gct-invariant-${name}`, status);
  };

  const disableSurfaceTheme = (snapshots) => {
    for (const { node } of snapshots) {
      node.removeAttribute?.(COMPONENT_ATTRIBUTE);
      node.querySelectorAll?.(`[${COMPONENT_ATTRIBUTE}]`).forEach((child) => child.removeAttribute(COMPONENT_ATTRIBUTE));
    }
  };

  const verifyNativeInvariants = (generation, attempt = 0) => {
    if (disposed || paused || generation !== verificationGeneration || !baseline) return;
    const results = {};
    for (const name of INVARIANT_SURFACES) {
      const snapshots = baseline[name];
      if (snapshots.length === 0) {
        results[name] = { status: "inactive", reason: null, checked: 0, snapshots };
        continue;
      }
      let reason = null;
      for (const snapshot of snapshots) {
        reason = compareSnapshot(snapshot);
        if (reason) break;
      }
      results[name] = { status: reason ? "fallback" : "verified", reason, checked: snapshots.length, snapshots };
    }
    if (attempt < INVARIANT_RETRY_LIMIT && Object.values(results).some(({ status }) => status === "fallback")) {
      baseline = captureNativeBaseline();
      for (const name of INVARIANT_SURFACES) setInvariantStatus(name, baseline[name].length ? "pending" : "inactive");
      scheduleInvariantPass(generation, attempt + 1);
      return;
    }
    for (const [name, result] of Object.entries(results)) {
      if (result.status === "fallback") disableSurfaceTheme(result.snapshots);
      setInvariantStatus(name, result.status, result.reason, result.checked);
    }
    const statuses = Object.values(invariantStatus).map(({ status }) => status);
    root.dataset.gctInvariantSafety = statuses.includes("fallback") ? "fallback" : statuses.includes("inactive") ? "partial" : "verified";
  };

  const scheduleInvariantPass = (generation, attempt) => {
    const schedule = typeof requestAnimationFrame === "function" ? requestAnimationFrame : (callback) => setTimeout(callback, 16);
    schedule(() => schedule(() => verifyNativeInvariants(generation, attempt)));
  };

  const scheduleInvariantVerification = () => {
    const generation = ++verificationGeneration;
    scheduleInvariantPass(generation, 0);
  };

  const ensureElements = () => {
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      (document.head ?? root).append(style);
    }
    if (style.dataset.bundleId !== bundleId || style.textContent !== cssText) {
      style.textContent = cssText;
      style.dataset.bundleId = bundleId;
    }
    let background = document.getElementById(BACKGROUND_ID);
    if (!background) {
      background = document.createElement("div");
      background.id = BACKGROUND_ID;
      background.setAttribute("aria-hidden", "true");
      (document.body ?? root).prepend(background);
    }
  };

  const removeBranding = () => {
    document.getElementById(SHELL_BRAND_ID)?.remove();
    document.getElementById(WORKSPACE_BRAND_ID)?.remove();
    document.querySelectorAll(`[${BRAND_HOST_ATTRIBUTE}]`).forEach((node) => node.removeAttribute(BRAND_HOST_ATTRIBUTE));
  };

  const ensureBrandImage = (id) => {
    let image = document.getElementById(id);
    if (!image) {
      image = document.createElement("img");
      image.id = id;
      image.alt = "";
      image.draggable = false;
      image.setAttribute("aria-hidden", "true");
      (document.body ?? root).append(image);
    }
    if (image.src !== brandLogoDataUrl) image.src = brandLogoDataUrl;
    return image;
  };

  const positionBrand = (image, { left, top, width, height }) => {
    const visible = width > 0 && height > 0 && left < innerWidth && top < innerHeight && left + width > 0 && top + height > 0;
    if (image.hidden === visible) image.hidden = !visible;
    if (!visible) return;
    const styles = {
      left: `${Math.round(left)}px`,
      top: `${Math.round(top)}px`,
      width: `${Math.round(width)}px`,
      height: `${Math.round(height)}px`,
    };
    for (const [property, value] of Object.entries(styles)) {
      if (image.style[property] !== value) image.style[property] = value;
    }
  };

  const syncBranding = () => {
    if (!brandLogoDataUrl) {
      removeBranding();
      return;
    }
    const modeButton = [...document.querySelectorAll('aside.app-shell-left-panel button[aria-haspopup="menu"]')]
      .find((button) => button.querySelector(":scope > span.truncate.font-openai-sans.font-semibold") && button.querySelector(":scope > svg"));
    const shellHost = modeButton?.querySelector(":scope > span.truncate.font-openai-sans.font-semibold") ?? null;
    document.querySelectorAll(`[${BRAND_HOST_ATTRIBUTE}="shell"]`).forEach((node) => {
      if (node !== shellHost) node.removeAttribute(BRAND_HOST_ATTRIBUTE);
    });
    const shellBrand = ensureBrandImage(SHELL_BRAND_ID);
    if (shellHost) {
      if (shellHost.getAttribute(BRAND_HOST_ATTRIBUTE) !== "shell") shellHost.setAttribute(BRAND_HOST_ATTRIBUTE, "shell");
      const rect = shellHost.getBoundingClientRect();
      positionBrand(shellBrand, rect);
    } else {
      shellBrand.hidden = true;
    }

    const workspaceHost = document.querySelector('[data-testid="home-icon"]');
    document.querySelectorAll(`[${BRAND_HOST_ATTRIBUTE}="workspace"]`).forEach((node) => {
      if (node !== workspaceHost) node.removeAttribute(BRAND_HOST_ATTRIBUTE);
    });
    const workspaceBrand = ensureBrandImage(WORKSPACE_BRAND_ID);
    if (workspaceHost) {
      if (workspaceHost.getAttribute(BRAND_HOST_ATTRIBUTE) !== "workspace") workspaceHost.setAttribute(BRAND_HOST_ATTRIBUTE, "workspace");
      const rect = workspaceHost.getBoundingClientRect();
      const width = Math.min(220, Math.max(148, innerWidth * 0.24));
      positionBrand(workspaceBrand, {
        left: rect.left + rect.width / 2 - width / 2,
        top: rect.top,
        width,
        height: rect.height,
      });
    } else {
      workspaceBrand.hidden = true;
    }
  };

  const ensure = () => {
    if (disposed || paused) return;
    ensureElements();
    syncRoute();
    tagComponents();
    baseline = captureNativeBaseline();
    for (const name of INVARIANT_SURFACES) setInvariantStatus(name, baseline[name].length ? "pending" : "inactive");
    root.dataset.gctInvariantSafety = "pending";
    if (!root.classList.contains("get-codex-theme-active")) root.classList.add("get-codex-theme-active");
    root.dataset.codexTheme = theme.id;
    setVariables();
    syncBranding();
    scheduleInvariantVerification();
  };

  const scheduleEnsure = () => {
    if (disposed || scheduledFrame !== null) return;
    scheduledKind = typeof requestAnimationFrame === "function" ? "frame" : "timeout";
    const schedule = scheduledKind === "frame" ? requestAnimationFrame : (callback) => setTimeout(callback, 16);
    scheduledFrame = schedule(() => {
      scheduledFrame = null;
      scheduledKind = null;
      ensure();
    });
  };

  const isEditorColorProbe = (node) => node?.nodeType === 1
    && node.tagName === "DIV"
    && !node.id
    && !node.className
    && node.childElementCount === 0
    && node.style.display === "none"
    && node.style.backgroundColor === "var(--color-token-editor-background)";
  const observer = new MutationObserver((records) => {
    const onlyColorProbes = records.length > 0 && records.every((record) => {
      if (record.type !== "childList" || record.target !== document.body) return false;
      const changed = [...record.addedNodes, ...record.removedNodes];
      return changed.length > 0 && changed.every(isEditorColorProbe);
    });
    if (!onlyColorProbes) scheduleEnsure();
  });
  const observe = () => {
    const nextRoot = document.body ?? root;
    if (observedRoot === nextRoot) return;
    observer.disconnect();
    observer.observe(nextRoot, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-current", "aria-pressed", "aria-disabled", "disabled", "data-state", "class"] });
    observedRoot = nextRoot;
  };
  const handleResize = () => scheduleEnsure();

  const removeVisuals = () => {
    observer.disconnect();
    observedRoot = null;
    globalThis.removeEventListener?.("resize", handleResize);
    verificationGeneration += 1;
    if (scheduledFrame !== null) {
      if (scheduledKind === "frame") globalThis.cancelAnimationFrame?.(scheduledFrame);
      else clearTimeout(scheduledFrame);
      scheduledFrame = null;
      scheduledKind = null;
    }
    document.getElementById(STYLE_ID)?.remove();
    document.getElementById(BACKGROUND_ID)?.remove();
    removeBranding();
    document.querySelectorAll(`.${HOME_CLASS}`).forEach((node) => node.classList.remove(HOME_CLASS));
    document.querySelectorAll(`.${HOME_SHELL_CLASS}`).forEach((node) => node.classList.remove(HOME_SHELL_CLASS));
    for (const node of markedComponents) node.removeAttribute?.(COMPONENT_ATTRIBUTE);
    markedComponents.clear();
    root.classList.remove("get-codex-theme-active");
    for (const attribute of [...root.attributes]) {
      if (["data-codex-theme", "data-gct-route", "data-gct-components", "data-gct-authoring-path", "data-gct-runtime-version", "data-gct-compatibility", "data-gct-invariant-safety"].includes(attribute.name) || attribute.name.startsWith("data-gct-invariant-")) root.removeAttribute(attribute.name);
    }
    for (const property of [...root.style]) if (property.startsWith("--gct-")) root.style.removeProperty(property);
  };

  const pause = () => {
    if (disposed) return false;
    paused = true;
    removeVisuals();
    menuController.ensure?.();
    return true;
  };
  const resume = () => {
    if (disposed) return false;
    paused = false;
    observe();
    globalThis.removeEventListener?.("resize", handleResize);
    globalThis.addEventListener?.("resize", handleResize, { passive: true });
    ensure();
    return true;
  };
  const cleanup = () => {
    disposed = true;
    removeVisuals();
    (globalThis[STATE_KEY]?.menuController ?? menuController).cleanup?.();
    if (globalThis[STATE_KEY]?.bundleId === bundleId) delete globalThis[STATE_KEY];
    return true;
  };

  ensure();
  observe();
  globalThis.addEventListener?.("resize", handleResize, { passive: true });
  globalThis[STATE_KEY] = {
    bundleId,
    themeId: theme.id,
    ensure,
    cleanup,
    pause,
    resume,
    observer,
    menuController,
    getInvariantStatus: () => structuredClone(invariantStatus),
  };
  return { installed: true, reused: false, themeId: theme.id, bundleId };
})(__GCT_CSS__, __GCT_THEME__, __GCT_ART__, __GCT_BRAND__, __GCT_BUNDLE__)
