import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { stopInstalledInjector } from "../runtime/macos-lifecycle.mjs";

test("macOS launcher finds every watcher without reading the full process table", async (t) => {
  const libraryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "gct-lifecycle-"));
  t.after(() => fs.rm(libraryRoot, { recursive: true, force: true }));
  const injectorPath = `${libraryRoot}/runtime/injector.mjs`;
  await fs.writeFile(path.join(libraryRoot, "runtime-state.json"), JSON.stringify({ injectorPid: 414 }));
  const commands = new Map([
    [410, `/opt/node ${injectorPath} --watch --port 9342 --library ${libraryRoot}`],
    [411, `/opt/node ${injectorPath} --once --port 9342 --library ${libraryRoot}`],
    [412, `/opt/node ${injectorPath} --watch --port 9342 --library /tmp/other-library`],
    [413, `/opt/node /tmp/other-runtime/injector.mjs --watch --port 9342 --library ${libraryRoot}`],
    [414, `/opt/node ${injectorPath} --watch --port 9343 --library ${libraryRoot}`],
  ]);
  const calls = [];
  const stopped = [];
  const runner = async (command, args) => {
    calls.push([command, args]);
    if (command === "/usr/bin/pgrep") return { code: 0, stdout: "410\n411\n412\n413\n414\n", stderr: "" };
    const pid = Number(args[1]);
    return { code: 0, stdout: commands.get(pid) ?? "", stderr: "" };
  };

  await stopInstalledInjector(libraryRoot, runner, async (pid) => stopped.push(pid));

  assert.deepEqual(stopped, [410, 414]);
  assert.equal(calls[0][0], "/usr/bin/pgrep");
  assert.equal(calls.some(([command, args]) => command === "/bin/ps" && args.includes("-axo")), false);
});
