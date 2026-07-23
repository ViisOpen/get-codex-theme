const SCHEMA_VERSION = 2;
const GROUPS = Object.freeze(["foundation", "buttons", "icons", "overlaysAndForms", "taskArtifacts", "feedback", "utilityRoutes"]);
const COLOR_PATTERN = /^(?:#[0-9a-fA-F]{6}|rgba?\([\d\s.,%]+\))$/;

const COLOR_KEYS = Object.freeze({
  foundation: ["surface", "surfaceElevated", "border", "focusRing"],
  buttons: ["primaryBackground", "primaryForeground", "secondaryBackground", "secondaryForeground", "hoverBackground", "destructiveBackground", "destructiveForeground"],
  icons: ["foreground", "muted", "accent", "danger", "containerBackground"],
  overlaysAndForms: ["background", "foreground", "muted", "border", "inputBackground", "focusRing", "selectedBackground"],
  taskArtifacts: ["background", "toolBackground", "codeBackground", "codeForeground", "terminalBackground", "diffAdded", "diffRemoved", "border"],
  feedback: ["success", "warning", "danger", "info", "badgeBackground", "loadingAccent"],
  utilityRoutes: ["background", "foreground", "muted", "activeBackground", "activeForeground", "hoverBackground", "border"],
});

function color(value, fallback, label) {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !COLOR_PATTERN.test(value.trim())) throw new Error(`${label} is not a supported CSS color.`);
  return value.trim();
}

function alpha(hex, opacity) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  const values = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
  return `rgba(${values[0]}, ${values[1]}, ${values[2]}, ${opacity})`;
}

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
}

function assertKnownKeys(value, allowed, label) {
  assertObject(value, label);
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new Error(`${label} contains unsupported field: ${key}`);
  }
}

export function deriveRuntimeComponents(palette) {
  const accent = palette.accent;
  const success = palette.success ?? accent;
  const warning = palette.warning ?? accent;
  const danger = palette.danger ?? accent;
  return {
    foundation: { surface: palette.surface, surfaceElevated: palette.surfaceElevated, border: palette.border, focusRing: palette.focusRing ?? accent },
    buttons: { disabledOpacity: 0.48, primaryBackground: palette.buttonBackground, primaryForeground: palette.buttonForeground, secondaryBackground: palette.surfaceElevated, secondaryForeground: palette.foreground, hoverBackground: alpha(accent, 0.14), destructiveBackground: danger, destructiveForeground: palette.buttonForeground },
    icons: { foreground: palette.foreground, muted: palette.muted, accent, danger, containerBackground: alpha(accent, 0.13) },
    overlaysAndForms: { background: palette.surfaceElevated, foreground: palette.foreground, muted: palette.muted, border: palette.border, inputBackground: palette.inputBackground, focusRing: palette.focusRing ?? accent, selectedBackground: alpha(accent, 0.14) },
    taskArtifacts: { background: palette.surface, toolBackground: palette.surfaceElevated, codeBackground: palette.codeBackground, codeForeground: palette.codeForeground, terminalBackground: palette.codeBackground, diffAdded: alpha(success, 0.2), diffRemoved: alpha(danger, 0.2), border: palette.border },
    feedback: { success, warning, danger, info: palette.secondary ?? accent, badgeBackground: alpha(accent, 0.14), loadingAccent: accent },
    utilityRoutes: { background: palette.surface, foreground: palette.foreground, muted: palette.muted, activeBackground: alpha(accent, 0.14), activeForeground: palette.foreground, hoverBackground: alpha(accent, 0.09), border: palette.border },
  };
}

export function normalizeRuntimeComponents(tokens, palette) {
  assertObject(tokens, "visual tokens");
  assertKnownKeys(tokens, ["schemaVersion", "componentSchemaVersion", "id", "mode", "palette", "layout", "uiTokens", "backgroundTreatment", "source", "accessibility", "authoring", "coverage", "components"], "visual tokens");
  if (tokens.schemaVersion !== SCHEMA_VERSION) throw new Error(`Unsupported visual token schemaVersion: ${tokens.schemaVersion}`);
  if (tokens.componentSchemaVersion !== SCHEMA_VERSION) throw new Error(`Unsupported componentSchemaVersion: ${tokens.componentSchemaVersion}`);
  if (!["focused", "complete", "assisted"].includes(tokens.authoring?.path)) throw new Error("visual tokens authoring.path is invalid");
  if (tokens.authoring?.fallback !== "adaptive") throw new Error("visual tokens authoring.fallback must equal adaptive");
  if (!["focused", "complete"].includes(tokens.coverage?.target)) throw new Error("visual tokens coverage.target is invalid");
  if (!Array.isArray(tokens.coverage?.enabled)) throw new Error("visual tokens coverage.enabled must be an array");
  if (tokens.coverage.enabled.some((group) => !GROUPS.includes(group))) throw new Error("visual tokens coverage.enabled contains an unsupported component group");
  if (new Set(tokens.coverage.enabled).size !== tokens.coverage.enabled.length) throw new Error("visual tokens coverage.enabled must not contain duplicates");
  const enabled = [...tokens.coverage.enabled];
  if (!enabled.includes("foundation")) throw new Error("visual tokens coverage.enabled must include foundation");
  assertKnownKeys(tokens.components, GROUPS, "visual tokens components");
  for (const group of Object.keys(tokens.components)) if (!enabled.includes(group)) throw new Error(`components.${group} is not enabled by coverage.enabled`);

  const merged = structuredClone(deriveRuntimeComponents(palette));
  for (const group of GROUPS) {
    const custom = tokens.components[group];
    if (custom === undefined) continue;
    const allowed = group === "buttons" ? [...COLOR_KEYS[group], "disabledOpacity"] : COLOR_KEYS[group];
    assertKnownKeys(custom, allowed, `components.${group}`);
    for (const key of COLOR_KEYS[group]) merged[group][key] = color(custom[key], merged[group][key], `components.${group}.${key}`);
    if (group === "buttons" && custom.disabledOpacity !== undefined) {
      const opacity = custom.disabledOpacity;
      if (typeof opacity !== "number" || !Number.isFinite(opacity) || opacity < 0.2 || opacity > 1) throw new Error("components.buttons.disabledOpacity must be between 0.2 and 1.");
      merged.buttons.disabledOpacity = opacity;
    }
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    path: tokens.authoring.path,
    target: tokens.coverage.target,
    enabled,
    values: merged,
  };
}

export const COMPONENT_GROUPS = GROUPS;
