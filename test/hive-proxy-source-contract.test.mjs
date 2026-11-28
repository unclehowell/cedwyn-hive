import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));
const source = await readFile(path.join(root, "../worker/hive-proxy-index.js"), "utf8");

test("Hive proxy reads JOIN.md from the dedicated Hive repository", () => {
  assert.ok(source.includes("https://raw.githubusercontent.com/unclehowell/cedwyn-hive/main/hive/JOIN.md"));
  assert.doesNotMatch(source, /raw\.githubusercontent\.com\/unclehowell\/cedwyn\/hive\/hive\/JOIN\.md/);
});
