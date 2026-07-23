# Changelog

## 0.4.0 — 2026-07-17

- Added an interactive authoring wizard with Assisted, Focused, and Complete
  paths, component selection, a pre-write summary, and safe cancellation.
- Added an explicit `--non-interactive` authoring contract for agents and CI;
  incomplete input now fails instead of silently choosing a path.
- Added bounded component tokens and coverage reporting across foundation,
  buttons, icons, forms, task artifacts, feedback, and utility routes.
- Connected component tokens to the shared runtime while preserving native
  layout, control positions, and reversible local delivery.
- Added a Codex-agent authoring guide and updated the creator Skill to keep
  theme creation separate from installation, launch, and live injection.

## 0.3.0 — 2026-07-17

- Added atomic live theme switching shared by CLI, Codex top menu, macOS menu
  bar, and Windows tray surfaces.
- Added `launch`, automatic loopback port selection, `doctor`, `pause`,
  `resume`, `verify --screenshot`, and safe `uninstall` commands.
- Added local PNG/JPEG/WebP palette extraction and `create-from-image` with
  accessible component tokens, responsive crops, safe-area detection, and no
  full-window overlay.
- Added the installable Get Codex Theme Plugin with separate creation and
  management Skills.
- Added opt-in Watchdog session recovery and an explicitly authorized macOS
  persistent mode that defers the current Codex instance.
- Added Node 22/24, macOS, Windows, npm consumer, Plugin contract, and strict
  theme-pack release checks.
- Prepared the first public `get-codex-theme` npm release with bundled runtime
  notices, immutable versioning, and trusted-publishing automation.
