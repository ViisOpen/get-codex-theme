# Installation and restore model

Installers must keep themes in project-owned data directories:

- macOS: `~/.codex/get-codex-theme/themes/<id>`
- Windows: `%USERPROFILE%\.codex\get-codex-theme\themes\<id>`

Use sibling `active-theme.json` and `backups/` entries beneath
`.codex/get-codex-theme`. Never place a theme inside the signed Codex application
bundle.

## Safe activation sequence

1. Validate the manifest and all declared asset paths before copying.
2. Copy into a versioned temporary directory inside the destination filesystem.
3. Write a backup record containing the current active theme pointer and any
   project-owned compatibility state. Never back up or inspect chats or secrets.
4. Atomically rename the temporary directory to `themes/<id>`.
5. Atomically replace `active-theme.json` with `{ "id", "version",
   "activatedAt" }`.
6. Apply the compatible layer. Ask before restarting Codex if required.
7. Verify visible state and keep the previous backup until restoration succeeds.

The CLI keeps download/install and activation separate. `install` validates and
copies a pack without changing `active-theme.json`; `apply` (or its `switch`
alias) performs the active pointer backup and replacement. A running companion
runtime observes the atomic pointer change and switches without moving or
recreating native Codex controls.

Launching remains explicit:

```bash
get-codex-theme use aurora-glass --launch
get-codex-theme launch
```

Neither `install`, plain `use`, nor plain `apply` launches or terminates Codex.
If Codex is already open without its loopback debug endpoint, launch fails
closed. Passing `--restart` is the user's explicit authorization to close and
reopen Codex. When `use --launch` or `apply --launch` fails, the CLI restores the
previous active pointer while leaving the newly installed pack available.

The launcher reuses a recorded valid port, then looks for an existing verified
Codex endpoint, then chooses a free bounded platform port (macOS currently
`9341-9441`, Windows `9341-9399`). A listening port is not
trusted by itself: the platform launcher checks process ownership and requires
the main `app://-/index.html` Codex renderer before attaching.

## Pause, resume, and verification

`pause` removes GetCodexTheme visuals while preserving the selected theme. It
does not close the injector or loopback CDP session. `resume` restores that
selection. A complete return to a normal non-CDP session requires quitting the
themed Codex session and reopening Codex normally.
The shared `runtime-control.json` state is used by the CLI, the in-Codex switcher,
and platform surfaces, so each entry point has the same behavior.

```bash
get-codex-theme pause
get-codex-theme resume
get-codex-theme verify
get-codex-theme verify --screenshot ./codex-theme-check.png
get-codex-theme doctor
```

`doctor` validates Node.js, the platform launcher, the selected pack, runtime
files, pause state, and recorded watcher state without connecting to Codex.
`doctor --live` additionally verifies runtime markers in the Codex renderer.
`verify --screenshot` writes a new PNG with exclusive-create semantics; it
refuses non-loopback DevTools WebSocket endpoints and will not overwrite a file.

## Switchers and optional recovery

The macOS menu bar app, Windows tray, and Codex top menu use the same atomic
controller. They change only the selected pointer and pause state; they do not
move native Codex controls.

```bash
get-codex-theme menu-bar start
get-codex-theme tray start
get-codex-theme watchdog enable
```

Default Watchdog mode waits for a debug-enabled session and recovers only the
injector. `watchdog enable --persistent` is a separate macOS restart
authorization: it defers the current Codex process until it exits and may
restart a future normal launch once with loopback theme arguments. Both modes
are opt-in and removable with `watchdog disable`.

## Restore

Restore the most recent valid backup, remove the project-owned active pointer,
and remove only project-owned injected state. Leave Codex settings and unrelated
files untouched. Restoration must be idempotent: running it twice produces the
same clean result.

If activation fails, roll back the pointer and compatibility state before
returning a failure. Do not leave a half-copied pack active.

## Safe uninstall

`uninstall <theme-id>` removes only the validated theme directory owned by
GetCodexTheme. It refuses symlinks, mismatched manifests, and an active theme.
`uninstall <theme-id> --force` is an explicit request to pause visuals, remove
the active pointer, and then remove that pack. It does not delete the shared
runtime, other themes, Codex settings, chats, or application files.
