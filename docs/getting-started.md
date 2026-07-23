# Getting started

## Browse or validate the included themes

```bash
node packages/theme-cli/bin/get-codex-theme.mjs list
node packages/theme-cli/bin/get-codex-theme.mjs validate themes/free/aurora-glass
```

The included free themes are complete distributable packs and pass strict
validation. New themes created with the CLI start as authoring drafts; missing
images remain warnings until their production assets and rights record arrive.

## Start a theme as a human author

The CLI is deterministic; a human-facing website or guide can help you choose
Focused, Complete, or Assisted before it builds the command. See
[`component-authoring.md`](component-authoring.md) for the visual choices.

```bash
npx -y get-codex-theme create northern-lights \
  --name "Northern Lights" \
  --mode dark \
  --path complete \
  --output ./themes/local
```

Or derive the responsive artwork and accessible local component palette from a
landscape PNG, JPEG, or WebP without uploading it:

```bash
npx -y get-codex-theme create-from-image ./artwork.webp northern-lights \
  --name "Northern Lights" --mode dark --path assisted --preset soft \
  --output ./themes/local
```

## Run the same workflow with a Codex agent

An agent must not enter an interactive terminal flow. It converts the request to
explicit flags and adds `--non-interactive`:

```bash
node packages/theme-cli/bin/get-codex-theme.mjs create northern-lights \
  --name "Northern Lights" --mode dark --path focused \
  --components buttons,icons --output ./themes/local --non-interactive
```

The agent records Goal, Context, Constraints, and Done when before execution,
then reports failures without deleting or overwriting existing work. The full
contract and natural-language mapping are in
[`agent-authoring.md`](agent-authoring.md).

Then:

1. Replace every expected image with an original, licensed JPEG.
2. Tune every palette and layout token rather than changing only the background.
3. Record provenance in `LICENSE-ASSETS.txt`.
4. Run `render-preview path/to/theme --state all`. It creates Home, Task, and
   narrow with the shared HTML/CSS renderer, fixed demo content, and no access to
   Codex or user data. Native `capture-preview` is optional compatibility QA.
5. Run `coverage`, then validate with `--strict-assets`.
6. Test installation and complete restoration on each declared platform in a
   separate, explicitly authorized installation phase.

Then create the checksummed ZIP used for registry submission:

```bash
node packages/theme-cli/bin/get-codex-theme.mjs pack themes/local/northern-lights \
  --output northern-lights-v1.0.0.zip
```

For an agent-guided workflow, install or invoke
`plugins/get-codex-theme/skills/create-codex-theme/SKILL.md`. Creation must not
run `install`, `use`, `apply`, `launch`, or any other live injection command.

## Validate multiple themes

```bash
node packages/theme-cli/bin/get-codex-theme.mjs validate themes/free/*
```

The CLI returns a nonzero exit code for a structurally invalid manifest or for a
missing file in strict mode, making it suitable for continuous integration.

## Install, switch, and restore

```bash
npx -y get-codex-theme install aurora-glass
npx -y get-codex-theme status
npx -y get-codex-theme apply obsidian-orbit
npx -y get-codex-theme restore
```

Install accepts a published theme id, local directory, `manifest.json`, or a
downloaded `.zip`. It verifies registry and per-file checksums when present,
validates the full pack, copies it through a staging directory, and installs the
companion runtime. It does not write the active pointer or restart Codex. Run
`apply` explicitly, then `get-codex-theme launch` only when you are ready for
the unofficial loopback visual layer. Add `--restart` only after deciding the
current Codex task may be closed and reopened.

Optional switchers use the same installed state:

```bash
npx -y get-codex-theme menu-bar start  # macOS
npx -y get-codex-theme tray start      # Windows
```
