import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { COMPONENT_TOKEN_SPEC, createComponentContract } from "../packages/theme-cli/src/component-contract.mjs";

const root = path.resolve(process.argv[2] ?? "themes/free");
const entries = await readdir(root, { withFileTypes: true });
let changed = 0;
for (const entry of entries) {
  if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
  const tokenPath = path.join(root, entry.name, "tokens/visual-theme.json");
  let tokens;
  try { tokens = JSON.parse(await readFile(tokenPath, "utf8")); }
  catch { continue; }
  if (tokens.schemaVersion === 2 && tokens.componentSchemaVersion === 2) continue;
  const pathName = ["focused", "complete", "assisted"].includes(tokens.authoring?.path) ? tokens.authoring.path : "assisted";
  const source = ["manual", "image", "brand"].includes(tokens.authoring?.source) ? tokens.authoring.source : "manual";
  const preset = ["soft", "sharp", "bold", "glass"].includes(tokens.authoring?.preset) ? tokens.authoring.preset : undefined;
  const selected = Array.isArray(tokens.coverage?.enabled) ? tokens.coverage.enabled : undefined;
  const contract = createComponentContract(tokens.palette, { path: pathName, components: selected, source, preset });
  for (const [group, values] of Object.entries(contract.components)) {
    const previous = tokens.components?.[group];
    if (!previous || typeof previous !== "object" || Array.isArray(previous)) continue;
    for (const key of Object.keys(COMPONENT_TOKEN_SPEC[group])) {
      if (previous[key] !== undefined) values[key] = previous[key];
    }
  }
  if (Array.isArray(tokens.coverage?.customized) && Array.isArray(tokens.coverage?.generated)) {
    contract.coverage.customized = tokens.coverage.customized.filter((group) => contract.coverage.enabled.includes(group));
    contract.coverage.generated = tokens.coverage.generated.filter((group) => contract.coverage.enabled.includes(group) && !contract.coverage.customized.includes(group));
  }
  const { layoutContractSchemaVersion: _layoutVersion, layoutContracts: _layoutContracts, ...base } = tokens;
  await writeFile(tokenPath, `${JSON.stringify({ ...base, schemaVersion: 2, ...contract }, null, 2)}\n`);
  changed += 1;
}
process.stdout.write(`Migrated ${changed} theme token file${changed === 1 ? "" : "s"} under ${root}.\n`);
