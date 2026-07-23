# Agent theme authoring contract

Human-facing theme builders and Codex agents share the same CLI, but they do not
share the same interaction model. A visual wizard may teach the three authoring
paths and ask questions. An agent produces one explicit, repeatable command and
does not hand control to a terminal wizard.

## Execution contract

Before it writes files, an agent records:

- **Goal** — theme id, intended authoring path, and draft or release-candidate
  outcome;
- **Context** — display name, light/dark mode, source image if any, destination,
  selected groups, preset, and known asset rights;
- **Constraints** — no overwrite, no invented rights, no executable theme
  content, no live changes during creation, and no launch or restart without
  separate permission;
- **Done when** — the deterministic create command exits zero, coverage and
  strict validation pass, the exact pack completes separately authorized local
  installation and real-Codex visual QA, restore works, and the author confirms
  the result.

`--non-interactive` is required on agent-driven `create` and
`create-from-image` commands. It makes the intent machine-readable and requires
the command to fail rather than prompt when its inputs are incomplete. It does
not mean “accept defaults regardless of context.”

## Natural language to CLI

| User intent | Deterministic flags |
| --- | --- |
| Only buttons and icons | `--path focused --components buttons,icons` |
| Only dialogs, forms, and task artifacts | `--path focused --components overlaysAndForms,taskArtifacts` |
| Full design system | `--path complete` |
| Extract a complete adaptive base from an image | `create-from-image ... --path assisted` |
| Image with an explicit sharp, bold, soft, or glass treatment | `create-from-image ... --path assisted --preset PRESET` |
| No authoring-path preference stated | Ask in chat; do not run the CLI yet |

Canonical component order is `buttons,icons,overlaysAndForms,taskArtifacts,feedback,utilityRoutes`.
`foundation` is implicit and should not be repeated in `--components`.

Examples:

```bash
node packages/theme-cli/bin/get-codex-theme.mjs create focused-brand \
  --name "Focused Brand" --mode light --path focused \
  --components buttons,icons --output ./themes/local --non-interactive

node packages/theme-cli/bin/get-codex-theme.mjs create-from-image ./artwork.webp image-brand \
  --name "Image Brand" --mode dark --path assisted --preset soft \
  --output ./themes/local --non-interactive
```

The agent must not broaden Focused to Complete, guess light versus dark when the
choice materially affects the request, invent a license, silently choose an
authoring path, or choose a different destination after an overwrite refusal
without approval. If the user explicitly delegates the path decision, recommend
Assisted and record that delegated choice in Context.

## Creation is offline

The authoring phase may run only filesystem-oriented commands:

- `create` or `create-from-image`;
- `coverage`;
- `validate`;
- `pack` after release evidence exists.

It must not run `install`, `use`, `apply`, `switch`, `launch`, `resume`,
`menu-bar`, `tray`, or `watchdog`. Those commands can change installed or live
theme state and belong to a separate, explicitly authorized installation phase.

Image analysis is local. It must not upload the image, start Codex, connect to a
DevTools endpoint, or test injection as part of pack creation.

When the author asks for generated artwork, first output the exact
`BACKGROUND_IMAGE_PROMPT`. Request a 3200×2000, 16:10 background-only image with
a quiet reading region and enough bleed for 3200×1800 and 2400×1800 crops. Ban
application windows, device frames, sidebars, controls, chat, terminal, code,
text, logos, watermarks, and UI mockups. Generate one candidate when the
capability exists, show it to the author, and wait for approval. Otherwise
provide the prompt and wait for an attachment.

## Validation sequence

For an authoring draft:

```bash
node packages/theme-cli/bin/get-codex-theme.mjs coverage ./themes/local/THEME_ID --json
node packages/theme-cli/bin/get-codex-theme.mjs validate ./themes/local/THEME_ID
```

Before describing a pack as release-ready:

```bash
node packages/theme-cli/bin/get-codex-theme.mjs coverage ./themes/local/THEME_ID --json
node packages/theme-cli/bin/get-codex-theme.mjs validate ./themes/local/THEME_ID --strict-assets
node packages/theme-cli/bin/get-codex-theme.mjs pack ./themes/local/THEME_ID \
  --output THEME_ID-vVERSION.zip
```

`pack` repeats strict release validation and must exit zero. A draft validation
may succeed with warnings for missing production assets; those warnings are
unfinished work, not permission to publish.

## Local release QA is a separate phase

Static validation may report `STATIC_VALIDATION_PASSED`, but it must not report
`READY_TO_PUBLISH`. After the author explicitly authorizes local QA:

1. Record `status --json` and offline `doctor --json`.
2. Run `use PACK_DIRECTORY` without `--launch` or `--restart`, then verify the
   active id and version match the source pack.
3. Ask separately before launch. If Codex is already running without a loopback
   CDP endpoint, require the author to save work and explicitly approve restart.
4. Use a clean demo workspace to inspect welcome branding, Home, Task, sidebar
   menus, expanded terminal, Settings, banners, Dismiss and Review actions,
   inputs, selected/disabled states, and a narrow window.
5. Test restore and ask the author to confirm the visual checklist.

Use `THEME_CREATED`, `STATIC_VALIDATION_PASSED`, `LOCAL_INSTALL_REQUIRED`,
`LOCAL_INSTALL_PASSED`, `VISUAL_QA_CONFIRMED`, and `READY_TO_PUBLISH` in that
order. Only the final state may direct the author to Publish. The Publish server
still independently validates the exact release.

## Failure handling

- Preserve the output directory and report the exact failing command and error.
- Do not retry by weakening validation, changing authoring path, removing a
  component, or deleting an existing directory.
- Treat missing licensed artwork, provenance, real screenshots, or platform
  evidence as release blockers.
- Treat unknown component names as input errors. Normalize an alias only when
  its meaning maps unambiguously to one canonical group.
- Never respond to a creation failure by installing or injecting the incomplete
  theme.
