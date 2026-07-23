import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("creator Skill defines a deterministic, offline agent contract", async () => {
  const skill = await fs.readFile(
    path.join(root, "plugins/get-codex-theme/skills/create-codex-theme/SKILL.md"),
    "utf8",
  );

  for (const heading of ["Goal", "Context", "Constraints", "Done when"]) {
    assert.match(skill, new RegExp(`\\*\\*${heading}\\*\\*`));
  }
  assert.match(skill, /--non-interactive/);
  assert.match(skill, /--path focused --components LIST/);
  assert.match(skill, /--path complete/);
  assert.match(skill, /create-from-image[^\n]+--path assisted/s);
  assert.match(skill, /With no component-path signal, use Assisted when a guided website prompt/);
  assert.match(skill, /Otherwise\s+ask the user to choose Focused, Complete, or Assisted/);
  assert.match(skill, /Before static validation passes, never run `install`, `use`, `apply`/);
  assert.match(skill, /On any nonzero exit/);
});

test("user docs keep human guidance separate from agent execution", async () => {
  const [gettingStarted, agentContract] = await Promise.all([
    fs.readFile(path.join(root, "docs/getting-started.md"), "utf8"),
    fs.readFile(path.join(root, "docs/agent-authoring.md"), "utf8"),
  ]);

  assert.match(gettingStarted, /Start a theme as a human author/);
  assert.match(gettingStarted, /Run the same workflow with a Codex agent/);
  assert.match(agentContract, /--non-interactive/);
  assert.match(agentContract, /## Validation sequence/);
  assert.match(agentContract, /## Failure handling/);
  assert.match(agentContract, /Ask in chat; do not run the CLI yet/);
  assert.match(agentContract, /It must not run `install`, `use`, `apply`/);
});
