# Theme pack specification: manifest v1/v2 + visual tokens v2

## Goals

The pack format is cross-platform, inspectable, reversible, and independent from a
particular website. A pack describes visual intent and assets; it does not grant
itself permission to modify an application.

## Layout

```text
theme-id/
├── manifest.json
├── assets/
│   ├── background.jpg
│   ├── background-16x9.jpg
│   ├── background-4x3.jpg
│   └── preview.jpg
├── screenshots/
│   ├── home.jpg
│   ├── task.jpg
│   ├── narrow.jpg
│   ├── preview-evidence.json  # required for publishing HTML/CSS previews
│   └── capture-evidence.json  # required only for verified native captures
├── tokens/
│   └── visual-theme.json
└── LICENSE-ASSETS.txt
```

`background.jpg` is the canonical 16:10 image and fallback. The other crops
prevent destructive runtime stretching. During authoring, `EXPECTED_FILES.md`
may document missing assets; it is not valid in place of production files.

## Manifest

Install-compatible v1 is defined by
[`packages/theme-schema/manifest.schema.json`](../packages/theme-schema/manifest.schema.json).
New Registry publishing uses
[`packages/theme-schema/manifest-v2.schema.json`](../packages/theme-schema/manifest-v2.schema.json).
Required groups are:

- Identity: `schemaVersion`, `id`, `name`, `description`, `version`.
- Author presentation in publishing v2: a distinct short `tagline`, a factual
  `designStory`, and two to twelve normalized tags. Placeholder/default copy,
  duplicated fields, unsafe markup, and misleading official-affiliation claims
  fail publishing validation.
- Compatibility: `mode`, `platforms`, `delivery`, `unofficial`.
- Styling: all `palette` tokens and `layout` focus/overlay values.
- Files: every `assets` path contained inside the pack.
- Preview provenance: `previewMetadata` distinguishes illustrative concepts
  and deterministic `html-css` renders from captures verified against a
  recorded Codex version and platform.
- Rights: a concise `license` identifier plus detailed `LICENSE-ASSETS.txt`.

The required `tokens/visual-theme.json` uses `schemaVersion: 2` and
`componentSchemaVersion: 2`. It mirrors the manifest's identity, mode, palette,
and artwork-framing `layout`, then records the appearance-only component contract
described in [`component-authoring.md`](component-authoring.md).

Visual token v2 is a deliberate format break. The CLI and runtime reject older
token files rather than deriving compatibility defaults. It also rejects former
layout-contract fields and geometry such as radius, width, height, padding,
margin, position, transform, order, icon size, stroke width, and shadow.
`layout.focusX`, `layout.focusY`, and `layout.contentSide` frame background
artwork only; they never move Codex controls. A `brandLogo` asset may be retained
for website previews, but the runtime does not insert it into native Codex UI.
Verified native packs additionally declare `assets.captureEvidence`; the file
binds the three screenshots to their hashes, dimensions, native routes,
platform, Codex version, theme version, and renderer contract.

The required palette remains intentionally compact. Brand packs may additionally
declare `secondary`, `success`, `warning`, `danger`, and `focusRing`. These are
semantic component roles rather than decorative colors; compatible runtimes fall
back to `accent` when a role is omitted.

`overlayStrength` is a compatibility hint for previews and older runtimes. A
runtime should prefer readable component surfaces over a uniform full-window
scrim, so artwork remains visible and brand color is not washed out.

## HTML/CSS preview renderer

The standard public preview is a deterministic HTML/CSS simulation. It reads
only `manifest.json`, visual-token v2, and the declared background/brand assets.
It renders fixed demo content in an isolated headless browser and never opens
Codex, enumerates tasks, or reads chat/account/workspace data.

The shared renderer owns geometry for Sidebar, Suggestions, Composer, image
upload, send controls, task artifacts, and narrow-window reflow. Theme packs
provide appearance tokens only, so a theme cannot move or enlarge these
controls. Home is 1200×750, Task is 1200×750, and narrow is 750×1000. Generated
packs use `previewMetadata.kind: illustrative`, `renderer: html-css`, and a
visible no-user-data disclosure. Publishing v2 also records `rendererVersion`
and `assets.previewEvidence`, which bind the fixed viewport/state contract,
theme input fingerprint, browser version, and every output SHA-256. The website
renders these finished images directly instead of wrapping them in another mock shell.

## Optional native preview capture

Compatibility evidence may be captured from the installed Codex renderer; the
repository does not copy or redistribute Codex application source, React
components, icons, or stylesheets. The capture command uses the native DOM and
styles already loaded by the user's signed Codex installation.

The fixed capture contract is:

- Home: native `home` route at 1200×750, with Sidebar, Suggestions, and Composer
  geometry verified against the stock layout.
- Task: native `task` route at 1200×750, with Sidebar and Composer geometry
  verified.
- Narrow: native `task` route at 750×1000, after responsive reflow, with Sidebar
  and Composer geometry verified again.
- The active installed theme must match the source pack's runtime fingerprint.
- The renderer reads only route/theme/compatibility attributes; it never reads
  chat text, storage, credentials, or account data. The author must use a clean
  demo workspace and explicitly acknowledge that the visible window is captured.
- All three files must have matching theme, platform, Codex-version, dimensions,
  and SHA-256 evidence before `previewMetadata.kind` becomes
  `verified-capture`. `assets/preview.jpg` then becomes the verified Home image.

The website renders verified captures directly. Native capture remains opt-in
QA and is not the standard way to produce public gallery previews.

## Versioning

Increment the theme's patch version for asset compression or small token fixes,
minor for backward-compatible design additions, and major for a deliberate
visual/format break. The manifest and visual-token schemas are versioned
independently. Existing manifest v1 packs remain install-compatible; new
Registry publication requires manifest v2. Visual token v2 is required for both.

## Draft and release states

- Draft: structurally valid, may have missing images reported as warnings.
- Release candidate: all assets present, rights recorded, strict validation
  passes, illustrative previews carry a clear disclosure (or captures record
  their tested Codex version and platform), and platform evidence exists.
- Release: install/apply/restore tested for every declared platform, with no
  quality blocker.

Focused releases must include Foundation plus at least one complete component
group. Complete releases must include all seven groups. Assisted authoring may
generate missing values, but the validator still reports generated and customized
coverage separately.
