const baseUrl = new URL(process.env.DEPLOYMENT_URL ?? "https://getcodextheme.com");
const attempts = 5;

function expectedContentType(pathname) {
  if (pathname.endsWith(".css")) return "text/css";
  if (pathname.endsWith(".js")) return "javascript";
  if (pathname.endsWith(".woff2")) return "font/woff2";
  return null;
}

async function verify() {
  const page = await fetch(baseUrl, { headers: { "cache-control": "no-cache" } });
  if (!page.ok) throw new Error(`Homepage returned ${page.status}.`);
  if (page.headers.get("x-getcodextheme-deployment") !== "cloudflare-owned") {
    throw new Error("Homepage did not come from the Cloudflare-owned Worker.");
  }

  const html = await page.text();
  const assetPaths = [...new Set(
    [...html.matchAll(/<(?:link|script)[^>]+(?:href|src)="(\/assets\/[^"]+)"/g)].map((match) => match[1]),
  )];
  if (!assetPaths.some((pathname) => pathname.endsWith(".css")) || !assetPaths.some((pathname) => pathname.endsWith(".js"))) {
    throw new Error("Homepage did not reference both CSS and JavaScript assets.");
  }

  const failures = [];
  for (const pathname of assetPaths) {
    const response = await fetch(new URL(pathname, baseUrl), { headers: { "cache-control": "no-cache" } });
    const contentType = response.headers.get("content-type") ?? "";
    const expected = expectedContentType(pathname);
    if (!response.ok || (expected && !contentType.includes(expected))) {
      failures.push(`${pathname}: ${response.status} ${contentType || "missing content-type"}`);
    }
    await response.body?.cancel();
  }
  if (failures.length) throw new Error(`Static asset verification failed:\n${failures.join("\n")}`);
  return assetPaths.length;
}

let lastError;
for (let attempt = 1; attempt <= attempts; attempt += 1) {
  try {
    const count = await verify();
    console.log(`Verified ${count} linked CSS, JavaScript, and font assets at ${baseUrl.origin}.`);
    process.exit(0);
  } catch (error) {
    lastError = error;
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
}

throw lastError;
