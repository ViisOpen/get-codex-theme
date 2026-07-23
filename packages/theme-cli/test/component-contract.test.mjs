import assert from "node:assert/strict";
import test from "node:test";
import {
  COMPONENT_GROUPS,
  componentCoverageReport,
  createComponentContract,
  deriveComponentTokens,
  validateComponentContract,
} from "../src/component-contract.mjs";

const palette = {
  accent: "#6D5EF8", secondary: "#22A5A1", success: "#218A55", warning: "#A86600", danger: "#B52C3B", focusRing: "#6D5EF8",
  background: "#101117", foreground: "#F6F4FF", muted: "#B6B1C8", surface: "rgba(20, 21, 30, 0.88)", surfaceElevated: "rgba(29, 30, 42, 0.95)", border: "rgba(246, 244, 255, 0.14)",
  codeBackground: "rgba(8, 9, 14, 0.94)", codeForeground: "#F6F4FF", inputBackground: "rgba(25, 26, 37, 0.94)", buttonBackground: "#6D5EF8", buttonForeground: "#FFFFFF",
};

test("assisted authoring derives a complete appearance-only v2 profile", () => {
  const contract = createComponentContract(palette, { path: "assisted" });
  const result = validateComponentContract(contract);
  assert.equal(result.valid, true, result.errors.join(", "));
  assert.equal(contract.schemaVersion, 2);
  assert.equal(contract.componentSchemaVersion, 2);
  assert.deepEqual(contract.coverage.enabled, COMPONENT_GROUPS);
  assert.equal(result.report.effectiveScore, 100);
  assert.equal(contract.components.foundation.surface, palette.surface);
  assert.equal(contract.components.buttons.primaryBackground, palette.buttonBackground);
  assert.equal(contract.components.taskArtifacts.codeBackground, palette.codeBackground);
  assert.equal("layoutContracts" in contract, false);
});

test("focused authoring enables only foundation and selected groups", () => {
  const contract = createComponentContract(palette, { path: "focused", components: "buttons,icons" });
  const result = validateComponentContract(contract);
  assert.equal(result.valid, true, result.errors.join(", "));
  assert.deepEqual(result.report.enabled, ["foundation", "buttons", "icons"]);
  assert.equal(result.report.effectiveScore, 45);
  assert.deepEqual(Object.keys(contract.components), ["foundation", "buttons", "icons"]);
});

test("presets remain visual metadata and never generate geometry", () => {
  const sharp = createComponentContract(palette, { path: "assisted", source: "image", preset: "sharp" });
  const glass = createComponentContract(palette, { path: "assisted", source: "image", preset: "glass" });
  assert.equal(sharp.authoring.source, "image");
  assert.equal(sharp.authoring.preset, "sharp");
  assert.deepEqual(sharp.components, glass.components);
  assert.doesNotMatch(JSON.stringify(sharp.components), /radius|width|height|size|strokeWidth|shadow|position|transform|padding|margin/i);
});

test("v2 rejects v1 tokens and every former layout contract", () => {
  const v1 = createComponentContract(palette, { path: "assisted" });
  v1.schemaVersion = 1;
  v1.componentSchemaVersion = 1;
  v1.layoutContractSchemaVersion = 1;
  v1.layoutContracts = { composerLayout: { preset: "floating" } };
  const result = validateComponentContract(v1);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("schemaVersion must equal 2"));
  assert.ok(result.errors.includes("componentSchemaVersion must equal 2"));
  assert.ok(result.errors.some((error) => error.includes("unknown field: layoutContracts")));
  assert.ok(result.errors.some((error) => error.includes("unknown field: layoutContractSchemaVersion")));
});

test("complete authoring rejects missing component states", () => {
  const contract = createComponentContract(palette, { path: "complete" });
  delete contract.components.buttons.disabledOpacity;
  const result = validateComponentContract(contract);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("complete coverage requires components.buttons.disabledOpacity"));
});

test("focused authoring requires every state inside a selected group", () => {
  const contract = createComponentContract(palette, { path: "focused", components: "buttons" });
  delete contract.components.buttons.disabledOpacity;
  const result = validateComponentContract(contract);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("focused coverage requires components.buttons.disabledOpacity"));
});

test("component tokens reject raw CSS, unknown groups, and geometry fields", () => {
  const contract = createComponentContract(palette, { path: "focused", components: "buttons" });
  contract.components.buttons.primaryBackground = "red; background: url(https://example.invalid)";
  contract.components.buttons.radius = 10;
  contract.components.rawCss = { selector: "button" };
  const result = validateComponentContract(contract);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("safe color")));
  assert.ok(result.errors.some((error) => error.includes("components.buttons contains unknown field: radius")));
  assert.ok(result.errors.some((error) => error.includes("unknown field: rawCss")));
});

test("coverage reporting has no legacy fallback path", () => {
  const contract = createComponentContract(palette, { path: "assisted" });
  const report = componentCoverageReport(contract);
  assert.equal(report.authoringPath, "assisted");
  assert.equal(report.complete, true);
  assert.deepEqual(report.customized, []);
  assert.deepEqual(report.generated, COMPONENT_GROUPS);
  assert.deepEqual(Object.keys(deriveComponentTokens(palette)), COMPONENT_GROUPS);
  const legacy = validateComponentContract({ schemaVersion: 1, palette, layout: {} });
  assert.equal(legacy.valid, false);
  assert.ok(legacy.errors.includes("schemaVersion must equal 2"));
});
