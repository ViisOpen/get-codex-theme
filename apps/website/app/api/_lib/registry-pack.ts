import JSZip from "jszip";
import { CLI_COMMAND } from "@/lib/distribution";
import { getTheme } from "@/lib/themes";

const REQUIRED_THEME_FILES = [
  "LICENSE-ASSETS.txt",
  "assets/background.jpg",
  "assets/background-16x9.jpg",
  "assets/background-4x3.jpg",
  "assets/preview.jpg",
  "screenshots/home.jpg",
  "screenshots/task.jpg",
  "screenshots/narrow.jpg",
  "tokens/visual-theme.json",
] as const;

function optionalBrandLogo(manifest: { assets?: { brandLogo?: unknown } }) {
  const value = manifest.assets?.brandLogo;
  if (value === undefined) return null;
  if (typeof value !== "string" || !/^assets\/[a-z0-9][a-z0-9._/-]*\.(?:png|jpe?g|webp)$/i.test(value) || value.split("/").includes("..")) {
    throw new Error("Published theme manifest contains an invalid brand logo path.");
  }
  return value;
}

function optionalCaptureEvidence(manifest: { assets?: { captureEvidence?: unknown } }) {
  const value = manifest.assets?.captureEvidence;
  if (value === undefined) return null;
  if (value !== "screenshots/capture-evidence.json") {
    throw new Error("Published theme manifest contains an invalid capture evidence path.");
  }
  return value;
}

function optionalPreviewEvidence(manifest: { assets?: { previewEvidence?: unknown } }) {
  const value = manifest.assets?.previewEvidence;
  if (value === undefined) return null;
  if (value !== "screenshots/preview-evidence.json") {
    throw new Error("Published theme manifest contains an invalid preview evidence path.");
  }
  return value;
}

const ARCHIVE_DATE = new Date("2026-01-01T00:00:00.000Z");

async function sha256(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function fetchStaticFile(origin: string, pathname: string, fetchImpl: typeof fetch) {
  const url = new URL(pathname, origin);
  const response = await fetchImpl(url, { headers: { accept: "application/octet-stream" } });
  if (!response.ok) throw new Error(`Missing registry pack file: ${pathname}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > 16 * 1024 * 1024) throw new Error(`Registry pack file exceeds 16 MB: ${pathname}`);
  return bytes;
}

export async function buildRegistryThemePack(slug: string, origin: string, fetchImpl: typeof fetch = fetch) {
  const theme = getTheme(slug);
  if (!theme) return null;

  const zip = new JSZip();
  const files = new Map<string, Uint8Array>();
  const add = (archivePath: string, bytes: Uint8Array) => {
    files.set(archivePath, bytes);
    zip.file(archivePath, bytes, { date: ARCHIVE_DATE });
  };

  const manifestBytes = await fetchStaticFile(origin, `/theme-packs/${encodeURIComponent(slug)}/manifest.json`, fetchImpl);
  add("manifest.json", manifestBytes);
  const manifest = JSON.parse(new TextDecoder().decode(manifestBytes)) as { id?: string; name?: string; version?: string; assets?: { brandLogo?: unknown; captureEvidence?: unknown; previewEvidence?: unknown } };
  if (manifest.id !== slug || typeof manifest.name !== "string" || typeof manifest.version !== "string") throw new Error("Published theme manifest does not match its registry entry.");

  const filesToFetch = [...REQUIRED_THEME_FILES];
  const brandLogo = optionalBrandLogo(manifest);
  if (brandLogo) filesToFetch.push(brandLogo as (typeof REQUIRED_THEME_FILES)[number]);
  const captureEvidence = optionalCaptureEvidence(manifest);
  if (captureEvidence) filesToFetch.push(captureEvidence as (typeof REQUIRED_THEME_FILES)[number]);
  const previewEvidence = optionalPreviewEvidence(manifest);
  if (previewEvidence) filesToFetch.push(previewEvidence as (typeof REQUIRED_THEME_FILES)[number]);
  for (const file of filesToFetch) {
    add(file, await fetchStaticFile(origin, `/theme-packs/${encodeURIComponent(slug)}/${file}`, fetchImpl));
  }

  const readme = new TextEncoder().encode(`# ${theme.name}\n\nUnofficial visual theme for Codex Desktop.\n\n## Install and select\n\n\`\`\`bash\n${CLI_COMMAND} use ${slug}@${manifest.version}\n\`\`\`\n\nThis verifies the Registry archive and packaged file checksums, installs the pack, and selects it without restarting Codex.\n\n## Verify\n\n\`\`\`bash\n${CLI_COMMAND} status --json\n\`\`\`\n\nConfirm that \`activeTheme.id\` is \`${slug}\` and \`activeTheme.version\` is \`${manifest.version}\`. If no theme runtime is running, start it without forcing a restart:\n\n\`\`\`bash\n${CLI_COMMAND} launch\n\`\`\`\n\n## Restore\n\n\`\`\`bash\n${CLI_COMMAND} restore\n\`\`\`\n\nOnly add \`--restart\` after saving active work and deliberately choosing to restart Codex.\n`);
  add("README.md", readme);

  const checksumLines = await Promise.all([...files.entries()].sort(([a], [b]) => a.localeCompare(b)).map(async ([file, bytes]) => `${await sha256(bytes)}  ${file}`));
  zip.file("checksums.sha256", `${checksumLines.join("\n")}\n`, { date: ARCHIVE_DATE });

  const bytes = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
    platform: "UNIX",
  });
  return {
    bytes,
    filename: `${slug}-codex-theme-v${manifest.version}.zip`,
    sha256: await sha256(bytes),
    version: manifest.version,
  };
}

export async function buildCommunityRegistryThemePack(sourceArchive: ArrayBuffer) {
  const source = await JSZip.loadAsync(sourceArchive);
  const manifestEntry = source.file("manifest.json");
  if (!manifestEntry) throw new Error("Published theme archive is missing manifest.json.");
  const manifest = JSON.parse(await manifestEntry.async("string")) as { id?: string; name?: string; version?: string };
  if (!manifest.id || !manifest.name || !manifest.version) throw new Error("Published theme manifest is incomplete.");

  const zip = new JSZip();
  const files = new Map<string, Uint8Array>();
  const add = (archivePath: string, bytes: Uint8Array) => {
    files.set(archivePath, bytes);
    zip.file(archivePath, bytes, { date: ARCHIVE_DATE });
  };
  for (const entry of Object.values(source.files)) {
    if (entry.dir || entry.name === "checksums.sha256" || entry.name === "README.md") continue;
    add(entry.name, await entry.async("uint8array"));
  }
  add("README.md", new TextEncoder().encode(`# ${manifest.name}\n\nThis theme-only pack passed automated package, identity, checksum, and server validation. The fixed-version Get Codex Theme CLI supplies the audited runtime during installation.\n\nInstall and select atomically without restarting Codex:\n\n\`\`\`bash\n${CLI_COMMAND} use ${manifest.id}@${manifest.version}\n\`\`\`\n\nRestore with \`${CLI_COMMAND} restore\`.\n`));
  const checksumLines = await Promise.all([...files.entries()].sort(([a], [b]) => a.localeCompare(b)).map(async ([file, bytes]) => `${await sha256(bytes)}  ${file}`));
  zip.file("checksums.sha256", `${checksumLines.join("\n")}\n`, { date: ARCHIVE_DATE });
  const bytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 6 }, platform: "UNIX" });
  return {
    bytes,
    filename: `${manifest.id}-codex-theme-v${manifest.version}.zip`,
    sha256: await sha256(bytes),
    version: manifest.version,
  };
}
