# Manifest reference

Use JSON Schema Draft 2020-12. The canonical repository schema lives at
`packages/theme-schema/manifest-v2.schema.json` for new Registry submissions.
The v1 schema remains install-compatible for existing packs.

## Identity and compatibility

- `schemaVersion`: integer `2` for publishing.
- `id`: lowercase kebab-case, stable across releases.
- `description`: factual 40–240 character public summary.
- `tagline`: distinct factual 12–100 character public heading.
- `designStory`: distinct grounded 120–1200 character design rationale.
- `version`: semantic `x.y.z` without a prerelease suffix.
- `mode`: `dark` or `light`.
- `platforms`: one or both of `macos`, `windows`.
- `delivery`: `native-if-supported` and/or `visual-cdp`.
- `unofficial`: always `true`.

## Palette

Provide all tokens: `accent`, `background`, `foreground`, `muted`, `surface`,
`surfaceElevated`, `border`, `codeBackground`, `codeForeground`,
`inputBackground`, `buttonBackground`, and `buttonForeground`. Use a six-digit
hex color or valid `rgb()`/`rgba()` string. Test readable contrast in Home, Task,
code, input, hover, disabled, and selected states.

## Layout

- `focusX`, `focusY`: percentage from 0 to 100.
- `overlayStrength`: number from 0 to 1.
- `contentSide`: `left`, `center`, or `right`; identify the safest primary text
  region rather than the subject position.

## Assets

Use relative paths contained inside the pack. Never allow absolute paths or `..`
segments. Reference all five backgrounds/previews, three rendered preview
states, and `tokens/visual-theme.json`. Standard public renders declare
`previewMetadata.kind: illustrative`, `previewMetadata.renderer: html-css`, the
pinned `rendererVersion`, and `assets.previewEvidence`.

When `previewMetadata.kind` is `verified-capture`, also declare
`assets.captureEvidence` as `screenshots/capture-evidence.json`. It must be
created by the native preview renderer and match every screenshot hash, route,
dimension, platform, Codex version, theme id, and theme version.
