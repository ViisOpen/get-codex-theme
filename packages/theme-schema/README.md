# Theme manifest schema

`manifest.schema.json` preserves the install-compatible manifest v1 contract.
`manifest-v2.schema.json` defines the publishing contract with independent
`description`, `tagline`, and `designStory` fields. `visual-theme.schema.json`
defines the required appearance-only visual token v2 contract, and
`component-registry.json` is the canonical seven-group coverage model. All are
independent of the website.

Visual token v2 is intentionally breaking: v1 token files and layout contracts
are rejected. A pack can provide colors and bounded opacity, but cannot provide
component geometry, spacing, ordering, shadows, hit targets, or selectors.

Validate a pack with the repository CLI:

```bash
node packages/theme-cli/bin/get-codex-theme.mjs validate themes/free/aurora-glass
```

Missing image assets are warnings during authoring and errors when
`--strict-assets` is supplied.

Public preview provenance is explicit. `renderer: html-css` identifies the
standard deterministic, fixed-demo-content renderer; `native-capture` is
reserved for opt-in captures with evidence, and `artwork` identifies a concept
image that has not passed through the shared interface renderer.
Publishing v2 HTML/CSS previews also bind renderer version, viewport/state,
theme fingerprint, and output hashes through `assets.previewEvidence`.
