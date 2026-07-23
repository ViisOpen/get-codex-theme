import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const installer = path.resolve(import.meta.dirname, "../platforms/windows/install.ps1");

test("Windows runtime install stages, validates, and rolls back directory swaps", async () => {
  const source = await fs.readFile(installer, "utf8");
  assert.match(source, /\.runtime-install-/);
  assert.match(source, /node --check|& \$Node --check/);
  assert.match(source, /Move-Item[^\n]+runtime/i);
  assert.match(source, /catch \{/);
  assert.match(source, /Move-Item[^\n]+BackupRoot[^\n]+RuntimeDestination/i);
  assert.match(source, /Mutex/);
  assert.match(source, /PassThru/);
  assert.match(source, /backupRoot/);
  assert.doesNotMatch(source, /Copy-Item[^\n]+\$RuntimeDestination/);
});
