import assert from "node:assert/strict";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import test from "node:test";

import {
  parseComponentSelection,
  runAuthoringWizard,
  validateAuthoringOptions,
} from "../src/authoring-wizard.mjs";
import { runCli } from "../src/index.mjs";

function memoryIo({ tty = false } = {}) {
  const stdin = { isTTY: tty };
  const stdout = { isTTY: tty, value: "", write(value) { this.value += value; } };
  const stderr = { value: "", write(value) { this.value += value; } };
  return { stdin, stdout, stderr };
}

function answerQueue(values) {
  const queue = [...values];
  return async () => queue.shift() ?? "";
}

test("component selection accepts numbers and names without duplicates", () => {
  assert.deepEqual(parseComponentSelection("1, icons, 1"), { components: ["buttons", "icons"], invalid: [] });
  assert.deepEqual(parseComponentSelection("buttons,unknown"), { components: ["buttons"], invalid: ["unknown"] });
});

test("focused wizard explains paths and collects a component multi-selection", async () => {
  let copy = "";
  const answers = await runAuthoringWizard({
    command: "create",
    id: "bright-tools",
    supplied: {},
    cwd: "/tmp/themes",
    ask: answerQueue(["Bright Tools", "2", "2", "1,2", ""]),
    write(value) { copy += value; },
  });
  assert.deepEqual(answers, {
    name: "Bright Tools",
    mode: "light",
    path: "focused",
    components: "buttons,icons",
    preset: undefined,
    imagePath: undefined,
    output: "/tmp/themes",
  });
  assert.match(copy, /Assisted \(recommended\).*safe defaults/s);
  assert.match(copy, /Focused.*only the component groups/s);
  assert.match(copy, /Complete.*every supported component group/s);
  assert.match(copy, /Creation summary:/);
  assert.match(copy, /Name: Bright Tools/);
  assert.match(copy, /Components: buttons,icons/);
  assert.match(copy, /Output: \/tmp\/themes/);
  assert.match(copy, /Codex app: Will not be modified/);
  assert.match(copy, /will not launch, restart, or inject Codex/i);
});

test("assisted wizard can hand an optional image to the existing image pipeline", async () => {
  const answers = await runAuthoringWizard({
    command: "create",
    id: "photo-theme",
    supplied: {},
    ask: answerQueue(["", "1", "1", "glass", "./art.png", "yes"]),
    write() {},
  });
  assert.equal(answers.name, "Photo Theme");
  assert.equal(answers.path, "assisted");
  assert.equal(answers.preset, "glass");
  assert.equal(answers.imagePath, "./art.png");
});

test("the wizard defaults to Assisted when the path answer is empty", async () => {
  const answers = await runAuthoringWizard({
    command: "create",
    id: "recommended-theme",
    supplied: {},
    ask: answerQueue(["", "", "", "", "", ""]),
    write() {},
  });
  assert.equal(answers.path, "assisted");
  assert.equal(answers.preset, "soft");
});

test("non-interactive authoring validation requires an explicit path and focused components", () => {
  assert.match(validateAuthoringOptions({}, { command: "create" }).message, /requires --path/);
  assert.match(validateAuthoringOptions({ path: "focused" }).message, /requires --components/);
  assert.match(validateAuthoringOptions({ path: "focused", components: "buttons,not-real" }).message, /Unknown component group/);
  assert.match(validateAuthoringOptions({ path: "complete", components: "buttons" }).message, /only valid with --path focused/);
  assert.equal(validateAuthoringOptions({ path: "focused", components: "buttons,icons" }).valid, true);
  assert.equal(validateAuthoringOptions({ path: "complete" }).valid, true);
  assert.equal(validateAuthoringOptions({ path: "assisted", preset: "soft" }).valid, true);
});

test("complete flags execute deterministically without invoking the wizard", async (t) => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "gct-authoring-flags-"));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const io = memoryIo();
  let wizardCalls = 0;
  const exitCode = await runCli([
    "create", "flag-theme", "--name", "Flag Theme", "--mode", "light",
    "--path", "focused", "--components", "buttons,icons", "--output", temp,
    "--non-interactive",
  ], io, { authoringWizard: async () => { wizardCalls += 1; throw new Error("wizard must not run"); } });
  assert.equal(exitCode, 0, io.stderr.value);
  assert.equal(wizardCalls, 0);
  const tokens = JSON.parse(await readFile(path.join(temp, "flag-theme/tokens/visual-theme.json"), "utf8"));
  assert.equal(tokens.authoring.path, "focused");
  assert.deepEqual(tokens.coverage.enabled, ["foundation", "buttons", "icons"]);
});

test("an interactive TTY invokes the wizard only when authoring flags are incomplete", async (t) => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "gct-authoring-wizard-"));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const io = memoryIo({ tty: true });
  let wizardCalls = 0;
  const exitCode = await runCli(["create", "wizard-theme"], io, {
    authoringWizard: async ({ command, id }) => {
      wizardCalls += 1;
      assert.equal(command, "create");
      assert.equal(id, "wizard-theme");
      return { name: "Wizard Theme", mode: "dark", path: "complete", output: temp };
    },
  });
  assert.equal(exitCode, 0, io.stderr.value);
  assert.equal(wizardCalls, 1);
  const tokens = JSON.parse(await readFile(path.join(temp, "wizard-theme/tokens/visual-theme.json"), "utf8"));
  assert.equal(tokens.coverage.target, "complete");
});

test("no TTY fails fast instead of silently selecting an authoring path", async (t) => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "gct-authoring-no-tty-"));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const io = memoryIo();
  const exitCode = await runCli(["create", "missing-flags", "--output", temp], io);
  assert.equal(exitCode, 1);
  assert.match(io.stderr.value, /No interactive terminal is available/);
  assert.match(io.stderr.value, /requires --path/);
  await assert.rejects(access(path.join(temp, "missing-flags")));
});

test("explicit non-interactive mode never prompts and reports the missing focused selection", async () => {
  const io = memoryIo({ tty: true });
  let wizardCalls = 0;
  const exitCode = await runCli(["create", "strict-theme", "--path", "focused", "--non-interactive"], io, {
    authoringWizard: async () => { wizardCalls += 1; return {}; },
  });
  assert.equal(exitCode, 1);
  assert.equal(wizardCalls, 0);
  assert.match(io.stderr.value, /Focused authoring requires --components/);
});

test("declining the interactive summary exits normally without creating a directory", async (t) => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "gct-authoring-cancel-"));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const io = memoryIo({ tty: true });
  const exitCode = await runCli(["create", "cancelled-theme", "--output", temp], io, {
    authoringWizard: (context) => runAuthoringWizard({
      ...context,
      ask: answerQueue(["Cancelled Theme", "1", "2", "1", "no"]),
      write(value) { io.stdout.write(value); },
    }),
  });
  assert.equal(exitCode, 0, io.stderr.value);
  assert.equal(io.stderr.value, "");
  assert.match(io.stdout.value, /Creation summary:/);
  assert.match(io.stdout.value, /Theme creation cancelled\. No files were written\./);
  await assert.rejects(access(path.join(temp, "cancelled-theme")));
});

test("create-from-image honors non-interactive after valued flags and never opens the wizard", async (t) => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "gct-authoring-image-flags-"));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const image = path.join(temp, "source.jpg");
  await sharp({ create: { width: 2560, height: 1440, channels: 3, background: "#3568D4" } }).jpeg().toFile(image);
  const io = memoryIo({ tty: true });
  let wizardCalls = 0;
  const exitCode = await runCli([
    "create-from-image", image, "image-flags", "--name", "Image Flags", "--mode", "dark",
    "--path", "assisted", "--preset", "sharp", "--output", temp, "--non-interactive",
  ], io, { authoringWizard: async () => { wizardCalls += 1; throw new Error("wizard must not run"); } });
  assert.equal(exitCode, 0, io.stderr.value);
  assert.equal(wizardCalls, 0);
  const tokens = JSON.parse(await readFile(path.join(temp, "image-flags/tokens/visual-theme.json"), "utf8"));
  assert.equal(tokens.authoring.source, "image");
  assert.equal(tokens.authoring.preset, "sharp");
});

test("create-from-image non-interactive mode fails before reading an image when --path is missing", async () => {
  const io = memoryIo({ tty: true });
  let wizardCalls = 0;
  const exitCode = await runCli([
    "create-from-image", "does-not-exist.png", "strict-image", "--non-interactive",
  ], io, { authoringWizard: async () => { wizardCalls += 1; return {}; } });
  assert.equal(exitCode, 1);
  assert.equal(wizardCalls, 0);
  assert.match(io.stderr.value, /Non-interactive create-from-image requires --path/);
  assert.doesNotMatch(io.stderr.value, /ENOENT|does-not-exist/);
});

test("help documents interactive detection and both non-interactive create contracts", async () => {
  const io = memoryIo();
  assert.equal(await runCli(["help"], io), 0);
  assert.match(io.stdout.value, /create <theme-id>.*--non-interactive/);
  assert.match(io.stdout.value, /create-from-image <image> <theme-id>.*--non-interactive/);
  assert.match(io.stdout.value, /stdin\s+and stdout are interactive terminals/);
});
