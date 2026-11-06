import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, "worker");
const outDir = path.join(root, ".worker-build", "ghf-watch");

function normalizeFinalLineEnding(text) {
  if (!text.endsWith("\n")) throw new Error("Text module must end with LF before packaging");
  return text.slice(0, -1) + "\r\n";
}

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
const index = await readFile(path.join(sourceDir, "index.js"), "utf8");
const seed = await readFile(path.join(sourceDir, "seed.txt"), "utf8");
const pipeline = await readFile(path.join(sourceDir, "pipeline.js"), "utf8");

if (!index.includes('import SEEDTXT from "./seed.txt";') || !index.includes('import PIPELINE_JS from "./pipeline.txt";')) {
  throw new Error("Worker module imports and packaging inputs do not agree");
}
await writeFile(path.join(outDir, "index.js"), index);
await writeFile(path.join(outDir, "seed.txt"), normalizeFinalLineEnding(seed));
await writeFile(path.join(outDir, "pipeline.txt"), normalizeFinalLineEnding(pipeline));
console.log("Packaged ghf-watch Worker modules to .worker-build/ghf-watch");
