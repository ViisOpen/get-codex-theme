# Third-party notices and asset review

No third-party background artwork is included in the Get Codex Theme free gallery.
The sixteen gallery packs use artwork created specifically for this project;
each pack records its own provenance and redistribution terms in
`LICENSE-ASSETS.txt`.

## Community repositories reviewed

The following community projects informed compatibility research, but their
theme catalogs and gallery images were **not copied or adapted**:

- `tree0519/Codex-Dream-Skin-Forge`, reviewed at revision
  `f342c024645c5746de72d7eee3a6d033be76693e`.
- `Fei-Away/Codex-Dream-Skin`, reviewed at revision
  `26c6c410e0e0bfc053356474620e17f934f483fc`.
- `HeiGeAi/heige-codex-skin-studio`, reviewed at revision
  `37091c1ebbf84d45a000cac793ab4885f04d108a`.

Neither repository exposed a root license at the reviewed revision. Both had a
MIT license inside `macos/`, with a notice limiting that grant to the macOS
software and the original `macos/assets/portal-hero.png` demo asset. The Forge
notice expressly excludes the third-party artwork in `builtin-themes/` from its
license grant. Other gallery, Windows-theme, character, brand, and third-party
images did not provide sufficiently clear redistribution rights for inclusion
here, so none of those assets were used.

Repository names and links are provided for factual attribution only. Get Codex
Theme is not affiliated with any referenced project or with OpenAI.

The HeiGe project was reviewed for product-level methods such as manifest
validation, theme switching, custom-image palette extraction, resilient target
handling, and reversible cleanup. Get Codex Theme's route model, theme tokens,
renderer lifecycle, selectors, CSS, and tests were independently designed and
written; no HeiGe source code or theme assets were copied.

Concept-preview artwork and editorial brand-identifying marks are maintained in
`apps/website`. They are not included in downloadable theme packs and retain
the rights and usage restrictions documented in
`apps/website/CONCEPT_THEME_NOTICES.md` and
`apps/website/BRAND_ASSET_SOURCES.md`; the repository's MIT license does not
override those restrictions.

## Runtime dependencies

- `fflate` 0.8.2 is used by the CLI to inspect and extract downloaded ZIP theme
  packs. It is distributed under the MIT License.
- `sharp` 0.35.3 is used for local PNG, JPEG, and WebP decoding and responsive
  crop generation. It is distributed under the Apache-2.0 License. Its
  platform packages may include `libvips`, distributed under LGPL-3.0-or-later;
  npm installs those dependencies separately with their own license files.
- Sharp's transitive JavaScript dependencies include `@img/colour` (MIT),
  `detect-libc` (Apache-2.0), `semver` (ISC), and `tslib` (0BSD).
