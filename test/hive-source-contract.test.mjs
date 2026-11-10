import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFile(path.join(root, file), "utf8");

test("Hive Worker shared-state sources point at the split repository main branch", async () => {
  const source = await read("worker/index.js");
  const expected = [
    "https://raw.githubusercontent.com/unclehowell/cedwyn-hive/main/hive/BOARD.json",
    "https://raw.githubusercontent.com/unclehowell/cedwyn-hive/main/hive/ROSTER.json",
    "https://raw.githubusercontent.com/unclehowell/cedwyn-hive/main/hive/AUTOMATION.html",
    "https://raw.githubusercontent.com/unclehowell/cedwyn-hive/main/hive/AUTOMATION.json",
    "https://raw.githubusercontent.com/unclehowell/cedwyn-hive/main/hive/JOIN.md",
    "https://github.com/unclehowell/cedwyn-hive/blob/main/hive/JOIN.md",
    "https://github.com/unclehowell/cedwyn-hive/tree/main/hive"
  ];

  for (const url of expected) {
    assert.ok(source.includes(url), `missing Hive source URL: ${url}`);
  }

  assert.doesNotMatch(
    source,
    /https:\/\/raw\.githubusercontent\.com\/unclehowell\/cedwyn\/hive\/hive\//
  );
  assert.doesNotMatch(
    source,
    /https:\/\/github\.com\/unclehowell\/cedwyn\/(?:blob|tree)\/hive\/hive/
  );
  assert.ok(source.includes(
    "The Hive's canonical state files — ROSTER.json, BOARD.json, SCOREBOARD.json, JOIN.md, AUTOMATION.html, AUTOMATION.json and BATON files — live in GitHub unclehowell/cedwyn-hive, branch main, folder hive/"
  ));
  assert.ok(source.includes(
    'home_repository: \\"https://github.com/unclehowell/cedwyn-hive/tree/main/hive\\"'
  ));
});

test("Worker package reproduces the module names and text-module endings", async () => {
  execFileSync(process.execPath, ["scripts/package-worker.mjs"], {
    cwd: root,
    stdio: "pipe"
  });

  const index = await read("worker/index.js");
  const seed = await read("worker/seed.txt");
  const pipeline = await read("worker/pipeline.js");
  const builtIndex = await read(".worker-build/ghf-watch/index.js");
  const builtSeed = await read(".worker-build/ghf-watch/seed.txt");
  const builtPipeline = await read(".worker-build/ghf-watch/pipeline.txt");

  assert.equal(builtIndex, index);
  assert.equal(builtSeed, seed.slice(0, -1) + "\r\n");
  assert.equal(builtPipeline, pipeline.slice(0, -1) + "\r\n");
  assert.ok(builtIndex.includes('import PIPELINE_JS from "./pipeline.txt";'));
});
