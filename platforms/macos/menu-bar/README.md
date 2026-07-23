# macOS menu bar switcher

The menu bar app is a small, dependency-free AppKit client for
`runtime/theme-control.mjs`. It lists valid installed themes, switches the
active pointer, pauses or resumes visuals, and opens the public gallery. Pause
does not close the injector or CDP session; reopen Codex normally for a complete
restore.

Build and open it after installing the companion runtime:

```bash
npx -y get-codex-theme menu-bar start
```

The app does not launch, restart, inspect, or inject Codex. A running companion
runtime observes the library state and applies changes. Quitting the menu bar
does not stop the runtime.

The default build destination is
`~/.codex/get-codex-theme/apps/GetCodexThemeMenu.app`. Builds are assembled in
a sibling staging bundle and moved into place only after compilation and any
requested signature verification succeeds. Set `GCT_CODESIGN_IDENTITY` when a
signed build is required.
