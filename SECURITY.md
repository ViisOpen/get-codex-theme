# Security policy

## Reporting a vulnerability

Do not open a public issue for a vulnerability that could expose credentials,
chat data, local files, or a debugging endpoint. Use the repository's private
[security advisory form](https://github.com/ViisOpen/get-codex-theme/security/advisories/new)
with affected version, platform, reproduction steps, and impact. Do not include
real API keys, chats, or unrelated personal data.

We aim to acknowledge reports within three business days. This is a target, not
a bug-bounty commitment.

## Supported surface

Security fixes target the latest released CLI, schema, installer, Skill, and
website. The website has its own deployment lifecycle inside the monorepo and
follows the same secret and production-data boundary.

## Non-negotiable boundaries

- Bind debugging only to `127.0.0.1`; never expose it to LAN or public networks.
- Verify the target process belongs to Codex before applying a visual layer.
- Never read chats, API keys, model settings, account tokens, or unrelated files.
- Never modify the signed Codex bundle, code signature, or file ownership.
- Require explicit confirmation before restarting a running app.
- Keep install, update, activation, and restore operations atomic and reversible.
- Keep credentials, production resource IDs, live D1/R2 data, reviewer
  allowlists, and publisher uploads outside Git.

See [docs/security-model.md](docs/security-model.md) for the full threat model.
