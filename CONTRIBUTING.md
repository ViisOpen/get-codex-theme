# Contributing

Thank you for improving the open Codex theme ecosystem.

## Before opening a change

1. Keep credentials, production resource IDs, live service data, reviewer
   allowlists, publisher uploads, and local deployment state out of Git.
2. Use original or explicitly redistributable artwork. Do not submit copyrighted
   characters, celebrity likenesses, third-party logos, or scraped images.
3. Read [the theme contribution guide](docs/contributing-a-theme.md) for required
   assets, screenshots, QA, and licensing.
4. Preserve the distinction between official native support and unofficial
   visual compatibility.

## Validate changes

```bash
node --test packages/theme-cli/test/*.test.mjs
node packages/theme-cli/bin/get-codex-theme.mjs validate themes/free/*
python3 plugins/get-codex-theme/skills/create-codex-theme/scripts/theme_pack.py validate themes/free/aurora-glass
npm run test:website
```

Run `--strict-assets` for any theme described as downloadable or release-ready.
Missing production assets are acceptable only in an explicitly marked draft.

## Pull requests

Keep each pull request focused. Explain behavior changes, safety impact, tested
platforms, asset provenance, and manual QA. Include before/after screenshots for
visual changes. By contributing software, you agree to license that contribution
under MIT; asset licenses remain explicit per theme.
