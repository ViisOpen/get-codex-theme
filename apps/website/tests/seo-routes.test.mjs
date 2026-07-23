import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { after, before, test } from "node:test";

const port = 4400 + (process.pid % 400);
const baseUrl = process.env.SEO_BASE_URL ?? `http://localhost:${port}`;
let devServer;
let serverOutput = "";

before(async () => {
  if (process.env.SEO_BASE_URL) return;

  devServer = spawn("npm", ["run", "dev", "--", "--port", String(port)], {
    cwd: new URL("..", import.meta.url),
    detached: true,
    env: {
      ...process.env,
      WRANGLER_LOG_PATH: ".wrangler/wrangler.log",
      CODEX_TEST_EPHEMERAL: "1",
      NO_COLOR: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  devServer.stdout.on("data", (chunk) => { serverOutput += chunk; });
  devServer.stderr.on("data", (chunk) => { serverOutput += chunk; });

  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (devServer.exitCode !== null) throw new Error(`SEO test server exited early.\n${serverOutput}`);
    try {
      const response = await fetch(`${baseUrl}/robots.txt`);
      if (response.ok) return;
    } catch {
      // Vite and workerd are still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`SEO test server did not start at ${baseUrl}.\n${serverOutput}`);
}, { timeout: 95_000 });

after(() => {
  if (devServer?.pid) {
    try {
      process.kill(-devServer.pid, "SIGTERM");
    } catch {
      devServer.kill("SIGTERM");
    }
  }
});

function request(path) {
  return fetch(`${baseUrl}${path}`, { headers: { accept: "text/html" } });
}

const indexableRoutes = [
  ["/themes", /Codex Themes/i, /href="\/themes\/obsidian-orbit"/i],
  ["/themes/free", /Free Codex Themes/i, /href="\/themes\/aurora-glass"/i],
  ["/themes/obsidian-orbit", /Obsidian Orbit/i, /href="\/guides\/install-codex-theme-macos"/i],
  ["/themes/concepts", /Codex Theme Concepts/i, /href="\/themes\/concepts\/pocket-robot-cat"/i],
  ["/themes/concepts/pocket-robot-cat", /Pocket Robot Cat/i, /href="\/themes\/concepts\/capybara-cafe"/i],
  ["/guides/codex-background-image", /Codex Background Images/i, /href="\/themes"/i],
  ["/brand-themes", /Branded Codex Themes/i, /href="\/create"/i],
  ["/open-source", /Open Source Codex Theme Tools/i, /github\.com\/ViisOpen\/get-codex-theme/i],
  ["/codex-theme-styles", /Codex theme styles/i, /href="\/codex-theme-styles\/glass"/i],
  ["/codex-theme-styles/glass", /glass Codex theme/i, /href="\/codex-theme-use-cases\/streamers"/i],
  ["/codex-theme-use-cases/developers", /Codex themes for developers/i, /href="\/codex-theme-platforms\/low-distraction"/i],
  ["/codex-theme-platforms/macos", /Codex theme on macOS/i, /href="\/themes\/obsidian-orbit"/i],
];

for (const [path, titlePattern, internalLinkPattern] of indexableRoutes) {
  test(`${path} renders indexable metadata, schema, and internal links`, async () => {
    const response = await request(path);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

    const html = await response.text();
    assert.match(html, titlePattern);
    assert.match(html, new RegExp(`<link[^>]+rel=["']canonical["'][^>]+href=["']https://getcodextheme\\.com${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`, "i"));
    assert.match(html, /type="application\/ld\+json"/i);
    assert.match(html, internalLinkPattern);
    assert.doesNotMatch(html, /<meta[^>]+name=["']robots["'][^>]+noindex/i);
  });
}

test("sitemap contains every theme, concept, and guide detail route", async () => {
  const response = await request("/sitemap.xml");
  assert.equal(response.status, 200);
  const xml = await response.text();
  assert.match(xml, /https:\/\/getcodextheme\.com\/themes\/obsidian-orbit/);
  assert.match(xml, /https:\/\/getcodextheme\.com\/themes\/rose-quartz/);
  assert.match(xml, /https:\/\/getcodextheme\.com\/guides\/codex-themes/);
  assert.match(xml, /https:\/\/getcodextheme\.com\/guides\/codex-appearance-settings/);
  assert.match(xml, /https:\/\/getcodextheme\.com\/brand-themes/);
  assert.match(xml, /https:\/\/getcodextheme\.com\/themes\/free/);
  assert.match(xml, /https:\/\/getcodextheme\.com\/themes\/concepts\/pocket-robot-cat/);
  assert.match(xml, /https:\/\/getcodextheme\.com\/themes\/concepts\/nvidia-neon-compute/);
  assert.match(xml, /https:\/\/getcodextheme\.com\/themes\/concepts\/x-signal-network/);
  assert.match(xml, /https:\/\/getcodextheme\.com\/contact/);
  assert.match(xml, /https:\/\/getcodextheme\.com\/codex-theme-styles\/glass/);
  assert.match(xml, /https:\/\/getcodextheme\.com\/codex-theme-use-cases\/developers/);
  assert.match(xml, /https:\/\/getcodextheme\.com\/codex-theme-platforms\/macos/);
});

test("concept theme pages are unique, transparent about status, crawlable, and linked in the sitemap", async () => {
  const sitemapResponse = await request("/sitemap.xml");
  assert.equal(sitemapResponse.status, 200);
  const sitemap = await sitemapResponse.text();
  const paths = [...sitemap.matchAll(/<loc>https:\/\/getcodextheme\.com([^<]+)<\/loc>/g)]
    .map((match) => match[1])
    .filter((path) => /^\/themes\/concepts(?:\/|$)/.test(path));

  assert.equal(paths.length, 54);
  assert.equal(new Set(paths).size, paths.length);

  const titles = new Set();
  const descriptions = new Set();
  for (let offset = 0; offset < paths.length; offset += 8) {
    const pages = await Promise.all(paths.slice(offset, offset + 8).map(async (path) => {
      const response = await request(path);
      return { path, response, html: await response.text() };
    }));

    for (const { path, response, html } of pages) {
      assert.equal(response.status, 200, `${path} should return 200`);
      assert.doesNotMatch(html, /<meta[^>]+name=["']robots["'][^>]+noindex/i, `${path} must be indexable`);
      assert.match(html, new RegExp(`<link[^>]+rel=["']canonical["'][^>]+href=["']https://getcodextheme\\.com${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`, "i"));
      assert.equal((html.match(/<h1\b/gi) ?? []).length, 1, `${path} should have one H1`);
      assert.match(html, /type="application\/ld\+json"/i);
      if (path !== "/themes/concepts") {
        assert.match(html, /Concept preview|Art direction reserved/i);
        assert.match(html, /Pack(?:<!-- -->)?(?:\s*)Coming soon|No download is offered/i);
      }
      if (path === "/themes/concepts/google-spectrum") {
        assert.match(html, /aria-label="Google-inspired Codex workspace"/i);
        assert.match(html, /aria-label="Google brand elements"/i);
        assert.match(html, /Google is a trademark.*not sponsored, approved, or affiliated/i);
        assert.match(html, /\/brand-marks\/google-logo\.png/i);
      }

      const title = html.match(/<title>([^<]+)<\/title>/i)?.[1];
      const description = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1];
      assert.ok(title, `${path} should have a title`);
      assert.ok(description, `${path} should have a description`);
      assert.ok(!titles.has(title), `${path} should have a unique title`);
      assert.ok(!descriptions.has(description), `${path} should have a unique description`);
      titles.add(title);
      descriptions.add(description);
    }
  }
});

test("programmatic SEO pages are unique, crawlable, and fully represented in the sitemap", async () => {
  const sitemapResponse = await request("/sitemap.xml");
  assert.equal(sitemapResponse.status, 200);
  const sitemap = await sitemapResponse.text();
  const paths = [...sitemap.matchAll(/<loc>https:\/\/getcodextheme\.com([^<]+)<\/loc>/g)]
    .map((match) => match[1])
    .filter((path) => /^\/codex-theme-(styles|use-cases|platforms)(?:\/|$)/.test(path));

  assert.equal(paths.length, 30);
  assert.equal(new Set(paths).size, paths.length);

  const titles = new Set();
  const descriptions = new Set();
  for (let offset = 0; offset < paths.length; offset += 6) {
    const batch = paths.slice(offset, offset + 6);
    const pages = await Promise.all(batch.map(async (path) => {
      const response = await request(path);
      return { path, response, html: await response.text() };
    }));

    for (const { path, response, html } of pages) {
      assert.equal(response.status, 200, `${path} should return 200`);
      assert.doesNotMatch(html, /<meta[^>]+name=["']robots["'][^>]+noindex/i, `${path} must be indexable`);
      assert.match(html, new RegExp(`<link[^>]+rel=["']canonical["'][^>]+href=["']https://getcodextheme\\.com${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`, "i"));
      assert.equal((html.match(/<h1\b/gi) ?? []).length, 1, `${path} should have one H1`);
      assert.match(html, /type="application\/ld\+json"/i);

      const title = html.match(/<title>([^<]+)<\/title>/i)?.[1];
      const description = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1];
      assert.ok(title, `${path} should have a title`);
      assert.ok(description, `${path} should have a description`);
      assert.ok(!titles.has(title), `${path} should have a unique title`);
      assert.ok(!descriptions.has(description), `${path} should have a unique description`);
      titles.add(title);
      descriptions.add(description);
    }
  }
});

test("robots allows public content and blocks private application routes", async () => {
  const response = await request("/robots.txt");
  assert.equal(response.status, 200);
  const body = await response.text();
  assert.match(body, /Allow:\s*\//i);
  assert.match(body, /Disallow:\s*\/api\//i);
  assert.match(body, /Disallow:\s*\/account/i);
  assert.doesNotMatch(body, /\/review\//i);
  assert.match(body, /Disallow:\s*\/auth\//i);
  assert.match(body, /Sitemap:\s*https:\/\/getcodextheme\.com\/sitemap\.xml/i);
});
