# Get Codex Theme website

Public website application for
[GetCodexTheme.com](https://getcodextheme.com), maintained inside the
`ViisOpen/get-codex-theme` monorepo.

This app owns the community gallery, publisher UI, concept and brand previews,
SEO pages, automated publication APIs, private content reports, database schema, likes, asset processing, and deploy
packaging. The public repository contains application code, validation rules,
binding names, and migrations. Credentials, production resource IDs, live
D1/R2 data, publisher archives, private reports, and local deployment state
remain outside Git.

The publisher Registry uses Neon Auth for Google or GitHub sign-in. Contributors
can publish under a GitHub profile linked through Neon Auth or a canonical public
X profile URL they provide. X is attribution only, is never a website sign-in
method, and does not require the X API. Private R2
archives, authoritative server validation, rate limits, rights records, and immutable published theme versions protect the
release pipeline. Email, password, Magic Link, and Resend flows are intentionally not part of v1. Theme
browsing, downloads, installation, and likes are free; the site has no payment
or checkout surface.

## Monorepo relationship

- Canonical schemas: `../../packages/theme-schema`
- Canonical first-party packs: `../../themes/free`
- Website delivery copies: generated under `public/schema` and
  `public/theme-packs` by `scripts/prepare-public-assets.mjs`
- Published downloads contain theme assets only. The fixed-version public CLI
  supplies and installs the audited runtime.

See [docs/repository-boundaries.md](docs/repository-boundaries.md) before moving
code or generated assets.

## Development

From the repository root:

```bash
npm install
npm run dev:website
```

Copy `.env.example` into the ignored `.dev.vars` file. Production runs in the
project's Cloudflare Worker with D1 and R2 bindings declared in `wrangler.jsonc`.
Enable Google and GitHub in Neon Auth,
set production OAuth credentials and callback URLs in the Neon console, and
enable **Auth → Configuration → Domains → Allow Localhost** only while testing
local OAuth flows. Provide `NEON_AUTH_BASE_URL`, a 32+ character
`NEON_AUTH_COOKIE_SECRET`, and a separate `LIKE_HASH_SECRET`. Without those values, publisher sign-in fails closed
while public pages remain available.

### X contributor profiles

X attribution accepts only a canonical HTTPS profile page such as
`https://x.com/username`. The server rejects posts, reserved X routes, non-X
hosts, credentials, query strings, and malformed usernames before storing the
normalized username and profile URL. The publisher confirms in the publishing
terms that they control or are authorized to represent the supplied profile.
The website does not call the X API or receive X OAuth credentials.

## Publisher release flow

1. Authors select exactly one connected GitHub profile or supplied X profile on `/publish`, then use
   the generated prompt with `npx --yes get-codex-theme@0.7.0 publish-session`.
   The identity is bound to the session and must exactly match `manifest.author`.
2. The author reviews every piece of final listing copy and accepts the publishing
   terms in one confirmation. The site encrypts the separate short-lived Publish
   capability to the waiting CLI instead of showing a second prompt.
3. The same `publish-session` command revalidates the exact confirmed draft, binds
   the archive digest, and uploads it once.
4. A submission that passes automated identity, package, checksum, license, rights-record,
   frequency, and server validation is published immutably as `theme-id@version` and
   served from `/api/themes/:slug/download`; failed submissions fail closed.
5. Registry downloads remain theme-only. The fixed-version CLI verifies the pack and
   supplies the audited runtime during installation.

The website does not accept browser ZIP uploads and has no human publication queue.
The scoped CLI transfers the author-confirmed archive. Rights, privacy, abuse, and
removal concerns are submitted privately through `/report` and stored in D1 without
storing the reporter's raw IP address.

## Verification

From the repository root:

```bash
npm run test:website
npm run build:website
```

## Cloudflare deployment

The production application is deployed as the `getcodextheme-production`
Worker. Its `DB` binding points to the `getcodextheme-production` D1 database,
and `THEME_ASSETS` points to the private `getcodextheme-theme-assets` R2 bucket.
Apply migrations before deploying application code:

```bash
npm run db:migrate:production
npm run deploy:cloudflare
```

Store deployment-specific auth, HMAC, and OAuth values with
`wrangler secret put`. Do not add them to `wrangler.jsonc`.

Never commit auth or HMAC secrets, production identifiers, publisher uploads,
deployment credentials, local environment files, or Wrangler state.
