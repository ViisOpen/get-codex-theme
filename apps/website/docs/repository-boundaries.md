# Monorepo boundaries

`ViisOpen/get-codex-theme` is the source of truth for both the public toolkit and
the hosted website. Code is separated by responsibility, not by Git history:

- `packages/`, `runtime/`, `platforms/`, `plugins/`, and `themes/` own the
  reusable theme standard and local tooling.
- `apps/website/` owns website routes, UI, Registry APIs, automated publication,
  private content reports,
  database migrations, SEO, and deploy packaging.
- `apps/website/scripts/prepare-public-assets.mjs` builds website delivery
  copies of canonical schemas and free packs. Those generated directories are
  ignored and must never become a second source of truth.

The repository may contain public binding names, migrations, validation rules,
and deployment code. It must not contain credentials, production resource IDs,
live database or object-storage contents, OAuth secrets,
publisher identity data, staged uploads, or local Wrangler state.

Website downloads remain theme-only. Runtime and platform executables are
distributed by the versioned CLI and are not copied into Registry archives.
