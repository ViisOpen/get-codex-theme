import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { pruneRuntimeReleases } from "../platforms/macos/install-runtime.mjs";

test("runtime pruning keeps only current and previous releases", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "gct-runtime-prune-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  for (const name of ["runtime-current", "runtime-previous", "runtime-old", ".staging-failed", "notes"]) {
    await fs.mkdir(path.join(root, name));
  }
  const removed = await pruneRuntimeReleases(root, { keep: ["runtime-current", "runtime-previous"] });
  assert.deepEqual(removed, [".staging-failed", "runtime-old"]);
  assert.deepEqual((await fs.readdir(root)).sort(), ["notes", "runtime-current", "runtime-previous"]);
});
