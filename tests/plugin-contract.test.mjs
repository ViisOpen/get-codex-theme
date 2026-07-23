import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const json = async (relative) => JSON.parse(await readFile(path.join(root, relative), "utf8"));

test("plugin marketplace, manifest, skills, and npm version stay aligned", async () => {
  const [plugin, marketplace, cliPackage, rootPackage, readme] = await Promise.all([
    json("plugins/get-codex-theme/.codex-plugin/plugin.json"),
    json(".agents/plugins/marketplace.json"),
    json("packages/theme-cli/package.json"),
    json("package.json"),
    readFile(path.join(root, "README.md"), "utf8"),
  ]);
  assert.equal(plugin.name, "get-codex-theme");
  assert.equal(plugin.version, cliPackage.version);
  assert.equal(plugin.version, rootPackage.version);
  assert.equal(plugin.skills, "./skills/");
  assert.ok(plugin.interface.capabilities.includes("Install"));
  assert.equal(marketplace.name, "get-codex-theme");
  const entry = marketplace.plugins.find(({ name }) => name === plugin.name);
  assert.equal(entry.source.path, "./plugins/get-codex-theme");
  assert.deepEqual(entry.policy, { installation: "AVAILABLE", authentication: "ON_INSTALL" });
  assert.match(readme, /codex plugin marketplace add ViisOpen\/get-codex-theme/);
  assert.match(readme, /codex plugin add get-codex-theme@get-codex-theme/);

  for (const skillName of ["create-codex-theme", "manage-codex-theme"]) {
    const skill = (await readFile(path.join(root, "plugins/get-codex-theme/skills", skillName, "SKILL.md"), "utf8")).replaceAll("\r\n", "\n");
    assert.match(skill, new RegExp(`^---\\nname: ${skillName}\\n`, "m"));
    assert.doesNotMatch(skill, /\[TODO|TODO:/i);
  }
  const manager = await readFile(path.join(root, "plugins/get-codex-theme/skills/manage-codex-theme/SKILL.md"), "utf8");
  assert.match(manager, new RegExp(`get-codex-theme@${plugin.version.replaceAll(".", "\\.")}`));
  for (const command of ["status", "doctor", "use", "switch", "pause", "resume", "verify", "restore", "uninstall"]) {
    assert.match(manager, new RegExp(`\\b${command}\\b`));
  }
});
