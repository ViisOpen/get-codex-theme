import { cp, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const websiteRoot = fileURLToPath(new URL("..", import.meta.url));
const repositoryRoot = path.resolve(websiteRoot, "../..");
const publicRoot = path.join(websiteRoot, "public");
const schemaSource = path.join(repositoryRoot, "packages/theme-schema");
const themeSource = path.join(repositoryRoot, "themes/free");
const schemaTarget = path.join(publicRoot, "schema");
const themeTarget = path.join(publicRoot, "theme-packs");
const obsoleteSitesOutput = path.join(websiteRoot, "dist", ".openai");

const schemaFiles = new Map([
  ["manifest.schema.json", "manifest-v1.json"],
  ["manifest-v2.schema.json", "manifest-v2.json"],
  ["visual-theme.schema.json", "visual-theme-v1.json"],
  ["component-registry.json", "component-registry-v1.json"],
]);

await Promise.all([
  rm(schemaTarget, { recursive: true, force: true }),
  rm(themeTarget, { recursive: true, force: true }),
  rm(obsoleteSitesOutput, { recursive: true, force: true }),
]);
await Promise.all([
  mkdir(schemaTarget, { recursive: true }),
  mkdir(themeTarget, { recursive: true }),
]);

await Promise.all(
  [...schemaFiles].map(([source, target]) =>
    cp(path.join(schemaSource, source), path.join(schemaTarget, target)),
  ),
);

const themes = (await readdir(themeSource, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

await Promise.all(
  themes.map((theme) =>
    cp(path.join(themeSource, theme), path.join(themeTarget, theme), {
      recursive: true,
    }),
  ),
);

process.stdout.write(
  `Prepared ${schemaFiles.size} schemas and ${themes.length} theme packs from the monorepo source.\n`,
);
