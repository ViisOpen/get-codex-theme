export const COMPONENT_SCHEMA_VERSION = 2;

export const COMPONENT_GROUPS = Object.freeze([
  "foundation",
  "buttons",
  "icons",
  "overlaysAndForms",
  "taskArtifacts",
  "feedback",
  "utilityRoutes",
]);

export const AUTHORING_PATHS = Object.freeze(["focused", "complete", "assisted"]);

const COLOR = "color";
const NUMBER = "number";

export const COMPONENT_TOKEN_SPEC = Object.freeze({
  foundation: Object.freeze({
    surface: [COLOR],
    surfaceElevated: [COLOR],
    border: [COLOR],
    focusRing: [COLOR],
  }),
  buttons: Object.freeze({
    disabledOpacity: [NUMBER, 0.2, 1],
    primaryBackground: [COLOR],
    primaryForeground: [COLOR],
    secondaryBackground: [COLOR],
    secondaryForeground: [COLOR],
    hoverBackground: [COLOR],
    destructiveBackground: [COLOR],
    destructiveForeground: [COLOR],
  }),
  icons: Object.freeze({
    foreground: [COLOR],
    muted: [COLOR],
    accent: [COLOR],
    danger: [COLOR],
    containerBackground: [COLOR],
  }),
  overlaysAndForms: Object.freeze({
    background: [COLOR],
    foreground: [COLOR],
    muted: [COLOR],
    border: [COLOR],
    inputBackground: [COLOR],
    focusRing: [COLOR],
    selectedBackground: [COLOR],
  }),
  taskArtifacts: Object.freeze({
    background: [COLOR],
    toolBackground: [COLOR],
    codeBackground: [COLOR],
    codeForeground: [COLOR],
    terminalBackground: [COLOR],
    diffAdded: [COLOR],
    diffRemoved: [COLOR],
    border: [COLOR],
  }),
  feedback: Object.freeze({
    success: [COLOR],
    warning: [COLOR],
    danger: [COLOR],
    info: [COLOR],
    badgeBackground: [COLOR],
    loadingAccent: [COLOR],
  }),
  utilityRoutes: Object.freeze({
    background: [COLOR],
    foreground: [COLOR],
    muted: [COLOR],
    activeBackground: [COLOR],
    activeForeground: [COLOR],
    hoverBackground: [COLOR],
    border: [COLOR],
  }),
});

const WEIGHTS = Object.freeze({
  foundation: 20,
  buttons: 15,
  icons: 10,
  overlaysAndForms: 15,
  taskArtifacts: 20,
  feedback: 10,
  utilityRoutes: 10,
});

const COLOR_RE = /^(#[0-9a-f]{6}|rgba?\([^\r\n]+\))$/i;

function withAlpha(color, alpha) {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return color;
  const rgb = [1, 3, 5].map((offset) => Number.parseInt(color.slice(offset, offset + 2), 16));
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

export function deriveComponentTokens(palette) {
  const accent = palette.accent;
  const secondary = palette.secondary ?? accent;
  const success = palette.success ?? accent;
  const warning = palette.warning ?? accent;
  const danger = palette.danger ?? accent;
  const focusRing = palette.focusRing ?? accent;
  return {
    foundation: {
      surface: palette.surface,
      surfaceElevated: palette.surfaceElevated,
      border: palette.border,
      focusRing,
    },
    buttons: {
      disabledOpacity: 0.48,
      primaryBackground: palette.buttonBackground,
      primaryForeground: palette.buttonForeground,
      secondaryBackground: palette.surfaceElevated,
      secondaryForeground: palette.foreground,
      hoverBackground: withAlpha(accent, 0.14),
      destructiveBackground: danger,
      destructiveForeground: palette.buttonForeground,
    },
    icons: {
      foreground: palette.foreground,
      muted: palette.muted,
      accent,
      danger,
      containerBackground: withAlpha(accent, 0.13),
    },
    overlaysAndForms: {
      background: palette.surfaceElevated,
      foreground: palette.foreground,
      muted: palette.muted,
      border: palette.border,
      inputBackground: palette.inputBackground,
      focusRing,
      selectedBackground: withAlpha(accent, 0.14),
    },
    taskArtifacts: {
      background: palette.surface,
      toolBackground: palette.surfaceElevated,
      codeBackground: palette.codeBackground,
      codeForeground: palette.codeForeground,
      terminalBackground: palette.codeBackground,
      diffAdded: withAlpha(success, 0.2),
      diffRemoved: withAlpha(danger, 0.2),
      border: palette.border,
    },
    feedback: {
      success,
      warning,
      danger,
      info: secondary,
      badgeBackground: withAlpha(accent, 0.14),
      loadingAccent: accent,
    },
    utilityRoutes: {
      background: palette.surface,
      foreground: palette.foreground,
      muted: palette.muted,
      activeBackground: withAlpha(accent, 0.14),
      activeForeground: palette.foreground,
      hoverBackground: withAlpha(accent, 0.09),
      border: palette.border,
    },
  };
}

function normalizeGroups(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((entry) => COMPONENT_GROUPS.includes(entry)))];
}

export function createComponentContract(palette, { path = "assisted", components, source = "manual", preset } = {}) {
  if (!AUTHORING_PATHS.includes(path)) throw new Error(`Unsupported authoring path: ${path}`);
  if (!["manual", "image", "brand"].includes(source)) throw new Error(`Unsupported authoring source: ${source}`);
  if (preset !== undefined && !["soft", "sharp", "bold", "glass"].includes(preset)) throw new Error(`Unsupported component preset: ${preset}`);
  const requested = normalizeGroups(typeof components === "string" ? components.split(",").map((item) => item.trim()) : components);
  const enabled = path === "focused"
    ? [...new Set(["foundation", ...requested.filter((group) => group !== "foundation")])]
    : [...COMPONENT_GROUPS];
  if (path === "focused" && enabled.length < 2) {
    throw new Error(`Focused themes must choose at least one component after foundation: ${COMPONENT_GROUPS.slice(1).join(", ")}`);
  }
  const derived = deriveComponentTokens(palette);
  return {
    schemaVersion: 2,
    componentSchemaVersion: COMPONENT_SCHEMA_VERSION,
    authoring: { path, fallback: "adaptive", source, ...(preset ? { preset } : {}) },
    coverage: {
      target: path === "focused" ? "focused" : "complete",
      enabled,
      customized: path === "assisted" ? [] : [...enabled],
      generated: path === "assisted" ? [...enabled] : [],
    },
    components: Object.fromEntries(enabled.map((group) => [group, derived[group]])),
  };
}

export function validateComponentContract(tokens, { requirePublicMinimum = false } = {}) {
  const errors = [];
  const warnings = [];
  rejectUnknownKeys(tokens, "visual tokens", ["schemaVersion", "componentSchemaVersion", "id", "mode", "palette", "layout", "uiTokens", "backgroundTreatment", "source", "accessibility", "authoring", "coverage", "components"], errors);
  rejectExecutableValues(tokens, "visual tokens", errors);
  if (tokens?.schemaVersion !== 2) errors.push("schemaVersion must equal 2");
  if (tokens?.componentSchemaVersion !== COMPONENT_SCHEMA_VERSION) errors.push(`componentSchemaVersion must equal ${COMPONENT_SCHEMA_VERSION}`);
  const path = tokens?.authoring?.path;
  if (!AUTHORING_PATHS.includes(path)) errors.push(`authoring.path must be one of: ${AUTHORING_PATHS.join(", ")}`);
  if (tokens?.authoring?.fallback !== "adaptive") errors.push("authoring.fallback must equal adaptive");
  rejectUnknownKeys(tokens?.authoring, "authoring", ["path", "fallback", "source", "preset"], errors);
  if (tokens?.authoring?.source !== undefined && !["manual", "image", "brand"].includes(tokens.authoring.source)) errors.push("authoring.source must be manual, image, or brand");
  if (tokens?.authoring?.preset !== undefined && !["soft", "sharp", "bold", "glass"].includes(tokens.authoring.preset)) errors.push("authoring.preset must be soft, sharp, bold, or glass");

  rejectUnknownKeys(tokens?.coverage, "coverage", ["target", "enabled", "customized", "generated"], errors);
  const target = tokens?.coverage?.target;
  if (!["focused", "complete"].includes(target)) errors.push("coverage.target must be focused or complete");
  const enabled = tokens?.coverage?.enabled;
  if (!Array.isArray(enabled) || enabled.length === 0) errors.push("coverage.enabled must be a non-empty component array");
  else {
    if (new Set(enabled).size !== enabled.length) errors.push("coverage.enabled must not contain duplicates");
    for (const group of enabled) if (!COMPONENT_GROUPS.includes(group)) errors.push(`coverage.enabled contains unsupported component: ${group}`);
  }

  rejectUnknownKeys(tokens?.components, "components", COMPONENT_GROUPS, errors);
  const componentObject = isObject(tokens?.components) ? tokens.components : {};
  for (const [group, values] of Object.entries(componentObject)) {
    if (!COMPONENT_GROUPS.includes(group)) continue;
    rejectUnknownKeys(values, `components.${group}`, Object.keys(COMPONENT_TOKEN_SPEC[group]), errors);
    if (!isObject(values)) continue;
    for (const [key, value] of Object.entries(values)) {
      const spec = COMPONENT_TOKEN_SPEC[group][key];
      if (!spec) continue;
      if (spec[0] === COLOR && (typeof value !== "string" || !COLOR_RE.test(value))) {
        errors.push(`components.${group}.${key} must be a safe color token`);
      }
      if (spec[0] === NUMBER && (typeof value !== "number" || !Number.isFinite(value) || value < spec[1] || value > spec[2])) {
        errors.push(`components.${group}.${key} must be between ${spec[1]} and ${spec[2]}`);
      }
    }
  }

  const enabledGroups = normalizeGroups(enabled);
  const customizedGroups = normalizeGroups(tokens?.coverage?.customized);
  const generatedGroups = normalizeGroups(tokens?.coverage?.generated);
  if (!Array.isArray(tokens?.coverage?.customized)) errors.push("coverage.customized must be an array");
  if (!Array.isArray(tokens?.coverage?.generated)) errors.push("coverage.generated must be an array");
  if (new Set(tokens?.coverage?.customized ?? []).size !== (tokens?.coverage?.customized ?? []).length) errors.push("coverage.customized must not contain duplicates");
  if (new Set(tokens?.coverage?.generated ?? []).size !== (tokens?.coverage?.generated ?? []).length) errors.push("coverage.generated must not contain duplicates");
  for (const group of customizedGroups) if (!enabledGroups.includes(group)) errors.push(`coverage.customized contains disabled component: ${group}`);
  for (const group of generatedGroups) if (!enabledGroups.includes(group)) errors.push(`coverage.generated contains disabled component: ${group}`);
  for (const group of customizedGroups) if (generatedGroups.includes(group)) errors.push(`component provenance overlaps for ${group}`);
  for (const group of enabledGroups) if (!customizedGroups.includes(group) && !generatedGroups.includes(group)) errors.push(`coverage must classify ${group} as customized or generated`);
  if (!enabledGroups.includes("foundation")) errors.push("coverage.enabled must include foundation");
  if (path === "focused" && enabledGroups.length < 2) errors.push("focused themes must enable at least one non-foundation component");
  if (path === "complete" || target === "complete") {
    for (const group of COMPONENT_GROUPS) {
      if (!enabledGroups.includes(group)) errors.push(`complete coverage must enable ${group}`);
      const values = componentObject[group];
      for (const key of Object.keys(COMPONENT_TOKEN_SPEC[group])) {
        if (!isObject(values) || values[key] === undefined) errors.push(`complete coverage requires components.${group}.${key}`);
      }
    }
  } else {
    for (const group of enabledGroups) {
      if (!isObject(componentObject[group]) || Object.keys(componentObject[group]).length === 0) {
        errors.push(`enabled component ${group} must contain at least one token`);
      }
      if (path === "focused") {
        for (const key of Object.keys(COMPONENT_TOKEN_SPEC[group])) {
          if (!isObject(componentObject[group]) || componentObject[group][key] === undefined) errors.push(`focused coverage requires components.${group}.${key}`);
        }
      }
    }
  }
  for (const group of Object.keys(componentObject)) {
    if (!enabledGroups.includes(group)) errors.push(`components.${group} is customized but not enabled in coverage.enabled`);
  }
  if (requirePublicMinimum && path !== "complete" && enabledGroups.length < 2) errors.push("public themes must enable foundation plus at least one component group");
  return { valid: errors.length === 0, errors, warnings, report: componentCoverageReport(tokens) };
}

export function componentCoverageReport(tokens) {
  const path = AUTHORING_PATHS.includes(tokens?.authoring?.path) ? tokens.authoring.path : "focused";
  const profile = tokens?.coverage?.target === "complete" ? "complete" : "focused";
  const enabled = normalizeGroups(tokens?.coverage?.enabled);
  const customized = normalizeGroups(tokens?.coverage?.customized);
  const generated = normalizeGroups(tokens?.coverage?.generated);
  const inherited = COMPONENT_GROUPS.filter((group) => !enabled.includes(group));
  const effectiveScore = enabled.reduce((total, group) => total + WEIGHTS[group], 0);
  const customScore = customized.reduce((total, group) => total + WEIGHTS[group], 0);
  return {
    profile,
    authoringPath: path,
    enabled,
    customized,
    generated,
    inherited,
    effectiveScore,
    customScore,
    complete: enabled.length === COMPONENT_GROUPS.length && COMPONENT_GROUPS.every((group) => enabled.includes(group)),
  };
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function rejectUnknownKeys(value, label, allowed, errors) {
  if (!isObject(value)) {
    errors.push(`${label} must be an object`);
    return;
  }
  for (const key of Object.keys(value)) if (!allowed.includes(key)) errors.push(`${label} contains unknown field: ${key}`);
}

function rejectExecutableValues(value, label, errors) {
  if (typeof value === "string") {
    if (/(?:url\s*\(|javascript:|@import|<\/?(?:script|style|svg|html)\b|[{}])/i.test(value)) errors.push(`${label} contains executable or raw styling syntax`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => rejectExecutableValues(item, `${label}[${index}]`, errors));
    return;
  }
  if (!isObject(value)) return;
  for (const [key, child] of Object.entries(value)) {
    if (/^(?:__proto__|prototype|constructor)$/i.test(key) || /(?:rawCss|html|javascript|selector|svgPath)/i.test(key)) errors.push(`${label} contains forbidden field: ${key}`);
    rejectExecutableValues(child, `${label}.${key}`, errors);
  }
}
