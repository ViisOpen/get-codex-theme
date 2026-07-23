import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(packageRoot, "../..");
const resources = path.join(packageRoot, "resources");
const legalFiles = ["LICENSE", "NOTICE.md", "NOTICE-RUNTIME.md", "THIRD_PARTY_NOTICES.md"];

await rm(resources, { recursive: true, force: true });
await mkdir(resources, { recursive: true });
await cp(path.join(repositoryRoot, "runtime"), path.join(resources, "runtime"), { recursive: true });
await cp(path.join(repositoryRoot, "platforms"), path.join(resources, "platforms"), { recursive: true });
for (const file of legalFiles) await cp(path.join(repositoryRoot, file), path.join(packageRoot, file));
