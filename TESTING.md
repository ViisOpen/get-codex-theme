# Testing

This repository tests the public theme-pack contract, CLI, creator Skill,
companion runtime, installers, downloadable themes, website application,
Registry APIs, SEO routes, and deploy build.

## Commands

```bash
npm test
npm run test:core
npm run test:website
npm run test:themes
npm run test:themes:brand
npm run test:skill
npm run test:package
```

## Layers

- `packages/theme-cli/test` covers authoring, validation, installation, active
  pointers, and restoration behavior.
- `tests/runtime-*` covers pointer parsing, safety checks, responsive CSS, and
  the non-native delivery boundary without opening Codex.
- `test:themes` requires every declared file, image dimension, ratio, license,
  and token relationship for all sixteen free packs.
- `test:skill` validates the standalone Python creator path.
- `test:package` inspects legal/runtime contents, installs the packed npm
  artifact into a temporary consumer project, and executes the installed CLI.
- `tests/plugin-contract.test.mjs` keeps Plugin, marketplace, both Skills, and
  npm versions aligned.
- `apps/website/tests` covers gallery rendering, SEO, authentication boundaries,
  upload validation, Registry downloads, likes, and canonical asset generation.

GitHub CI also compiles the AppKit menu bar app on macOS and parses all Windows
PowerShell surfaces on Windows. A release still requires real visual acceptance
on each claimed platform before expanding compatibility claims.
