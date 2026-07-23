# Open-source and production boundary

## One public codebase

This repository owns the full public product code:

- Website routes, UI, SEO, automated community publishing, and private report APIs.
- Theme manifest schema and compatibility vocabulary.
- Create, validate, list, install, apply, and restore CLI behavior.
- Safe activation pointers, backups, restoration, and loopback-only runtime.
- Free themes, concept previews, asset notices, and database migrations.
- Creator and management Skills, tests, security documentation, and deploy code.

The separation is architectural rather than repository-based. Reusable tooling
lives under `packages/`, `runtime/`, `platforms/`, `plugins/`, and `themes/`;
the hosted application lives under `apps/website/`.

## What never belongs in Git

Keep these in the production platform or ignored local configuration:

- API keys, OAuth credentials, cookie/HMAC secrets, and deployment tokens.
- Production D1, R2, Neon, or other service resource identifiers.
- Live database contents, object-storage archives, logs, and rate-limit data.
- Publisher identity data, private reports, and staged submissions.
- Generated deployment state, local environment files, and Wrangler state.

Public code must enforce authentication, authorization, validation, rate limits,
and audit boundaries on the server. Security must not depend on routes or rules
remaining hidden.

## Runtime distribution

The published CLI owns the audited runtime and platform launchers. The website
publishes automatically validated theme-only packs; it does not copy runtime executables into
theme downloads. Website delivery copies of schemas and free packs are generated
from canonical monorepo sources and are never a second source of truth.

## Promise to users

Users receive a transparent file format, open authoring and installation tools,
visible validation logic, private removal reporting, and a reversible compatibility layer. Opening the website
code does not open production credentials or user data; those remain isolated in
the services that operate the deployment.
