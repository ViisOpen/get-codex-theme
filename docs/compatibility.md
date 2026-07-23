# Compatibility

Codex appearance capabilities can change between releases. Treat compatibility
as observed behavior, not a permanent promise.

## Delivery labels

| Label | Meaning | Product wording |
| --- | --- | --- |
| `native-if-supported` | Use only after verifying an official import/share format in the current app | “Native when supported” |
| `visual-cdp` | Unofficial local visual layer for image backgrounds and CSS-like presentation | “Advanced visual theme” |

Do not claim that a `visual-cdp` pack appears in Settings > Appearance. Do not
call a pack native solely because its colors resemble official settings.

## Platform evidence

A manifest may declare `macos`, `windows`, or both. Each declared platform needs
its own install/apply/restore test and real screenshots. Do not infer Windows
support from macOS behavior or the reverse.

## Honest fallbacks

When native import is unavailable, users must be able to use the official
appearance controls without installing the visual layer. If a visual layer is
unsupported by a new Codex release, fail closed and offer restore; never patch
the application as a fallback.

Compatibility claims on the website should include the tested Codex version and
date. Re-test after material Codex updates.
