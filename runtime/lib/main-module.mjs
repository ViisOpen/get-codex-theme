import { realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function canonicalPath(value) {
  try { return realpathSync(value); }
  catch { return path.resolve(value); }
}

export function isMainModule(importMetaUrl, argvEntry = process.argv[1]) {
  if (!argvEntry) return false;
  return canonicalPath(argvEntry) === canonicalPath(fileURLToPath(importMetaUrl));
}
