# Release checklist

Score at least 85/100 and ship with no blocker.

| Area | Points | Blocker |
| --- | ---: | --- |
| Visual finish and originality | 25 | AI artifacts or recolor-only variants |
| Home and Task readability | 25 | Unreadable text, code, or input controls |
| Responsive crops and focus | 20 | Lost subject or text safety at 16:9/4:3 |
| Install, switch, and restore | 15 | Cannot restore the official appearance |
| Performance and asset weight | 10 | Visible lag or unreasonable pack size |
| Rights and attribution | 5 | Missing source or redistribution rights |

Before release:

- Confirm that `description`, `tagline`, `designStory`, and tags are factual,
  mutually distinct, and grounded in the confirmed brief and rendered theme.
  A guided Create prompt may generate this draft without another chat
  questionnaire; the author reviews the exact copy in the Publish portal.
  Never invent missing affiliation, rights, provenance, or endorsement claims.
- Run structural validation and strict asset validation.
- Inspect all files for secrets and personal metadata.
- Test macOS and Windows separately; do not infer parity.
- Install and select the exact local pack only after explicit authorization
  supplied either by the guided website contract or separately in chat. Test
  welcome branding, Home, a normal Task, code,
  input, sidebar and command menus, expanded terminal, Settings, banners and
  Dismiss actions, dialogs and Review actions, selected/disabled states, and a
  narrow window.
- Render Home at 1200×750, Task at 1200×750, and narrow at 750×1000 with
  `render-preview --state all`. Verify the shared Sidebar, Suggestions,
  Composer, image-upload control, and responsive geometry. Confirm the files
  use fixed demo content and carry the illustrative HTML/CSS disclosure.
- Simulate an app update/navigation and verify that the compatibility layer is
  idempotent.
- Restore the original appearance, confirm no application files changed, and
  reselect the candidate only when the guided contract authorizes that exact
  action or the user separately asks to continue testing.
- Include truthful compatibility badges and the unofficial disclaimer.
