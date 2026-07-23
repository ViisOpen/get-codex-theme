# GetCodexTheme companion runtime

This optional, open-source runtime makes installed GetCodexTheme packs visible in Codex Desktop. It launches Codex with a **loopback-only Chromium DevTools port**, injects responsive artwork and component-level color rules, then watches for renderer reloads.

It does not patch `app.asar`, modify the signed application, or add an entry to Codex **Settings → Appearance**. Quit the themed session and reopen Codex normally to close the DevTools port.

## Theme switcher surfaces

All switchers share `runtime/theme-control.mjs` and the same atomic library
state. The controller can be tested without opening or connecting to Codex:

```bash
node runtime/theme-control.mjs --library /path/to/library status
node runtime/theme-control.mjs --library /path/to/library switch aurora-glass
node runtime/theme-control.mjs --library /path/to/library pause
node runtime/theme-control.mjs --library /path/to/library resume
node runtime/theme-control.mjs --library /path/to/library stock # legacy pause alias
```

- The Codex top switcher is an isolated Shadow DOM surface. It is visually
  fixed in the top bar area and never inserts into, moves, or replaces native
  Codex controls. If its safe mount or CDP binding is unavailable, the theme
  continues and the menu reports that the controller is unavailable.
- The macOS menu bar client is built from `platforms/macos/menu-bar` with AppKit
  and no third-party dependencies. Its **Open Codex with Theme** action calls
  the same lifecycle controller as the CLI.
- The Windows tray client is `platforms/windows/tray.ps1` and uses built-in
  Windows Forms.

`pause` hides the visual layer but intentionally keeps the selected theme,
switcher, injector, and loopback DevTools/CDP session available; `resume`
reapplies it. The legacy `stock` command is only an alias for this visual pause
and is not presented as a full restore. Quit the themed Codex session and
reopen Codex normally to remove the CDP session. A switch writes
`active-theme.json` atomically, retains the previous pointer under `backups/`,
and resumes visuals. Broken installed packs are excluded from every switcher.

## Optional watchdog

`runtime/watchdog.mjs` waits for an already debug-enabled Codex endpoint and
supervises only the companion injector. In its default/session mode it does not
open, quit, or restart Codex, and it stops after a bounded number of repeated
injector failures.
It is disabled by default. On macOS, a user must explicitly run
`enable-watchdog-macos.sh`; `disable-watchdog-macos.sh` stops and removes the
per-user LaunchAgent. Regular `--watch` already handles renderer navigation and
reloads during one themed session; the watchdog only adds process recovery.
Passing `--persistent` is a separate restart authorization: the service defers
the currently running Codex instance, arms only after that instance exits, and
may restart a future normal launch with the loopback theme arguments. Rapid
restart failures are bounded and stop the service.

## Theme library contract

The default library is `~/.codex/get-codex-theme` on macOS and `%USERPROFILE%\.codex\get-codex-theme` on Windows:

```text
get-codex-theme/
├── active-theme.json       # "aurora-glass" or { "themeId": "aurora-glass" }
├── active-theme            # legacy plain-text pointer, also supported
└── themes/
    └── aurora-glass/
        ├── manifest.json
        ├── assets/background.jpg
        └── tokens/visual-theme.json  # required visual-token schema v2
```

`active-theme.json` takes precedence when both pointer formats exist. The loader rejects invalid IDs, paths escaping the theme directory, unsupported image types, unsafe CSS color strings, and backgrounds larger than 12 MB.

## Validate without Codex

```bash
node runtime/injector.mjs --validate --library /path/to/get-codex-theme
node runtime/injector.mjs --dry-run --library /path/to/get-codex-theme
```

Both commands are read-only and do not connect to Codex. `--dry-run` prints the resolved delivery plan, including `officialAppearance: false`.

## Component contract and native invariants

Runtime v4 requires `tokens/visual-theme.json` with visual-token schema v2. It
rejects old packs and former layout-contract fields. Its classifier marks known
native Codex controls with `data-gct-component`; authored packs cannot provide
DOM selectors, CSS, HTML, JavaScript, SVG paths, geometry, spacing, ordering,
shadows, or hit-target values. Component tokens are limited to safe colors and
bounded disabled opacity.

Sidebar, new-chat Suggestions, Composer, and Attachments are protected surfaces.
The runtime synchronously records the stock layout before activating theme CSS,
then compares position, size, order, spacing, border widths, radii, shadows,
pointer behavior, and center-point hit tests after two animation frames. The
tolerance is 1 CSS pixel. If one surface fails, only that surface loses component
styling and returns to native appearance; verified surfaces and the background
stay active. Verification never clicks a native control.

## Install and run

macOS:

```bash
platforms/macos/install.sh
~/.codex/get-codex-theme/bin/start-macos.sh
~/.codex/get-codex-theme/bin/restore-macos.sh
npx -y get-codex-theme menu-bar start
```

The macOS installer uses a validated, versioned runtime release and atomically
switches `current-runtime`; an interrupted upgrade does not leave `runtime`,
`bin`, and `menu-bar` on different versions.

Windows PowerShell:

```powershell
.\platforms\windows\install.ps1
& "$HOME\.codex\get-codex-theme\bin\start-windows.ps1"
& "$HOME\.codex\get-codex-theme\bin\restore-windows.ps1"
npx -y get-codex-theme tray start
```

The first themed start may require closing Codex, or passing `--restart` on macOS / `-Restart` on Windows. On macOS, the launcher directly starts the verified official executable, confirms that the process retained its loopback CDP arguments, and refuses to force-close a task-bearing Codex process. Node.js 22 or later is required. The Windows launcher expects the official `OpenAI.Codex` MSIX package and an Appx-capable PowerShell environment.

## Security and compatibility

- CDP is bound to `127.0.0.1`; do not expose the port or run untrusted local processes during a themed session.
- Every live target read and WebSocket connection verifies the current listener
  owner first. macOS resolves the app by bundle identifier and accepts only the
  signed `com.openai.codex` bundle with OpenAI team identifier `2DC432GLL2`
  (the current app may be named `ChatGPT.app`) or a process whose verified
  parent chain reaches that official main executable; Windows accepts only
  `ChatGPT.exe` inside the matching installed `OpenAI.Codex` Appx root.
  Ownership failure closes active runtime sessions before retrying. Live CDP
  operation fails closed on other platforms; offline pack validation remains
  platform-independent.
- The runtime distinguishes Home, Task, Scheduled, Plugins, Pull Requests, Chat,
  Search, and unknown routes without matching user-visible text. It keeps the
  native Codex information architecture and adapts only appearance on
  runtime-classified components. Codex UI updates may require selector-registry
  maintenance; invariant failure is reported per surface and fails safe.
- `background-size: cover` makes 16:10, 16:9 and other landscape images responsive. Narrow windows crop around the manifest's `focusX`/`focusY`; they do not stretch the image.
- Artwork is rendered at full color without a uniform full-window scrim. Readability comes from opaque or near-opaque component surfaces. When a validated, pack-contained logo is present, the runtime visually overlays it only on the existing top-left mode label and native Home logo slot. These decorative images use `pointer-events: none`, add no controls or hit targets, and are removed on pause or restore.
- Restore removes the injected DOM/CSS. Reopening Codex normally is the definitive rollback and closes the debug endpoint.
