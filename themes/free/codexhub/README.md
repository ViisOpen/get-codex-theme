# Codex Hub

Codex Hub is an unofficial black, white, and orange visual theme for Codex
Desktop. It combines technical-grid artwork with high-contrast surfaces while
preserving Codex's native control geometry, ordering, spacing, and hit targets.

The included Home, Task, and narrow-window images are illustrative previews.
They contain generic demo content and are not captures of a personal workspace.

## Requirements

- Node.js 22 or newer.
- The official Codex Desktop application.
- macOS or Windows.

## Install and select the reviewed release

```bash
npx get-codex-theme@0.7.0 use codexhub@1.0.1
```

The command downloads the Registry archive, verifies its outer checksum and
packaged file checksums, installs the audited theme-only pack into the
Get Codex Theme library, and selects it atomically. It does not restart Codex.

## Verify the selected configuration

```bash
npx get-codex-theme@0.7.0 status --json
```

Confirm that `activeTheme.id` is `codexhub` and `activeTheme.version` is
`1.0.1`.

If the theme runtime is not already running, start it without forcing a Codex
restart:

```bash
npx get-codex-theme@0.7.0 launch
```

Only add `--restart` after saving active work and deliberately choosing to
restart Codex.

## Restore the previous selection

```bash
npx get-codex-theme@0.7.0 restore
```

The restore command changes the selected theme back to the previous state. A
running runtime observes the change automatically.

## What the pack configures

- Responsive 16:10, 16:9, and 4:3 background artwork.
- Dark surfaces, readable foreground and muted text, and orange focus/action
  states.
- Complete appearance tokens for foundation, buttons, icons, forms, task
  artifacts, feedback, and utility routes.
- A packaged Codex Hub brand mark for compatible preview and runtime surfaces.

The pack does not patch the signed Codex application, replace application
files, or take ownership of system application directories.
