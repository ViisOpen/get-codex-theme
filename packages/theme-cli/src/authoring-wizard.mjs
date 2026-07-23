import { createInterface } from "node:readline/promises";

import { AUTHORING_PATHS, COMPONENT_GROUPS } from "./component-contract.mjs";

export const COMPONENT_CHOICES = Object.freeze([
  { id: "buttons", label: "Buttons", description: "Primary, secondary, destructive, disabled, hover, and focus states." },
  { id: "icons", label: "Icons", description: "Icon color, emphasis, container, size, and stroke treatment." },
  { id: "overlaysAndForms", label: "Overlays & forms", description: "Dialogs, menus, tooltips, fields, selects, switches, and tabs." },
  { id: "taskArtifacts", label: "Task artifacts", description: "Messages, approvals, tool calls, files, code, diffs, terminals, and tables." },
  { id: "feedback", label: "Feedback", description: "Toasts, badges, progress, loading, warning, and error states." },
  { id: "utilityRoutes", label: "Utility routes", description: "Scheduled, Plugins, Pull Requests, Chat, Search, and supporting pages." },
]);

const PATH_CHOICES = Object.freeze([
  { id: "assisted", label: "Assisted (recommended)", description: "Generate safe defaults for every group from a palette or optional source image." },
  { id: "focused", label: "Focused", description: "Style only the component groups you select; everything else inherits adaptive defaults." },
  { id: "complete", label: "Complete", description: "Create tokens for every supported component group." },
]);

const PRESETS = Object.freeze(["soft", "sharp", "bold", "glass"]);

export class AuthoringCancelledError extends Error {
  constructor(message = "Theme creation cancelled. No files were written.") {
    super(message);
    this.name = "AuthoringCancelledError";
    this.code = "AUTHORING_CANCELLED";
  }
}

function titleFromId(id) {
  return id.split("-").filter(Boolean).map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
}

function answerOrDefault(answer, fallback) {
  const value = String(answer ?? "").trim();
  return value || fallback;
}

function parseChoice(answer, choices, fallback) {
  const value = answerOrDefault(answer, fallback).toLowerCase();
  const numeric = Number.parseInt(value, 10);
  if (String(numeric) === value && numeric >= 1 && numeric <= choices.length) return choices[numeric - 1].id;
  return choices.find((choice) => choice.id.toLowerCase() === value)?.id ?? null;
}

export function parseComponentSelection(answer) {
  const values = String(answer ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  if (!values.length) return { components: [], invalid: [] };
  const components = [];
  const invalid = [];
  for (const value of values) {
    const numeric = Number.parseInt(value, 10);
    const component = String(numeric) === value && numeric >= 1 && numeric <= COMPONENT_CHOICES.length
      ? COMPONENT_CHOICES[numeric - 1].id
      : COMPONENT_CHOICES.find((choice) => choice.id.toLowerCase() === value.toLowerCase())?.id;
    if (!component) invalid.push(value);
    else if (!components.includes(component)) components.push(component);
  }
  return { components, invalid };
}

export function validateAuthoringOptions(options, { command = "create" } = {}) {
  const path = typeof options.path === "string" ? options.path : "";
  if (!path) return { valid: false, message: `Non-interactive ${command} requires --path focused|complete|assisted.` };
  if (!AUTHORING_PATHS.includes(path)) return { valid: false, message: `--path must be one of: ${AUTHORING_PATHS.join(", ")}.` };

  const rawComponents = typeof options.components === "string"
    ? options.components.split(",").map((value) => value.trim()).filter(Boolean)
    : [];
  const supported = new Set(COMPONENT_GROUPS.slice(1));
  const invalid = rawComponents.filter((component) => !supported.has(component));
  if (invalid.length) return { valid: false, message: `Unknown component group${invalid.length === 1 ? "" : "s"}: ${invalid.join(", ")}. Run the interactive wizard or use: ${COMPONENT_GROUPS.slice(1).join(", ")}.` };
  if (path === "focused" && rawComponents.length === 0) {
    return { valid: false, message: `Focused authoring requires --components with one or more of: ${COMPONENT_GROUPS.slice(1).join(", ")}.` };
  }
  if (path !== "focused" && rawComponents.length) {
    return { valid: false, message: "--components is only valid with --path focused; Complete and Assisted already enable every component group." };
  }
  if (options.preset !== undefined && !PRESETS.includes(options.preset)) {
    return { valid: false, message: `--preset must be one of: ${PRESETS.join(", ")}.` };
  }
  return { valid: true };
}

export function hasCompleteAuthoringOptions(options, context) {
  return validateAuthoringOptions(options, context).valid;
}

export async function runAuthoringWizard({ command, id, supplied = {}, ask, write, cwd = process.cwd() }) {
  const output = write ?? (() => {});
  output("\nGet Codex Theme authoring wizard\n");
  output(`Theme: ${id}\n\n`);

  const name = supplied.name ?? answerOrDefault(await ask(`Display name [${titleFromId(id)}]: `), titleFromId(id));
  let mode = supplied.mode;
  while (!mode) {
    const answer = answerOrDefault(await ask("Color mode — 1) Dark  2) Light [1]: "), "1").toLowerCase();
    if (answer === "1" || answer === "dark") mode = "dark";
    else if (answer === "2" || answer === "light") mode = "light";
    else output("Choose 1/Dark or 2/Light.\n");
  }

  let authoringPath = supplied.path;
  if (!authoringPath) {
    output("\nChoose an authoring path:\n");
    PATH_CHOICES.forEach((choice, index) => output(`  ${index + 1}) ${choice.label} — ${choice.description}\n`));
    while (!authoringPath) {
      authoringPath = parseChoice(await ask("Authoring path [1]: "), PATH_CHOICES, "1");
      if (!authoringPath) output("Choose 1/Assisted, 2/Focused, or 3/Complete.\n");
    }
  }

  let components = supplied.components;
  if (authoringPath === "focused" && !components) {
    output("\nChoose one or more component groups (comma-separated numbers or names):\n");
    COMPONENT_CHOICES.forEach((choice, index) => output(`  ${index + 1}) ${choice.label} — ${choice.description}\n`));
    while (!components) {
      const parsed = parseComponentSelection(await ask("Components (example: 1,2): "));
      if (parsed.invalid.length) output(`Unknown selection: ${parsed.invalid.join(", ")}.\n`);
      else if (!parsed.components.length) output("Choose at least one component group.\n");
      else components = parsed.components.join(",");
    }
  }

  let preset = supplied.preset;
  if (authoringPath === "assisted" && !preset) {
    output("\nAssisted creates safe defaults for every component group. You can customize individual groups afterward.\n");
    while (!preset) {
      const value = answerOrDefault(await ask("Style preset — soft, sharp, bold, or glass [soft]: "), "soft").toLowerCase();
      if (PRESETS.includes(value)) preset = value;
      else output(`Choose one of: ${PRESETS.join(", ")}.\n`);
    }
  }

  let imagePath = command === "create-from-image" ? supplied.imagePath : undefined;
  if (command === "create" && authoringPath === "assisted") {
    const answer = String(await ask("Source image (optional; press Enter to use the generated palette): ") ?? "").trim();
    if (answer) imagePath = answer;
  }

  const outputDirectory = supplied.output ?? cwd;
  output("\nCreation summary:\n");
  output(`  Name: ${name}\n`);
  output(`  Mode: ${mode}\n`);
  output(`  Path: ${authoringPath}\n`);
  if (authoringPath === "focused") output(`  Components: ${components}\n`);
  else if (authoringPath === "complete") output("  Components: All supported groups\n");
  if (preset) output(`  Preset: ${preset}\n`);
  if (imagePath) output(`  Source image: ${imagePath}\n`);
  output(`  Output: ${outputDirectory}\n`);
  output("  Codex app: Will not be modified\n");
  output("\nThe CLI will create a theme draft only. It will not launch, restart, or inject Codex.\n");

  while (true) {
    const confirmation = answerOrDefault(await ask("Create theme? [Y/n]: "), "y").toLowerCase();
    if (confirmation === "y" || confirmation === "yes") break;
    if (confirmation === "n" || confirmation === "no") throw new AuthoringCancelledError();
    output("Answer Y/Yes to create the draft, or N/No to cancel.\n");
  }
  output("\n");
  return { name, mode, path: authoringPath, components, preset, imagePath, output: outputDirectory };
}

export async function promptForAuthoring(context, { input = process.stdin, output = process.stdout } = {}) {
  const readline = createInterface({ input, output });
  try {
    return await runAuthoringWizard({
      ...context,
      ask: (question) => readline.question(question),
      write: (value) => output.write(value),
    });
  } finally {
    readline.close();
  }
}
