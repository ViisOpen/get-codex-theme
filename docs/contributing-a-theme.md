# Contributing a theme

## Quality bar

A theme is a visual system, not a replaced wallpaper. Choose Focused, Complete,
or Assisted authoring. Focused themes may customize only selected components,
but every selected group must include its required states. Complete themes cover
all seven groups. Assisted themes use generated adaptive values and may override
specific groups. See [`component-authoring.md`](component-authoring.md).

Human submission tools may guide these choices interactively. Agent-created
submissions must use the explicit `--non-interactive` contract in
[`agent-authoring.md`](agent-authoring.md); pack creation must not install,
activate, launch, or inject the theme into Codex. Release readiness additionally
requires a separate, explicitly authorized local install, visual-QA, and restore
phase.

## Required files

- A 3200×2000 `assets/background.jpg` master.
- JPEG derivatives for 16:9 and 4:3 plus `assets/preview.jpg`.
- A schema-valid manifest and required visual-token v2
  `tokens/visual-theme.json`. New Registry submissions require manifest v2 with
  author-reviewed `description`, `tagline`, `designStory`, and tags.
- Home, Task, and narrow-window layout previews, clearly labeled as illustrative
  unless captured from the tested Codex build.
- `LICENSE-ASSETS.txt` recording source, author, generation method, edits, and
  redistribution license.
- macOS and Windows evidence for every platform declared in the manifest.

## Rights

Submit original work or media whose license explicitly permits redistribution
in this repository. A prompt, model output, stock subscription, or source URL is
not by itself proof of rights. Do not submit third-party logos, copyrighted
characters, celebrity likenesses, or watermarked content.

## Release score

Score visual finish 25, readability 25, crops 20, install/restore 15,
performance 10, and rights 5. A total below 85 fails. Any obvious image artifact,
unreadable UI, destructive crop, failed restore, or unclear asset license is an
automatic blocker. Any change to native Sidebar, Suggestions, Composer, or
Attachment geometry, ordering, shadows, or hit targets is also an automatic
blocker.

## Validation

```bash
node packages/theme-cli/bin/get-codex-theme.mjs validate path/to/theme --strict-assets
node packages/theme-cli/bin/get-codex-theme.mjs coverage path/to/theme
```

Include test output, platform versions, runtime evidence, preview labels, and
asset provenance in the pull request. Keep drafts clearly labeled and never
offer a draft as a download. Do not describe illustrative previews as real
Codex screenshots.

Create the public previews without opening Codex:

```bash
get-codex-theme render-preview path/to/theme --state all
```

Use `--force` only after reviewing images already at those paths. The renderer
uses the shared HTML/CSS shell and fixed demo content, then records illustrative
HTML/CSS provenance. Native `capture-preview` is an optional, separately
authorized compatibility check for a clean demo workspace.

Registry publication keeps two internal capabilities inside one agent session.
Run `publish-session` with the short-lived Session code. The CLI submits the
private draft and waits while the author reviews the exact public page and
accepts the displayed terms and rights statement. The server then encrypts the
separate, 15-minute Publish capability to that waiting CLI, which continues
without a second user-visible prompt. Any manifest, presentation, license, or
preview change after confirmation invalidates publication.
