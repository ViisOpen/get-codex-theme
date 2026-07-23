---
name: create-codex-theme
description: Create, customize, validate, locally install, and test theme packs for Codex Desktop from generated background artwork, a landscape image, brand palette, or style brief. Use when a user asks to make a Codex theme, generate or convert artwork into a Codex background/theme pack, prepare free or branded theme assets, diagnose an invalid manifest, or run pre-release local theme QA.
---

# Create Codex Theme

Create and locally verify a release candidate without modifying the signed Codex
application. Keep filesystem creation, user-authorized live QA, official native
settings, and unofficial visual-background delivery clearly separated.

## Human guidance and agent execution

Keep these two surfaces separate:

- A human-facing wizard may explain choices, preview paths, and ask only for
  creative intent, unavoidable rights facts, and bounded local-state
  authorization.
- A Codex agent must translate the user's natural-language intent into one
  deterministic creation invocation, followed by explicit coverage and
  validation commands. It must use `--non-interactive` for creation, must not
  wait for terminal prompts, and must fail closed when a required input is
  unknown.

When a Get Codex Theme website prompt includes a creative brief, an asset
record, an autonomy contract, and explicit local-QA authorization, treat that
prompt as the complete guided Create contract. Do not ask again for id, name,
mode, authoring path, preset, component groups, output directory, background
strategy, description, tagline, design story, tags, author display name, pack
license, image approval, local install permission, or visual acceptance. Derive
those values and evaluate the available automated evidence as directed by the
prompt. This authorization never includes launching, quitting, restarting, or
capturing private Codex surfaces.

Before executing, write a short contract with these headings:

- **Goal**: the pack to create and whether the result is a draft or release
  candidate.
- **Context**: known id, name, mode, source image, output directory, authoring
  path, selected component groups, preset, and asset rights.
- **Constraints**: no overwrite, no inferred redistribution rights, bounded
  component tokens only, no live changes before static validation, and no
  launch, restart, or capture without explicit permission.
- **Done when**: creation succeeds, coverage and strict validation pass, the
  exact pack is installed only after authorization, real-Codex visual QA and
  restore are confirmed, and the final completion state is reported truthfully.

Do not turn this contract into another questionnaire when the request already
contains enough information. If a missing value would change the output or its
rights, stop before creation and ask for that value.

## Deterministic intent mapping

Map natural language to flags before running the CLI:

- “Only these components”, “just buttons and icons”, or an explicit subset:
  `--path focused --components LIST`.
- “Everything”, “all components”, or “a complete system”:
  `--path complete` and omit `--components`.
- “Extract from this image”, “automatic”, or “generate a base and I will tune
  it”: use `create-from-image` with `--path assisted`.
- With no component-path signal, use Assisted when a guided website prompt or
  the user's request delegates implementation choices to the agent. Otherwise
  ask the user to choose Focused, Complete, or Assisted before running.
- Map style words to image presets only when explicit: `soft`, `sharp`, `bold`,
  or `glass`. Otherwise use `soft` for `create-from-image`.

Use the canonical component ids and emit them in registry order:
`buttons,icons,overlaysAndForms,taskArtifacts,feedback,utilityRoutes`.
`foundation` is added automatically. Natural-language aliases map as follows:

- buttons and button states → `buttons`;
- icons and icon containers → `icons`;
- dialogs, menus, tooltips, popovers, and form controls → `overlaysAndForms`;
- messages, tool calls, attachments, code, diff, terminal, and tables →
  `taskArtifacts`;
- toast, badges, progress, loading, error, and empty states → `feedback`;
- Home, Task, Scheduled, Plugins, Pull Requests, Chat, and Search pages →
  `utilityRoutes`.

Never silently broaden a Focused request to Complete coverage.

## Workflow

1. For an ordinary request, gather only values that cannot safely be derived:
   creative intent, any required third-party asset rights, and authorization for
   local state changes. For a guided website prompt, derive the theme id,
   display name, dark/light mode, artwork plan, accent, visual focus, output
   directory, listing copy, license, and authoring path without another
   questionnaire. A human guide may explain Focused, Complete, or Assisted using
   [component-reference.md](references/component-reference.md); an agent applies
   the deterministic mapping above. Do not infer permission to redistribute an
   image.
2. Read [asset-guidelines.md](references/asset-guidelines.md) before accepting or
   generating artwork. Before using image generation, output the exact
   `BACKGROUND_IMAGE_PROMPT` and generate one background-only reference
   candidate when the capability is available. In an ordinary request, show it
   to the user and wait for explicit approval. In a guided website contract that
   delegates image selection, show the selected reference as evidence and
   continue with the strongest valid candidate without another question. If
   generation is unavailable, follow the contract's no-image fallback; never
   fabricate an image path or accept a fake app window as background art. Run
   `scripts/inspect_image.py IMAGE` to verify dimensions and aspect ratio when
   the image is available locally.
3. For an available local image, prefer `npx -y get-codex-theme
   create-from-image IMAGE THEME_ID --name "Theme Name" --mode dark --path
   assisted --preset soft --output DESTINATION --non-interactive`. It derives
   accessible component colors and responsive crops locally without uploading
   the image or adding a full-window overlay. Use `scripts/theme_pack.py create`
   as the offline skeleton fallback only when the Node CLI is unavailable.
   Refuse to overwrite an existing directory.
4. Produce the required 16:10, 16:9, and 4:3 derivatives from one high-resolution
   landscape master. Preserve the subject with the manifest's `focusX` and
   `focusY`; never stretch artwork.
5. Tune every palette token and layout value in `manifest.json`, keep
   `layout.overlayStrength` at `0` for image-derived packs, then mirror
   `palette` and artwork framing `layout` into the required visual-token v2 file.
   Keep appearance-only component metadata and tokens there. Never write raw CSS,
   selectors, HTML, JavaScript, SVG paths, radius, size, spacing, shadow, or any
   layout-changing geometry. Do not emit or accept visual-token v1. Read
   [manifest-reference.md](references/manifest-reference.md) for field rules.
   A publishing manifest uses schema v2 and must contain a factual
   `description` plus distinct `tagline`, `designStory`, and `tags`. When a
   guided website prompt supplies a confirmed public description or pack
   license, copy each value exactly. Generate any remaining listing copy from
   only the confirmed brief, approved artwork, resulting palette, composition,
   visual tokens, and previews; do not pause for another editorial
   questionnaire. Never invent affiliations, endorsements, rights, provenance,
   user outcomes, or unobservable author intent merely to satisfy validation.
   Do not ask for an author display name during Create. Keep the scaffold author
   until Publish supplies the GitHub/X identity selected on the website.
6. Record the source, creator, generation method, editing steps, and exact
   redistribution license in `LICENSE-ASSETS.txt`.
7. Use the Node CLI for publication validation and run `coverage` before `pack`.
   `scripts/theme_pack.py` is an offline skeleton helper, not the canonical
   component validator. Missing production images are warnings while authoring.
8. Read [release-checklist.md](references/release-checklist.md), then run
   `render-preview THEME --state all`. This is the standard public-preview path:
   it builds a deterministic Codex-like shell in HTML/CSS from theme tokens and
   pack assets, uses fixed demo content, and never opens Codex or reads user
   data. Inspect Home, Task, and narrow before release. Native `capture-preview`
   remains an optional, separately authorized compatibility QA path; it is not
   required for publishing an illustrative HTML/CSS preview.
9. After static validation passes, report `STATIC_VALIDATION_PASSED`, then
   follow the Local QA phase below. A guided website prompt's checked local-QA
   authorization is sufficient for its exact install, select, automated
   checks, restore test, and conditional reselect scope; do not ask again.
   Without that authorization, ask before changing local state. Do not describe
   static validation alone as publish-ready.
10. In the hosted publishing flow, run `publish-session` with the website's
   Session code. It submits the manifest, preview evidence, and public preview
   assets, then waits at `draft_ready`. Only after the author reviews the
   displayed public copy, accepts the current terms, and confirms asset rights
   does the server encrypt a separate Publish capability to that same waiting
   CLI. Never ask the user for a second prompt or code, and never reuse or
   substitute one capability for the other.

## Delivery boundaries

- Label every pack unofficial and include `unofficial: true`.
- Describe `native-if-supported` as conditional. Claim that a theme appears in
  Settings > Appearance only after verifying the current official import format.
- Treat image-backed `visual-cdp` delivery as an unofficial compatibility layer.
- Bind any debugging endpoint only to `127.0.0.1`, verify the target process,
  and ask before restarting Codex.
- Never read chats, credentials, API keys, model settings, or account data.
- Never patch the Codex application bundle, change its ownership, or invalidate
  its code signature.
- Before static validation passes, never run `install`, `use`, `apply`,
  `switch`, `launch`, `resume`, `menu-bar`, `tray`, or `watchdog`. Creation,
  coverage inspection, validation, and packaging are filesystem-only. Treat
  live installation as a distinct phase covered either by a guided website
  authorization or by separate user permission.
- `render-preview` is safe during creation. It reads only the selected theme
  pack, renders fixed demo content in an isolated headless browser, and records
  `previewMetadata.renderer: html-css`. It must never enumerate Codex tasks,
  chats, browser storage, account data, or local workspaces.
- `capture-preview` is also a separate user-authorized phase. Require the user
  to open a clean demo workspace and pass `--confirm-clean`; never capture the
  user's ordinary chats or account surfaces. Do not copy Codex source code into
  the pack or repository—the command must render the signed app's live native
  DOM and styles through the verified loopback runtime.
- Install only beneath `~/.codex/get-codex-theme/themes/<id>` on macOS or
  `%USERPROFILE%\.codex\get-codex-theme\themes\<id>` on Windows. Activate via an
  atomic project-owned `active-theme.json` pointer and retain an idempotent
  backup/restore path.

## Authorized local QA

Run this phase only after strict validation and packaging exit zero:

1. When the guided website contract already authorizes reversible local QA,
   record `status --json` and offline `doctor --json` before any change so the
   previous active theme remains recoverable. Otherwise report
   `LOCAL_INSTALL_REQUIRED`, explain that theme selection changes local state,
   and wait for permission.
2. Once authorized, run `use PACK_DIRECTORY` without `--launch` or `--restart`.
   Verify that `status --json` reports the same id and version as the source
   pack, then report `LOCAL_INSTALL_PASSED`.
3. When a verified loopback runtime is already active, run `verify` and
   `doctor --live --json`. Otherwise ask separately before `launch`. If Codex is
   running without a CDP endpoint, require the user to save work and explicitly
   approve any restart. Never infer restart permission from local-QA permission.
4. Use only privacy-safe rendered previews unless a verified loopback runtime
   is already available with a clean demo workspace free of private chats,
   credentials, and project data. Inspect Home/welcome branding, a normal Task,
   sidebar and command menu, expanded terminal, Settings, banners and Dismiss
   actions, dialogs and Review actions, inputs, selected/disabled states, and a
   narrow window. Treat hidden text, icons, actions, broken geometry, or
   unreadable contrast as blockers.
5. Verify restore, then reselect the candidate only if the user wants to keep
   testing. Restore the previous state immediately when live verification fails.
   Use native `capture-preview` only after a separate request and
   `--confirm-clean`.
6. In an ordinary request, ask the user to confirm any real-Codex visual
   checklist that cannot be evaluated safely. In a guided website contract,
   evaluate all available rendered or verified-runtime evidence yourself and
   report exactly which native checks were unavailable. Command success alone
   is not visual evidence.

Use these exact completion states:

- `THEME_CREATED`: files exist but static release validation is incomplete.
- `STATIC_VALIDATION_PASSED`: previews, coverage, strict validation, and pack
  passed; local installation is still required.
- `LOCAL_INSTALL_REQUIRED`: waiting for permission to change local state.
- `LOCAL_INSTALL_PASSED`: the exact pack is installed and selected; visual
  acceptance is incomplete.
- `VISUAL_QA_CONFIRMED`: the available rendered evidence and any authorized
  verified-runtime checks passed, with unavailable native checks disclosed.
- `READY_TO_PUBLISH`: static validation, exact-pack installation identity,
  restore, and all available automated visual checks passed with no blocker.

Only `READY_TO_PUBLISH` may tell the user to open Publish. Never publish or
upload from the Create workflow.

## Repository CLI

When working inside the Get Codex Theme repository, prefer the canonical Node
CLI because it validates the full repository contract:

```bash
node packages/theme-cli/bin/get-codex-theme.mjs create THEME_ID \
  --name "Theme Name" --mode dark --path focused \
  --components buttons,icons --output DESTINATION --non-interactive
node packages/theme-cli/bin/get-codex-theme.mjs coverage path/to/theme --json
node packages/theme-cli/bin/get-codex-theme.mjs validate path/to/theme
node packages/theme-cli/bin/get-codex-theme.mjs validate path/to/theme --strict-assets
node packages/theme-cli/bin/get-codex-theme.mjs pack path/to/theme --output theme.zip
```

Use `validate` without `--strict-assets` while scaffolding. Before calling the
pack release-ready, require `coverage`, strict validation, and `pack` to exit
zero. `pack` repeats strict validation.

## Failure handling

- On any nonzero exit, preserve the generated directory, quote the actionable
  error, and stop. Do not install or inject a partially created pack.
- If the destination exists, do not delete or overwrite it. Ask for a different
  id or output directory.
- If an image, license, or real screenshot is missing, keep the result labeled
  as a draft and list the missing evidence. Never invent provenance.
- If a component id is invalid, map it to a canonical id only when the user's
  meaning is unambiguous; otherwise ask.
- Do not weaken strict validation, remove required assets, or change the chosen
  authoring path merely to make packaging pass.

Use the bundled Python scripts when the Skill is installed independently, but
do not claim Node publication validation has passed when only the fallback was
available.
