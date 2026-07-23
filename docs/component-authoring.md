# Component authoring

Get Codex Theme separates **effective coverage** from the amount of work an
author performs. Every valid visual-token v2 theme receives safe adaptive color
defaults. Authors choose one of three paths and may override only appearance
tokens; packs cannot provide CSS, HTML, JavaScript, DOM selectors, SVG paths, or
layout values. Visual-token v1 packs are rejected rather than adapted.

A human-facing guide may explain these paths and collect a choice. A Codex agent
uses the deterministic, non-interactive mapping in
[`agent-authoring.md`](agent-authoring.md) and never installs or injects the pack
during creation.

## Choose a path

### Focused

Use Focused when the theme's identity depends on a small set of components.
Foundation is always included, and a public theme must select at least one other
group.

```bash
npx -y get-codex-theme create my-theme \
  --path focused \
  --components buttons,icons
```

The selected groups are validated as complete units. For example, a button
theme cannot omit disabled, focus, destructive, or pressed behavior.

### Complete

Use Complete for an intentionally designed full system. All seven groups and
every required token must be present.

```bash
npx -y get-codex-theme create my-theme --path complete
```

Only a package that passes this contract may be labeled Complete coverage.

### Assisted

Use Assisted to derive an accessible component baseline, responsive crops, and
image focus from artwork. Authors can then edit selected component token groups.

```bash
npx -y get-codex-theme create-from-image art.png my-theme --path assisted
```

Generated values are reported separately from customized values. Assisted is a
creation method, not a lower publication standard.

## Seven component groups

| Group | Weight | Includes |
| --- | ---: | --- |
| `foundation` | 20 | Surface, elevated surface, border, and focus colors |
| `buttons` | 15 | Primary, secondary, ghost, destructive, icon and states |
| `icons` | 10 | Semantic icon and container colors |
| `overlaysAndForms` | 15 | Dialog, menu, tooltip, inputs, choice controls and tabs |
| `taskArtifacts` | 20 | Messages, tools, attachments, code, diff, terminal and tables |
| `feedback` | 10 | Toast, badge, progress, skeleton and semantic feedback |
| `utilityRoutes` | 10 | Home, task, scheduled, plugins, pull requests, chat and search |

Compatibility selectors are owned by the audited runtime. They are never
authored inside a theme pack.

## Inspect coverage

```bash
npx -y get-codex-theme coverage ./my-theme
npx -y get-codex-theme validate ./my-theme --strict-assets
```

The report distinguishes:

- `customized`: values explicitly present in the pack;
- `generated`: adaptive values produced by the authoring tools;
- `inherited`: groups outside a Focused theme's declared scope;
- `effectiveScore`: the weighted coverage available at runtime.

The token contract records component provenance in `coverage.customized` and
`coverage.generated`. They must be disjoint and together classify every enabled
group. Assisted scaffolds start as generated; move a group to `customized` only
after deliberately reviewing and changing its component tokens.

The Registry recomputes this report and does not trust a claimed percentage.

## Safe customization boundary

Component values are limited to safe colors and bounded disabled opacity.
Radius, border width, icon size, stroke width, position, inset, transform, order,
margin, padding, width, height, display, and shadows are runtime-owned and are
invalid in a pack.

## Native interaction invariants

Runtime v4 protects four surfaces: Sidebar, new-chat Suggestions, Composer, and
Attachments. Before applying a theme, it records native geometry, ordering,
spacing, border widths, radii, shadows, pointer behavior, and hit targets. Two
animation frames after applying appearance rules it compares each surface with a
1 CSS pixel tolerance and center-point hit-tests interactive controls. A failed
surface alone falls back to native styling; the other verified surfaces and the
background remain active.
