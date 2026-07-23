# Platform launchers

These scripts install and operate the companion runtime without changing Codex application files.

| Platform | Install | Start | Restore |
| --- | --- | --- | --- |
| macOS | `platforms/macos/install.sh` | `platforms/macos/start.sh` | `platforms/macos/restore.sh` |
| Windows | `platforms/windows/install.ps1` | `platforms/windows/start.ps1` | `platforms/windows/restore.ps1` |

Start launches the official Codex app with a loopback DevTools flag and keeps `runtime/injector.mjs --watch` running. On macOS, `start.sh` delegates to `runtime/macos-lifecycle.mjs`, which directly starts the verified app executable rather than relying on LaunchServices to forward Chromium flags. Restore removes the current renderer injection and stops only the watcher PID recorded by GetCodexTheme. It never edits the Codex bundle.

When no port is supplied, Start safely selects one: it reuses a valid recorded
port, prefers an already-running endpoint owned by Codex, or chooses a free port
in `9341-9441` on macOS or `9341-9399` on Windows. `--port` on macOS and `-Port` on Windows still allow an explicit
port. Restore reads the actual port from `runtime-state.json`, so it does not
assume the old fixed port.

The CLI is the preferred control surface:

```bash
get-codex-theme launch          # never restarts an existing normal session
get-codex-theme launch --restart
get-codex-theme pause           # keep the active selection
get-codex-theme resume
get-codex-theme doctor
get-codex-theme verify --screenshot ./theme-check.png
```

This is an unofficial compatibility layer. Themes applied this way are not registered in official Codex Settings → Appearance.

## macOS distribution

`install.sh` stages and validates a complete versioned runtime release, then
switches `current-runtime` while holding the same lifecycle lock used by Start.
Legacy `runtime`, `bin`, and `menu-bar` directories are migrated to stable
symlinks and retained below `backups/`; a failed validation or switch leaves the
working release in place.

## Switchers

- macOS: build the dependency-free AppKit app in `platforms/macos/menu-bar`.
  It can launch a new themed session, attach to an existing verified session,
  or ask before a normal restart when Codex is already open without CDP.
- Windows: run `platforms/windows/tray.ps1` for a Windows Forms tray icon.
- Codex renderer: the runtime mounts an independent Shadow DOM theme menu in
  the top bar area without changing native control positions.

The three surfaces use the same library controller. They can list and switch
installed themes, pause or resume visuals, and open the public gallery. Pause
is visual-only: the injector and loopback CDP session stay active until the
themed Codex session is quit and Codex is reopened normally. The Windows tray never launches, restarts, or injects
Codex directly. The macOS menu bar delegates launch requests to the verified
lifecycle controller and never force-quits Codex.

The optional macOS watchdog is explicitly enabled with
`watchdog-enable.sh`, bounded to three rapid recovery failures by default, and
removed with `watchdog-disable.sh`. It is not installed as a LaunchAgent by the
normal runtime installation. Add `--persistent` only after explicitly
authorizing recovery of future normally launched Codex instances; the current
instance is deferred until it exits.
