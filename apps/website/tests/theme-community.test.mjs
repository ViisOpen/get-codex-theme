import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { CLI_AGENT_COMMAND, CLI_COMMAND, CLI_RELEASE } from "../lib/distribution.ts";
import { authorDisplayName, firstPartyGalleryTheme, installCommand, isThemeCategory, normalizeAuthorProfile, parseAuthorProfiles } from "../lib/theme-gallery.ts";
import { getTheme } from "../lib/themes.ts";

test("publisher metadata accepts only canonical GitHub or X profile links", () => {
  assert.deepEqual(normalizeAuthorProfile("github", "https://github.com/creator"), { platform: "github", url: "https://github.com/creator" });
  assert.deepEqual(normalizeAuthorProfile("x", "https://x.com/creator_1/"), { platform: "x", url: "https://x.com/creator_1" });
  assert.equal(normalizeAuthorProfile("github", "https://evil.example/creator"), null);
  assert.equal(normalizeAuthorProfile("x", "https://x.com/creator/status/1"), null);
  assert.equal(normalizeAuthorProfile("x", "javascript:alert(1)"), null);
  assert.equal(isThemeCategory("brands"), true);
  assert.equal(isThemeCategory("unknown"), false);
});

test("publisher attribution accepts one or two canonical social profiles", () => {
  const profiles = parseAuthorProfiles(JSON.stringify([
    { platform: "github", url: "https://github.com/creator-one" },
    { platform: "x", url: "https://x.com/creator_two" },
  ]));
  assert.deepEqual(profiles.map(({ platform, displayName, url }) => ({ platform, displayName, url })), [
    { platform: "github", displayName: "@creator-one", url: "https://github.com/creator-one" },
    { platform: "x", displayName: "@creator_two", url: "https://x.com/creator_two" },
  ]);
  assert.equal(authorDisplayName(profiles), "@creator-one & @creator_two");
  assert.equal(parseAuthorProfiles(JSON.stringify([{ platform: "x", url: "https://x.com/name/status/1" }])).length, 0);
});

test("detail install commands use the fixed open-source release and atomic use command", () => {
  assert.equal(CLI_COMMAND, `npx ${CLI_RELEASE}`);
  assert.equal(CLI_AGENT_COMMAND, `npx --yes ${CLI_RELEASE}`);
  assert.equal(installCommand("aurora-glass", "1.0.0"), `${CLI_COMMAND} use aurora-glass@1.0.0`);
});

test("Codex Hub publishes its validated first-party release metadata", () => {
  const source = getTheme("codexhub");
  assert.ok(source);
  const theme = firstPartyGalleryTheme(source);
  assert.equal(theme.name, "Codex Hub");
  assert.equal(theme.version, "1.0.1");
  assert.equal(theme.category, "brands");
  assert.equal(theme.authorName, "VIIS Labs");
  assert.equal(theme.license, "CC BY 4.0");
  assert.equal(theme.previewMetadata.kind, "illustrative");
  assert.equal(theme.previewMetadata.renderer, "html-css");
  assert.equal(theme.coverage.effectiveScore, 100);
});

test("copy controls expose distinct human and Codex paths with accessible feedback", async () => {
  const component = await readFile(new URL("../components/InstallCommand.tsx", import.meta.url), "utf8");
  assert.match(component, /Copy command/);
  assert.match(component, /Copy for Codex/);
  assert.match(component, /navigator\.clipboard\.writeText\(value\)/);
  assert.match(component, /copy\(codexPrompt, "codex"\)/);
  assert.match(component, /aria-live="polite"/);
  assert.match(component, /role="group"/);
});

test("Codex prompts are bounded, autonomous, and include verifiable completion criteria", async () => {
  const [createWorkflow, createWizard, detailPage, createSkill, manageSkill] = await Promise.all([
    readFile(new URL("../components/CreateThemeWorkflow.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/AccountCreateWizard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/themes/[slug]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../../plugins/get-codex-theme/skills/create-codex-theme/SKILL.md", import.meta.url), "utf8"),
    readFile(new URL("../../../plugins/get-codex-theme/skills/manage-codex-theme/SKILL.md", import.meta.url), "utf8"),
  ]);

  assert.match(createWorkflow, /AccountCreateWizard/);
  assert.match(createWizard, /Autonomy contract/);
  assert.match(createWizard, /Do not ask for theme id, display name, description, tagline, designStory, tags, mode/);
  assert.match(createWizard, /create-from-image[^\n]+--path assisted[^\n]+--non-interactive/);
  assert.match(createWizard, /create <derived-theme-id>[^\n]+--path assisted[^\n]+--non-interactive/);
  assert.match(createWizard, /CLI_AGENT_COMMAND/);
  assert.match(createWizard, /BACKGROUND_IMAGE_PROMPT/);
  assert.match(createWizard, /Ban application windows, device frames/);
  assert.match(createWizard, /STATIC_VALIDATION_PASSED/);
  assert.match(createWizard, /READY_TO_PUBLISH only after installation identity, restore/);
  assert.match(createWizard, /RESTART_AUTHORIZATION_REQUIRED/);
  assert.doesNotMatch(createWizard, /ask the user in chat to choose Assisted, Focused, or Complete/i);

  assert.match(createSkill, /website prompt includes a creative brief/);
  assert.match(createSkill, /do not ask again/i);
  assert.match(createSkill, /Authorized local QA/);
  assert.match(createSkill, /background-only reference\s+candidate/);
  assert.match(createSkill, /Only `READY_TO_PUBLISH` may tell the user to open Publish/);
  assert.match(manageSkill, /use PACK_DIRECTORY/);
  assert.match(manageSkill, /command success alone is not approval/i);

  assert.match(detailPage, /Registry theme slug:/);
  assert.match(detailPage, /Required theme version:/);
  assert.match(detailPage, /outer checksum and packaged file checksums/i);
  assert.match(detailPage, /Do not add --launch or --restart/);
  assert.match(detailPage, /Do not ask the user to open or operate an interactive terminal/);
  assert.match(detailPage, /activeTheme\.id/);
  assert.match(detailPage, /activeTheme\.version/);
  assert.match(detailPage, /Completion criteria/);
});

test("community migrations add one-session publishing, direct X profiles, private reports, and retire legacy storage", async () => {
  const [registry, community, publishing, socialProfiles, oauth1Migration, commerceRemoval, reports, automaticPublishing, manualXProfiles, multipleAuthors, archivedActivities, secureContinuation, journal] = await Promise.all([
    readFile(new URL("../drizzle/0002_happy_hitman.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0003_powerful_spitfire.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0004_wise_captain_america.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0005_curved_frog_thor.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0006_tiny_jocasta.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0007_medical_tenebrous.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0008_secret_talos.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0009_low_amphibian.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0010_big_multiple_man.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0011_cool_red_skull.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0012_mixed_darkhawk.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0013_remarkable_valkyrie.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/meta/_journal.json", import.meta.url), "utf8"),
  ]);
  assert.match(registry, /CREATE TABLE `theme_submissions`/);
  assert.match(community, /CREATE TABLE `theme_likes`/);
  assert.match(community, /theme_likes_theme_actor_unique/);
  assert.match(community, /CREATE TABLE `theme_like_rate_limits`/);
  assert.match(community, /PRIMARY KEY\(`actor_kind`, `actor_key_hash`, `window_seconds`\)/);
  assert.match(community, /`author_url` text DEFAULT 'https:\/\/github\.com\/ViisOpen' NOT NULL/);
  assert.match(community, /`category` text DEFAULT 'aesthetic' NOT NULL/);
  assert.match(community, /`gallery_assets_json` text DEFAULT '\{\}' NOT NULL/);
  assert.match(publishing, /CREATE TABLE `publish_sessions`/);
  assert.match(publishing, /CREATE TABLE `publish_validation_runs`/);
  assert.match(publishing, /CREATE TABLE `theme_namespaces`/);
  assert.match(publishing, /ADD `tagline` text/);
  assert.match(publishing, /ADD `design_story` text/);
  assert.match(socialProfiles, /CREATE TABLE `publisher_oauth_states`/);
  assert.match(socialProfiles, /publisher_oauth_states_publisher_platform_unique/);
  assert.match(socialProfiles, /CREATE TABLE `publisher_social_profiles`/);
  assert.match(socialProfiles, /publisher_social_profiles_provider_account_unique/);
  assert.doesNotMatch(socialProfiles, /access_token|refresh_token/i);
  assert.match(oauth1Migration, /RENAME COLUMN "code_verifier" TO "request_token_secret"/);
  assert.doesNotMatch(`${socialProfiles}\n${oauth1Migration}`, /access_token|refresh_token/i);
  assert.doesNotMatch(publishing, /DROP TABLE `theme_submissions`/i);
  assert.match(commerceRemoval, /DROP TABLE `orders`/);
  assert.match(commerceRemoval, /DROP TABLE `stripe_events`/);
  assert.match(reports, /CREATE TABLE `content_reports`/);
  assert.match(reports, /CREATE TABLE `content_report_rate_limits`/);
  assert.match(automaticPublishing, /DEFAULT 'published'/);
  assert.match(automaticPublishing, /WHEN "status" = 'approved' THEN 'published'/);
  assert.match(automaticPublishing, /WHERE `status` = 'flagged'/);
  assert.match(manualXProfiles, /DROP TABLE `publisher_oauth_states`/);
  assert.match(manualXProfiles, /DROP INDEX `publisher_social_profiles_provider_account_unique`/);
  assert.match(manualXProfiles, /DROP COLUMN `provider_account_id`/);
  assert.match(multipleAuthors, /publish_sessions.*author_profiles_json/s);
  assert.match(multipleAuthors, /theme_submissions.*author_profiles_json/s);
  assert.match(archivedActivities, /publish_sessions.*archived_at/s);
  assert.match(secureContinuation, /publish_sessions.*agent_public_key_json/s);
  assert.match(secureContinuation, /publish_sessions.*publish_token_envelope/s);
  assert.match(journal, /0000_volatile_lionheart/);
  assert.match(journal, /0004_wise_captain_america/);
  assert.match(journal, /0005_curved_frog_thor/);
  assert.match(journal, /0006_tiny_jocasta/);
  assert.match(journal, /0007_medical_tenebrous/);
  assert.match(journal, /0008_secret_talos/);
  assert.match(journal, /0009_low_amphibian/);
  assert.match(journal, /0010_big_multiple_man/);
  assert.match(journal, /0011_cool_red_skull/);
  assert.match(journal, /0012_mixed_darkhawk/);
  assert.match(journal, /0013_remarkable_valkyrie/);
});

test("like endpoint separates anonymous IP and signed-in user identities without storing raw identifiers", async () => {
  const likes = await readFile(new URL("../app/api/_lib/likes.ts", import.meta.url), "utf8");
  const route = await readFile(new URL("../app/api/themes/[slug]/like/route.ts", import.meta.url), "utf8");
  assert.match(likes, /cf-connecting-ip/i);
  assert.match(likes, /getOptionalPublisher/);
  assert.match(likes, /HMAC/);
  assert.match(likes, /\[60, 10\].*\[3600, 40\]/s);
  assert.match(likes, /\[60, 30\].*\[3600, 180\]/s);
  assert.match(route, /cross-site/);
  assert.match(route, /export async function GET/);
  assert.match(route, /getThemeLikeState/);
  assert.doesNotMatch(likes, /insert\([^)]*ip/i);
});

test("CLI submission reserves first-party ids, locks ownership, automatically publishes, and sanitizes gallery assets", async () => {
  const route = await readFile(new URL("../app/api/submissions/route.ts", import.meta.url), "utf8");
  const finalize = await readFile(new URL("../app/api/publish/sessions/[id]/finalize/route.ts", import.meta.url), "utf8");
  const validator = await readFile(new URL("../app/api/_lib/submission-validator.ts", import.meta.url), "utf8");
  assert.doesNotMatch(route, /export async function POST/);
  assert.match(finalize, /theme_id_reserved/);
  assert.match(finalize, /findThemeOwner/);
  assert.match(finalize, /manifest\.author must exactly match the social identity saved to this publishing session/);
  assert.match(finalize, /agent-publish-gallery/);
  assert.match(finalize, /status: "published"/);
  assert.match(validator, /undeclared file.*removed/is);
});

test("private reports are same-origin, bounded, rate-limited, and do not store raw IP addresses", async () => {
  const [route, reports, schema, security] = await Promise.all([
    readFile(new URL("../app/api/reports/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/_lib/reports.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/_lib/security.ts", import.meta.url), "utf8"),
  ]);
  assert.match(route, /requireTrustedBrowserMutation/);
  assert.match(route, /readJsonObject\(request, 16_384\)/);
  assert.match(route, /goodFaith/);
  assert.match(route, /parsed\.protocol !== "https:"/);
  assert.match(reports, /cf-connecting-ip/i);
  assert.match(reports, /HMAC/);
  assert.match(reports, /3_600, 5/);
  assert.match(reports, /86_400, 20/);
  assert.match(schema, /contentReports = sqliteTable/);
  assert.match(schema, /sourceKeyHash: text\("source_key_hash"\)/);
  assert.doesNotMatch(schema, /rawIp|ipAddress|reporterIp/i);
  assert.match(security, /requestUrl\.hostname === "localhost"/);
  assert.match(security, /return requestUrl\.origin/);
});

test("commercial API and user-delivery routes are absent", async () => {
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(pkg.dependencies.stripe, undefined);
  for (const path of ["../app/api/checkout/route.ts", "../app/api/webhooks/stripe/route.ts", "../app/order/success/page.tsx", "../app/refunds/page.tsx"]) {
    await assert.rejects(readFile(new URL(path, import.meta.url), "utf8"), { code: "ENOENT" });
  }
});
