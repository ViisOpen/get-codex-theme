#!/usr/bin/env node
import path from "node:path";
import { defaultLibraryRoot } from "./lib/theme-loader.mjs";
import { handleThemeControlAction } from "./lib/theme-state.mjs";

function parseArguments(argv) {
  const positional = [];
  let libraryRoot = defaultLibraryRoot();
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--library") {
      if (!argv[index + 1]) throw new Error("Missing path after --library.");
      libraryRoot = path.resolve(argv[++index]);
    } else {
      positional.push(argv[index]);
    }
  }
  return { command: positional[0] ?? "status", themeId: positional[1], libraryRoot };
}

function help() {
  console.log(`GetCodexTheme surface controller

Usage: node runtime/theme-control.mjs [--library PATH] <command>

Commands:
  status             Print installed themes and surface state as JSON
  switch THEME_ID    Select an installed theme and resume visuals
  pause              Temporarily hide theme visuals
  resume             Resume the selected theme
  stock              Legacy alias for pause; CDP remains active

This helper changes only GetCodexTheme's library files. A running companion
runtime observes those files and performs any live visual update. To remove the
DevTools/CDP session completely, quit the themed Codex session and reopen Codex
normally.`);
}

try {
  const options = parseArguments(process.argv.slice(2));
  if (["help", "--help", "-h"].includes(options.command)) {
    help();
  } else {
    const action = options.command === "switch"
      ? { version: 1, action: "switch", themeId: options.themeId }
      : { version: 1, action: options.command };
    const result = await handleThemeControlAction(action, { libraryRoot: options.libraryRoot });
    console.log(JSON.stringify(result, null, 2));
  }
} catch (error) {
  console.error(`[get-codex-theme] ${error.message}`);
  process.exitCode = 1;
}
