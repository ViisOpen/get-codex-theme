---
name: manage-codex-theme
description: Install, list, switch, pause, resume, diagnose, visually verify, restore, or uninstall published and local release-candidate themes for Codex Desktop with the Get Codex Theme CLI. Use when a user asks to manage an existing Codex theme, test an exact local pack before publishing, troubleshoot why a theme is not active, capture a verification screenshot, enable the optional runtime, or return to the stock Codex appearance.
---

# Manage Codex Themes

Use the pinned public CLI so the commands match this Plugin release:

```bash
npx -y get-codex-theme@0.7.0 --help
```

## Safe workflow

1. Run `npx -y get-codex-theme@0.7.0 status --json` and
   `npx -y get-codex-theme@0.7.0 doctor --json` before changing runtime state.
   `doctor` is offline unless `--live` is explicitly supplied.
2. Install and select a published theme with
   `npx -y get-codex-theme@0.7.0 use THEME@VERSION`, or an exact local release
   candidate with `npx -y get-codex-theme@0.7.0 use PACK_DIRECTORY`. This does
   not launch, close, or restart Codex. For local QA, verify that `status --json`
   reports the same id and version as the source manifest.
3. If the compatibility runtime is already active, switch with
   `npx -y get-codex-theme@0.7.0 switch THEME`; the runtime applies the new
   pointer without moving native Codex controls.
4. Ask for explicit confirmation before running `launch`, `resume`, `--launch`,
   or `--restart`. State that these use an unofficial loopback-only CDP layer.
   Never infer restart permission from a request to install or switch a theme.
5. Verify with `npx -y get-codex-theme@0.7.0 verify`. Add
   `--screenshot ABSOLUTE_PATH.png` only when the user asked for a capture and
   the destination is known.
6. Use `pause` for a temporary stock appearance while retaining the selected
   theme. Use `restore` to restore the previous pointer (or remove the active
   pointer when none exists), then tell the user to reopen Codex normally for
   the definitive stock appearance. Use the platform restore command when a
   live compatibility session also needs to be stopped. Use `uninstall THEME`
   only after confirming it is not active; reserve `--force` for an explicit
   user request.
7. For pre-publish QA, require a clean demo workspace and inspect welcome
   branding, Home, a normal Task, sidebar menus, expanded terminal, Settings,
   banners and Dismiss actions, dialogs and Review actions, inputs,
   selected/disabled states, and a narrow window. Ask the user for visual
   confirmation; command success alone is not approval.
8. Test restore before declaring local QA complete. If the user wants to keep
   testing, reselect the exact local pack only after restore succeeds.

## Boundaries

- Never patch the signed Codex application or modify its bundle.
- Never expose CDP beyond `127.0.0.1` and never attach to an endpoint unless
  ownership checks identify Codex and its main renderer.
- Never read chats, credentials, model settings, account data, or unrelated
  ChatGPT processes.
- Treat macOS menu bar, Windows tray, and Watchdog as optional local controls.
  Watchdog is opt-in. Its default mode supervises only a user-started themed
  session. Ask for separate explicit confirmation before `watchdog enable
  --persistent`; persistent mode defers the current Codex instance and may
  restart a future normal launch once with loopback theme arguments.
- If a live command fails, preserve or restore the previous active theme and
  report the CLI output instead of repeatedly restarting Codex.
