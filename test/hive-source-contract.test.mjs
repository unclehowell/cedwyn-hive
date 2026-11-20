import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFile(path.join(root, file), "utf8");

test("Hive Chat worker source parses as an ES module", async () => {
  const source = await read("hive/chat/worker.js");
  execFileSync(process.execPath, ["--input-type=module", "--check", "-"], {
    cwd: root,
    input: source,
    stdio: ["pipe", "pipe", "pipe"]
  });
});


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
  assert.doesNotMatch(source, /BATON\.md\.\./);
  assert.ok(source.includes('import { publicQueueJobs, publicQueueLease } from "./hive-public-queue.js";'));
  assert.ok(source.includes("hive_renew_job"));
  assert.ok(source.includes("publicQueueLease(env, name, a, callerAuth)"));
  assert.ok(source.includes('req.headers.get("authorization") || ""'));

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

test("Hive public board exposes pseudonymous workflow metadata only", async () => {
  const source = await read("worker/index.js");
  assert.ok(source.includes("function publicDraftId(id)"));
  assert.ok(source.includes('return "Draft-" + (hash >>> 0).toString(16).padStart(8, "0")'));
  assert.ok(source.includes('const NOINDEX = "noindex, nofollow, noarchive"'));
  assert.ok(source.includes('content="noindex,nofollow"'));
  assert.ok(source.includes("Draft context is private."));
  assert.ok(source.includes("Private HubSpot task"));
  assert.doesNotMatch(source, /Recipient body:/);
  assert.doesNotMatch(source, /href="\/context\/\$\{encodeURIComponent\(r\.draft\)\}"/);
  assert.doesNotMatch(source, /context: d\.context/);
  assert.doesNotMatch(source, /record: d\.record/);
});


test("Hive MCP exposes the six owner-directed operating principles", async () => {
  const worker = await read("worker/index.js");
  const chat = await read("hive/chat/worker.js");
  const join = await read("hive/JOIN.md");
  const arch = await read("hive/ARCHITECTURE.md");
  const principles = await read("hive/PRINCIPLES.md");
  for (const term of ["get_agent_principles", "Rely on facts", "Augment with AI", "Verify information", "Analogue skills", "Human connections", "Ethics"]) {
    assert.ok(worker.includes(term) || join.includes(term) || arch.includes(term) || principles.includes(term) || chat.includes(term), "missing operating principle: " + term);
  }
  assert.ok(worker.includes("principles: { version: AGENT_PRINCIPLES.version"));
  assert.ok(worker.includes("name: \"get_agent_principles\""));
  assert.ok(worker.includes("First call get_agent_principles"));
  assert.ok(worker.includes("contract (v3.31.0)"));
  assert.ok(worker.includes("protocol (v3.31.0)"));
  assert.ok(worker.includes("operating_principles: { version: \"1.0.0\""));
  assert.ok(chat.includes("## Operating principles"));
  assert.ok(chat.includes("const CW_FOOTER ="));
  assert.ok(principles.includes("Analogue skills"));
  assert.ok(join.includes("v3.31.0"));
  assert.ok(chat.includes("operating_principles"));
  assert.ok(chat.includes("https://bucklerfamily.estate/FLYWHEELS/agent-principles.md"));
  assert.doesNotMatch(chat, /reneceulen|email to legal counsel/i, "Hive Chat must not carry superseded automatic third-party contact instructions");
  assert.match(chat, /confidential threshold review|confidential review/i);
});
