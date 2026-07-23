# Releasing the CLI and Plugin

The repository root stays private to npm. Only `packages/theme-cli` is
published as the public `get-codex-theme` package.

## Release gate

1. Use the same semantic version in the root package, CLI package, and Plugin
   manifest.
2. Run `npm ci`, `npm test`, `npm run test:themes`, and `npm run test:skill`.
3. Validate `plugins/get-codex-theme` with the current Codex Plugin validator.
4. Run `npm pack --dry-run` in `packages/theme-cli` and inspect every included
   file. No credentials, local state, staged themes, or website source may be
   present.
5. Test the packed tarball from a temporary directory before tagging.
6. Push the exact source commit, create the matching `vX.Y.Z` tag, and publish
   the GitHub Release. The release workflow rejects a mismatched tag.
7. Verify `npx -y get-codex-theme@X.Y.Z --help` before changing website install
   commands.

## npm authentication

Use npm trusted publishing with the public `ViisOpen/get-codex-theme` GitHub
repository and `.github/workflows/publish.yml`. It uses short-lived OIDC
credentials and automatically records provenance. A one-time authenticated
first publish may be required before the package settings expose the trusted
publisher configuration.

## Recovery

Published npm versions are immutable and must never be reused. If a release is
unsafe, publish a fixed version and deprecate the affected version with a clear
upgrade message. Unpublish only when npm policy permits it and removal is safer
than leaving the immutable artifact available.

- https://docs.npmjs.com/trusted-publishers/
- https://docs.npmjs.com/generating-provenance-statements/
- https://docs.npmjs.com/policies/unpublish/
