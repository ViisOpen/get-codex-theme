# Component authoring reference

Ask the author to choose one path before creating a pack:

- **Focused**: Foundation plus one or more selected groups. Use when only a few
  controls need a distinctive treatment.
- **Complete**: all seven groups and every required token.
- **Assisted**: generate adaptive values from an image, then tune selected
  groups. Report generated and customized values separately.

For a Codex agent, “ask” means resolve an already stated preference with the
Skill's deterministic mapping. Use `--non-interactive`; ask a follow-up only
when the missing choice would materially change the pack.

Groups: `foundation`, `buttons`, `icons`, `overlaysAndForms`, `taskArtifacts`,
`feedback`, and `utilityRoutes`.

Use visual-token schema v2. Never add raw CSS, HTML, JavaScript, selectors, SVG
paths, external URLs, radius, icon size, stroke width, shadow, spacing, or any
layout-changing token to a pack. Sidebar, Suggestions, Composer, and Attachments
must retain native geometry and hit targets. Use the Node CLI as the publication
validator and run `coverage` before `pack`.
