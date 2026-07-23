#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function parseArguments(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index]?.replace(/^--/, "");
    const value = argv[index + 1];
    if (!key || value === undefined) throw new Error("Expected paired --key value arguments.");
    values[key] = value;
  }
  for (const key of ["output", "node", "watchdog", "library", "port", "restart-mode"]) {
    if (!values[key]) throw new Error(`Missing --${key}.`);
  }
  const port = Number(values.port);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Invalid port.");
  if (!['session', 'persistent'].includes(values["restart-mode"])) throw new Error("Invalid restart mode.");
  if (values["restart-mode"] === "persistent" && !values["launch-script"]) throw new Error("Persistent mode requires --launch-script.");
  return { ...values, port, persistent: values["restart-mode"] === "persistent" };
}

try {
  const options = parseArguments(process.argv.slice(2));
  const output = path.resolve(options.output);
  const persistenceArguments = options.persistent
    ? `\n    <string>--launch-script</string><string>${escapeXml(options["launch-script"])}</string>\n    <string>--allow-codex-restart</string>`
    : "";
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.getcodextheme.watchdog</string>
  <key>ProgramArguments</key><array>
    <string>${escapeXml(options.node)}</string><string>${escapeXml(options.watchdog)}</string>
    <string>--library</string><string>${escapeXml(options.library)}</string>
    <string>--port</string><string>${options.port}</string>
    ${persistenceArguments}
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><false/>
  <key>ProcessType</key><string>Background</string>
  <key>StandardOutPath</key><string>${escapeXml(path.join(options.library, "logs", "watchdog.log"))}</string>
  <key>StandardErrorPath</key><string>${escapeXml(path.join(options.library, "logs", "watchdog-error.log"))}</string>
</dict></plist>
`;
  await fs.mkdir(path.dirname(output), { recursive: true });
  const temporary = `${output}.${process.pid}.tmp`;
  await fs.writeFile(temporary, xml, { mode: 0o600 });
  await fs.rename(temporary, output);
} catch (error) {
  console.error(`[get-codex-theme] could not write watchdog LaunchAgent: ${error.message}`);
  process.exitCode = 1;
}
