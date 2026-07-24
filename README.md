# Get Codex Theme

The open website, theme-pack standard, free themes, creation tools, and
reversible compatibility runtime behind
[GetCodexTheme.com](https://getcodextheme.com).

> Unofficial themes for Codex Desktop. Not affiliated with or endorsed by
> OpenAI.

**Start here:** [Codex Appearance settings guide](https://getcodextheme.com/guides/codex-appearance-settings)
for native themes, colors, UI and code fonts, sharing, and the boundary between
official Appearance controls and optional visual packs.

This public monorepo contains both the reusable toolkit and the hosted website
application. Production secrets, service resource IDs, live data, publisher
uploads, and local deployment state stay outside Git.

## What is included

- `packages/theme-schema` — canonical `manifest.json` contract.
- `packages/theme-cli` — create, validate, package, list, install, apply,
  and restore commands.
- `apps/website` — gallery, publisher UI, automated publication and report APIs, database migrations, SEO,
  and deployment packaging.
- `themes/free` — seventeen complete, redistributable free theme packs.
- `plugins/get-codex-theme` — installable Codex Plugin containing the creator Skill and standalone tools.
- `runtime` and `platforms` — optional macOS/Windows CDP compatibility layer.
- `docs` — pack format, compatibility, safety, installation, and contribution
  requirements.

## Codex Appearance reference

Codex Desktop Appearance and Codex CLI themes are separate systems. The
desktop app exposes native appearance controls; the CLI uses `/theme` and
supports custom `.tmTheme` files. Artwork-heavy packs in this repository are
unofficial, stay outside the signed app, and include an explicit restore path.

- [Codex Appearance settings: themes, colors, fonts, and sharing](https://getcodextheme.com/guides/codex-appearance-settings)
- [Official Codex app settings reference](https://learn.chatgpt.com/docs/reference/settings)
- [Official Codex CLI customization reference](https://learn.chatgpt.com/docs/cli-customization)
- [Browse free Codex themes](https://getcodextheme.com/themes)

## Quick start

Node.js 22 or later is required by the CLI and local compatibility runtime.
The first `create` example is for a human terminal and opens the authoring guide
when `--path` is omitted. Scripts and agents must provide the path explicitly
and add `--non-interactive` as shown below.

```bash
npx get-codex-theme list
node packages/theme-cli/bin/get-codex-theme.mjs validate themes/free/aurora-glass
node packages/theme-cli/bin/get-codex-theme.mjs create my-theme --name "My Theme" --mode dark --output ./themes/local
node packages/theme-cli/bin/get-codex-theme.mjs create my-focused-theme --path focused --components buttons,icons
node packages/theme-cli/bin/get-codex-theme.mjs create agent-theme --name "Agent Theme" --mode dark --path focused --components buttons,icons --output ./themes/local --non-interactive
node packages/theme-cli/bin/get-codex-theme.mjs coverage ./my-focused-theme
node packages/theme-cli/bin/get-codex-theme.mjs pack themes/free/aurora-glass --output aurora-glass-v1.0.0.zip
node packages/theme-cli/bin/get-codex-theme.mjs install themes/free/aurora-glass
node packages/theme-cli/bin/get-codex-theme.mjs apply aurora-glass
node packages/theme-cli/bin/get-codex-theme.mjs status
```

## Install the Codex Plugin

The Plugin bundles separate creation and management Skills. Add this repository
as a marketplace, then install the versioned Plugin in Codex:

```bash
codex plugin marketplace add ViisOpen/get-codex-theme
codex plugin add get-codex-theme@get-codex-theme
```

Start a new Codex task after installation so the Skills are discovered. Plugin
commands still keep live launch and restart actions behind explicit confirmation.

Before releasing a theme, require every declared asset:

```bash
node packages/theme-cli/bin/get-codex-theme.mjs validate themes/free/aurora-glass --strict-assets
```

`pack` repeats strict release validation, includes only declared theme assets and
rights metadata, and writes a per-file `checksums.sha256` manifest. The publisher
portal creates a scoped prompt for Codex; the CLI submits the author-confirmed
archive and the Registry independently validates it again before automatic publication.

Human authoring guides may help choose a path and collect missing information.
Codex agents instead translate natural language into explicit flags and use
`--non-interactive`; they never install, activate, launch, or inject a theme
during the filesystem-only creation phase. A separate author-approved local QA
phase installs the exact candidate, checks real Codex surfaces and restore, and
must pass before the agent describes it as ready for Publish. See
[Agent theme authoring contract](docs/agent-authoring.md).

## Free themes

| Dark | Light |
| --- | --- |
| Obsidian Orbit | Cloud Atelier |
| Aurora Glass | Sage Workshop |
| Midnight Grid | Solar Paper |
| Signal Drive | Rose Quartz |
| Desert Eclipse | Alpine Daybreak |
| Inkstone Garden | Citrus Atelier |
| Neon Monsoon | Paper Grove |
| Velvet Observatory | Porcelain Tide |

Every free pack includes master artwork, responsive derivatives, Home and Task
public previews, responsive validation evidence, complete tokens, and an explicit per-theme asset license.

## Compatibility

The optional runtime launches Codex with a loopback-only DevTools port and
injects responsive art and palette CSS. It never patches the signed Codex
application and does not add themes to `Settings > Appearance`.

```bash
node packages/theme-cli/bin/get-codex-theme.mjs install aurora-glass
node packages/theme-cli/bin/get-codex-theme.mjs apply aurora-glass

# Or install and select in one atomic operation (never restarts Codex)
node packages/theme-cli/bin/get-codex-theme.mjs use aurora-glass
~/.codex/get-codex-theme/bin/start-macos.sh --restart
```

`install` accepts a local directory, `manifest.json`, downloaded `.zip`, or a
published theme id. It validates and copies the pack but never changes the active
theme or restarts Codex. Use `apply <theme-id>` to select an installed pack,
`status` to inspect local state, and `restore` to restore the previous pointer.

## Documentation

- [Getting started](docs/getting-started.md)
- [Theme pack specification](docs/theme-pack-spec.md)
- [Component authoring paths and coverage](docs/component-authoring.md)
- [Agent theme authoring contract](docs/agent-authoring.md)
- [Open-source boundary](docs/open-source-boundary.md)
- [Installation and restore model](docs/installation-and-restore.md)
- [Compatibility](docs/compatibility.md)
- [Security model](docs/security-model.md)
- [Contributing a theme](docs/contributing-a-theme.md)
- [Releasing the CLI and Plugin](docs/releasing.md)
- [Image palette engine](docs/image-palette.md)
- [Companion runtime](runtime/README.md)
- [Changelog](CHANGELOG.md)

## Development

```bash
npm install
npm test
npm run test:themes
npm run test:themes:brand
npm run dev:website
python3 plugins/get-codex-theme/skills/create-codex-theme/scripts/theme_pack.py validate themes/free/aurora-glass
```

The website generates its public schema and first-party theme delivery folders
from the canonical monorepo sources before development, build, and tests. Do not
commit those generated folders. See
[Website monorepo boundaries](apps/website/docs/repository-boundaries.md).

Code is licensed under the [MIT License](LICENSE). Theme images keep the license
declared by each pack; the repository license does not grant rights to third-party
assets or trademarks. See [NOTICE.md](NOTICE.md).
