import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
await rm(path.join(packageRoot, "resources"), { recursive: true, force: true });
for (const file of ["LICENSE", "NOTICE.md", "NOTICE-RUNTIME.md", "THIRD_PARTY_NOTICES.md"]) {
  await rm(path.join(packageRoot, file), { force: true });
}
