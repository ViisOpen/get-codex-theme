import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import test, { after, before } from "node:test";
import JSZip from "jszip";

const port = 4399;
const configuredBaseUrl = process.env.TEST_BASE_URL;
const baseUrl = configuredBaseUrl ?? `http://localhost:${port}`;
let server;
let serverOutput = "";

before(async () => {
  if (configuredBaseUrl) return;
  server = spawn("npm", ["run", "dev", "--", "--port", String(port)], {
    cwd: new URL("..", import.meta.url),
    detached: true,
    env: { ...process.env, NO_COLOR: "1", CODEX_TEST_EPHEMERAL: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", (chunk) => { serverOutput += chunk; });
  server.stderr.on("data", (chunk) => { serverOutput += chunk; });
  for (let attempt = 0; attempt < 360; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`Test server exited early.\n${serverOutput}`);
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Test server did not become ready.\n${serverOutput}`);
}, { timeout: 95_000 });

after(() => {
  if (server?.pid && server.exitCode === null) {
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {
      server.kill("SIGTERM");
    }
  }
});

async function render(path, init) {
  return fetch(`${baseUrl}${path}`, init);
}

test("renders the finished homepage with product metadata", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Free Codex Themes: Validated Community Packs \| Get Codex Theme<\/title>/i);
  assert.match(html, /Make Codex feel/);
  assert.match(html, /Browse Installable Themes/);
  assert.match(html, /Pocket Robot Cat/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

for (const [path, pattern] of [
  ["/themes", /Codex themes for/],
  ["/themes/free", /Free Codex themes/],
  ["/themes/aurora-glass", /Aurora Glass/],
  ["/themes/codexhub", /Codex Hub/],
  ["/themes/concepts", /Codex themes with/],
  ["/themes/concepts/pocket-robot-cat", /Pocket Robot Cat/],
  ["/guides", /Codex theme guides/],
  ["/guides/codex-background-image", /Codex Background Images/],
  ["/create", /Create a Codex theme/],
  ["/account", /Describe it once/i],
  ["/create?direction=pocket-robot-cat", /starting direction loaded/i],
  ["/brand-themes", /brand/i],
  ["/brand-lab", /brand workspace collection/i],
  ["/open-source", /open source/i],
  ["/contact", /theme maintainers/i],
  ["/publish", /One publishing session/i],
  ["/auth/sign-in", /Continue with Google/i],
  ["/report", /Report a theme/i],
]) {
  test(`renders ${path}`, async () => {
    const response = await render(path);
    assert.equal(response.status, 200);
    assert.match(await response.text(), pattern);
  });
}

test("homepage exposes community discovery, popularity sorting, and creator attribution", async () => {
  const response = await render("/");
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /Installable themes/i);
  assert.match(html, /Popular/);
  assert.match(html, />By\s/);
  assert.match(html, /Get Codex Theme(?:<!-- -->)? on (?:<!-- -->)?GitHub/i);
  assert.match(html, /Publish your theme/i);
});

test("retired review queue is not publicly routable", async () => {
  const response = await render("/review");
  assert.equal(response.status, 404);
});

test("every published theme detail exposes a one-command install", async () => {
  const response = await render("/themes/aurora-glass");
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /get-codex-theme@0\.7\.0 use aurora-glass@1\.0\.0/i);
  assert.match(html, /By |Author/i);
});

test("keeps the auth proxy social-only even before Neon credentials are configured", async () => {
  const blockedEmail = await render("/api/auth/sign-up/email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "publisher@example.com", password: "not-used" }),
  });
  assert.equal(blockedEmail.status, 404);
  const unsupportedProvider = await render("/api/auth/sign-in/social", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ provider: "vercel" }),
  });
  assert.equal(unsupportedProvider.status, 400);
  assert.match(await unsupportedProvider.text(), /Google or GitHub/i);
});

test("returns a useful image-generation prompt", async () => {
  const response = await render("/api/prompts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      style: "cinematic minimalism",
      mood: "focused and quiet",
      accent: "#8B7CFF",
      product: "personal",
    }),
  });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.match(payload.prompt, /16:10/);
  assert.match(payload.prompt, /3200/);
  assert.match(payload.prompt, /Do not include:[\s\S]*Text/i);
});

test("turns a gallery concept into a composition-safe generation prompt", async () => {
  const response = await render("/api/prompts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      conceptSlug: "pocket-robot-cat",
      style: "cinematic character workshop",
      mood: "focused and playful",
      accent: "#42B9FF",
    }),
  });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.concept.slug, "pocket-robot-cat");
  assert.match(payload.prompt, /Pocket Robot Cat/);
  assert.match(payload.prompt, /right half/i);
  assert.match(payload.prompt, /Recognizable copyrighted characters/i);
});

test("serves the canonical public theme schema", async () => {
  const response = await render("/schema/manifest-v1.json");
  assert.equal(response.status, 200);
  const schema = await response.json();
  assert.equal(schema.$id, "https://getcodextheme.com/schema/manifest-v1.json");
  assert.equal(schema.properties.unofficial.const, true);
});

test("serves the author-owned publishing schema", async () => {
  const response = await render("/schema/manifest-v2.json");
  assert.equal(response.status, 200);
  const schema = await response.json();
  assert.equal(schema.$id, "https://getcodextheme.com/schema/manifest-v2.json");
  assert.ok(schema.required.includes("tagline"));
  assert.ok(schema.required.includes("designStory"));
  assert.ok(schema.required.includes("previewMetadata"));
});

test("serves a theme-only registry archive with an outer checksum", async () => {
  const response = await render("/api/themes/aurora-glass/download?version=1.0.0");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/zip");
  assert.match(response.headers.get("x-theme-sha256") ?? "", /^[0-9a-f]{64}$/);
  const archive = await JSZip.loadAsync(await response.arrayBuffer());
  assert.ok(archive.file("manifest.json"));
  assert.equal(archive.file("runtime/injector.mjs"), null);
  assert.equal(archive.file("platforms/macos/start.sh"), null);
  assert.ok(archive.file("checksums.sha256"));
  const manifest = JSON.parse(await archive.file("manifest.json").async("string"));
  assert.equal(manifest.id, "aurora-glass");
  assert.equal(manifest.version, "1.0.0");
});

test("serves the complete Codex Hub release with its brand asset and configuration guide", async () => {
  const response = await render("/api/themes/codexhub/download?version=1.0.1");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/zip");
  assert.equal(response.headers.get("x-theme-version"), "1.0.1");
  const archive = await JSZip.loadAsync(await response.arrayBuffer());
  assert.ok(archive.file("assets/brand-logo.png"));
  assert.ok(archive.file("screenshots/preview-evidence.json"));
  assert.equal(archive.file("runtime/injector.mjs"), null);
  assert.equal(archive.file("platforms/macos/start.sh"), null);
  const manifest = JSON.parse(await archive.file("manifest.json").async("string"));
  assert.equal(manifest.id, "codexhub");
  assert.equal(manifest.version, "1.0.1");
  const readme = await archive.file("README.md").async("string");
  assert.match(readme, /use codexhub@1\.0\.1/);
  assert.match(readme, /status --json/);
  assert.match(readme, /launch/);
  assert.match(readme, /restore/);
});

test("rejects unavailable registry theme versions", async () => {
  const response = await render("/api/themes/aurora-glass/download?version=9.9.9");
  assert.equal(response.status, 404);
});
