import test from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import {
  assertLoopbackWebSocket,
  assertSupportedLivePlatform,
  findMacCodexApp,
  listOwnedCodexTargets,
  ownedCodexEndpointReady,
  verifyCodexCdpOwner,
} from "../runtime/lib/cdp-owner.mjs";

function macRunner({
  executable = "/Applications/ChatGPT.app/Contents/MacOS/ChatGPT",
  listener = "p4242\nf21\nn127.0.0.1:9341\n",
  bundleIdentifier = "com.openai.codex",
  declaredExecutable = pathFromExecutable(executable),
  teamIdentifier = "2DC432GLL2",
} = {}) {
  return async (command, args) => {
    if (command === "/usr/sbin/lsof") {
      assert.deepEqual(args, ["-nP", "-a", "-iTCP@127.0.0.1:9341", "-sTCP:LISTEN", "-Fpfn"]);
      return { code: 0, stdout: listener, stderr: "" };
    }
    if (command === "/usr/bin/mdfind") {
      assert.deepEqual(args, ["kMDItemCFBundleIdentifier == 'com.openai.codex'"]);
      return { code: 0, stdout: "/Applications/ChatGPT.app\n", stderr: "" };
    }
    if (command === "/bin/ps") {
      assert.equal(args[0], "-p");
      assert.equal(args[2], "-o");
      assert.equal(args[3], "pid=,ppid=,comm=");
      const pid = Number(args[1]);
      if (pid === 4242) return { code: 0, stdout: `4242 1 ${executable}\n`, stderr: "" };
      return { code: 0, stdout: `${pid} 4242 ${executable.replace(/\/[^/]+$/, "/ChatGPT Helper")}\n`, stderr: "" };
    }
    if (command === "/usr/bin/plutil") {
      if (args[1] === "CFBundleIdentifier") return { code: 0, stdout: `${bundleIdentifier}\n`, stderr: "" };
      if (args[1] === "CFBundleExecutable") return { code: 0, stdout: `${declaredExecutable}\n`, stderr: "" };
    }
    if (command === "/usr/bin/codesign") {
      if (args[0] === "--verify") return { code: 0, stdout: "", stderr: "" };
      return { code: 0, stdout: "", stderr: `Identifier=${bundleIdentifier}\nTeamIdentifier=${teamIdentifier}\n` };
    }
    throw new Error(`Unexpected command: ${command}`);
  };
}

function pathFromExecutable(executable) {
  return executable.split("/").at(-1);
}

function windowsRunner(owner) {
  return async (command, args) => {
    assert.equal(command, "powershell.exe");
    assert.deepEqual(args.slice(0, 5), ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command"]);
    assert.match(args[5], /Get-NetTCPConnection/);
    assert.match(args[5], /Get-AppxPackage OpenAI\.Codex/);
    assert.equal(args.length, 6);
    assert.match(args[5], /\$port = 9341/);
    assert.doesNotMatch(args[5], /\$args\[0\]/);
    return { code: 0, stdout: JSON.stringify(owner), stderr: "" };
  };
}

test("macOS ownership accepts the signed com.openai.codex bundle independent of app filename", async () => {
  const owner = await verifyCodexCdpOwner({ port: 9341, platform: "darwin", runner: macRunner() });
  assert.deepEqual(owner, {
    verified: true,
    platform: "darwin",
    port: 9341,
    pid: 4242,
    appBundlePath: "/Applications/ChatGPT.app",
    bundleIdentifier: "com.openai.codex",
    teamIdentifier: "2DC432GLL2",
    executablePath: "/Applications/ChatGPT.app/Contents/MacOS/ChatGPT",
  });
  assert.equal((await verifyCodexCdpOwner({
    port: 9341,
    platform: "darwin",
    runner: macRunner({ executable: "/Applications/Codex.app/Contents/MacOS/Codex" }),
  })).appBundlePath, "/Applications/Codex.app");
  await assert.rejects(
    verifyCodexCdpOwner({ port: 9341, platform: "darwin", runner: macRunner({ bundleIdentifier: "com.openai.chat" }) }),
    /expected com\.openai\.codex/,
  );
  const multiListenerOwner = await verifyCodexCdpOwner({
    port: 9341,
    platform: "darwin",
    runner: macRunner({ listener: "p4242\nf21\nn127.0.0.1:9341\np4343\nf22\nn127.0.0.1:9341\n" }),
  });
  assert.deepEqual(multiListenerOwner.listenerPids, [4242, 4343]);
  await assert.rejects(
    verifyCodexCdpOwner({ port: 9341, platform: "darwin", runner: macRunner({ listener: "p4242\nf21\nn*:9341\n" }) }),
    /not bound exactly to 127\.0\.0\.1/,
  );
  await assert.rejects(
    verifyCodexCdpOwner({ port: 9341, platform: "darwin", runner: macRunner({ teamIdentifier: "ATTACKER123" }) }),
    /code-signing identity/,
  );
});

test("macOS app discovery resolves and verifies by bundle identifier", async () => {
  const identity = await findMacCodexApp({ runner: macRunner() });
  assert.deepEqual(identity, {
    appBundlePath: "/Applications/ChatGPT.app",
    bundleIdentifier: "com.openai.codex",
    teamIdentifier: "2DC432GLL2",
    executablePath: "/Applications/ChatGPT.app/Contents/MacOS/ChatGPT",
  });
  const fallbackRunner = macRunner();
  const withoutSpotlight = await findMacCodexApp({
    runner: async (command, args, options) => command === "/usr/bin/mdfind"
      ? { code: 1, stdout: "", stderr: "Spotlight disabled" }
      : fallbackRunner(command, args, options),
  });
  assert.equal(withoutSpotlight.appBundlePath, "/Applications/ChatGPT.app");
});

test("Windows ownership requires ChatGPT.exe inside the matching OpenAI.Codex Appx root", async () => {
  const valid = {
    pid: 5151,
    executablePath: "C:\\Program Files\\WindowsApps\\OpenAI.Codex_2.0.0.0_x64__abc\\app\\ChatGPT.exe",
    packageRoot: "C:\\Program Files\\WindowsApps\\OpenAI.Codex_2.0.0.0_x64__abc",
  };
  const owner = await verifyCodexCdpOwner({ port: 9341, platform: "win32", runner: windowsRunner(valid) });
  assert.equal(owner.pid, 5151);
  assert.equal(owner.executablePath, valid.executablePath);

  await assert.rejects(
    verifyCodexCdpOwner({
      port: 9341,
      platform: "win32",
      runner: windowsRunner({ ...valid, executablePath: "C:\\Temp\\ChatGPT.exe" }),
    }),
    /not ChatGPT\.exe inside the OpenAI\.Codex Appx package/,
  );
  await assert.rejects(
    verifyCodexCdpOwner({
      port: 9341,
      platform: "win32",
      runner: windowsRunner({ ...valid, executablePath: valid.executablePath.replace("ChatGPT.exe", "helper.exe") }),
    }),
    /not ChatGPT\.exe inside/,
  );
});

test("unsupported live platforms fail before any ownership command", async () => {
  let called = false;
  const runner = async () => { called = true; return { code: 0, stdout: "", stderr: "" }; };
  assert.throws(() => assertSupportedLivePlatform("linux"), /only on macOS and Windows/);
  await assert.rejects(verifyCodexCdpOwner({ port: 9341, platform: "linux", runner }), /only on macOS and Windows/);
  assert.equal(called, false);
});

test("target discovery verifies ownership before fetching and filters to the main Codex renderer", async () => {
  const calls = [];
  const targets = await listOwnedCodexTargets(9341, {
    platform: "darwin",
    runner: macRunner(),
    fetchImpl: async (url) => {
      calls.push(url);
      return {
        ok: true,
        async json() {
          return [
            { type: "page", url: "app://-/index.html", webSocketDebuggerUrl: "ws://127.0.0.1:9341/devtools/page/main" },
            { type: "page", url: "app://-/index.html?initialRoute=settings", webSocketDebuggerUrl: "ws://127.0.0.1:9341/devtools/page/settings" },
            { type: "page", url: "https://example.com", webSocketDebuggerUrl: "ws://127.0.0.1:9341/devtools/page/web" },
          ];
        },
      };
    },
  });
  assert.deepEqual(calls, ["http://127.0.0.1:9341/json/list"]);
  assert.equal(targets.length, 1);
  assert.equal(targets[0].url, "app://-/index.html");

  let fetched = false;
  const ready = await ownedCodexEndpointReady(9341, {
    platform: "darwin",
    runner: macRunner({ bundleIdentifier: "com.example.not-codex" }),
    fetchImpl: async () => { fetched = true; throw new Error("must not fetch"); },
  });
  assert.equal(ready, false);
  assert.equal(fetched, false);
});

test("WebSocket targets must remain loopback and on the verified port", () => {
  assert.equal(assertLoopbackWebSocket("ws://127.0.0.1:9341/devtools/page/1", 9341).port, "9341");
  assert.throws(() => assertLoopbackWebSocket("ws://127.0.0.1:9555/devtools/page/1", 9341), /outside the verified CDP port/);
  assert.throws(() => assertLoopbackWebSocket("ws://example.com:9341/devtools/page/1", 9341), /non-loopback/);
});

test("Windows PowerShell ownership probe receives the verified port", { skip: process.platform !== "win32" }, async (t) => {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  t.after(() => server.close());
  const address = server.address();
  assert.equal(typeof address, "object");
  const port = address.port;
  await assert.rejects(
    verifyCodexCdpOwner({ port, platform: "win32" }),
    (error) => {
      assert.doesNotMatch(error.message, /LocalPort 0|port 0/i);
      assert.match(error.message, /OpenAI\.Codex|identify the CDP listener|Appx/i);
      return true;
    },
  );
});
