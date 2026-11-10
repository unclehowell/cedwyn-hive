import test from "node:test";
import assert from "node:assert/strict";
import { parsePublicIssueId, publicQueueJobs, publicQueueLease } from "../hive-public-queue.js";

test("public issue identifiers are strict and canonical", () => {
  assert.deepEqual(parsePublicIssueId("UncleHowell/Cedwyn-Hive#24"), {
    repo: "unclehowell/cedwyn-hive",
    issue_number: 24,
    task_id: "unclehowell/cedwyn-hive#24"
  });
  assert.equal(parsePublicIssueId("540712598727"), null);
  assert.equal(parsePublicIssueId("unclehowell/cedwyn-hive#0"), null);
  assert.equal(parsePublicIssueId("unclehowell/cedwyn-hive#24/claim"), null);
});

test("no binding preserves the current legacy queue path", async () => {
  assert.equal(await publicQueueJobs({}, {}), null);
  assert.equal(await publicQueueLease({}, "hive_claim_job", {}), null);
});

test("public jobs map only explicitly returned issue metadata", async () => {
  const env = {
    HIVE_QUEUE: {
      async fetch(url) {
        assert.equal(url, "https://hive-queue.internal/jobs?limit=20");
        return new Response(JSON.stringify({
          generated_at: "2026-11-10T20:00:00Z",
          source: { type: "github-issues", required_label: "hive:public" },
          counts: { open: 1, claimed: 0, takeable: 1 },
          jobs: [{
            repo: "unclehowell/cedwyn-hive",
            number: 24,
            title: "Wire public queue",
            url: "https://github.com/unclehowell/cedwyn-hive/issues/24",
            state: "open",
            priority: "HIGH",
            labels: ["hive:public", "priority:high"],
            assignees: ["agent"],
            updated_at: "2026-11-10T19:00:00Z",
            takeable: true
          }],
          next_job: {
            repo: "unclehowell/cedwyn-hive",
            number: 24,
            title: "Wire public queue",
            url: "https://github.com/unclehowell/cedwyn-hive/issues/24",
            priority: "HIGH",
            labels: ["hive:public", "priority:high"],
            takeable: true
          }
        }));
      }
    }
  };
  const result = await publicQueueJobs(env, { limit: 20 });
  assert.equal(result.schema, "hive_public_jobs/v1");
  assert.equal(result.jobs.length, 1);
  assert.equal(result.jobs[0].id, "unclehowell/cedwyn-hive#24");
  assert.equal(result.jobs[0].status, "NOT_STARTED");
  assert.equal(result.jobs[0].takeable, true);
  assert.equal(result.next_job.id, "unclehowell/cedwyn-hive#24");
  assert.equal(JSON.stringify(result).includes("issue body"), false);
});

test("claimed jobs are visible to their holder but hidden from other seats by default", async () => {
  const env = {
    HIVE_QUEUE: {
      async fetch() {
        return new Response(JSON.stringify({
          counts: { open: 2, claimed: 1, takeable: 1, HIGH: 1, NONE: 1 },
          jobs: [
            {
              repo: "unclehowell/cedwyn-hive", number: 24, title: "Claimed by ChatGPT",
              url: "https://github.com/unclehowell/cedwyn-hive/issues/24", priority: "HIGH",
              labels: ["hive:public", "priority:high"], updated_at: "2026-11-10T19:00:00Z",
              claim: { agent: "ChatGPT", claimed_at: "2026-11-10T19:00:00Z", renewed_at: "2026-11-10T19:30:00Z", expires_at: "2026-11-10T20:30:00Z" },
              takeable: false
            },
            {
              repo: "unclehowell/cedwyn-hive", number: 25, title: "Free issue",
              url: "https://github.com/unclehowell/cedwyn-hive/issues/25", priority: "NONE",
              labels: ["hive:public"], updated_at: "2026-11-10T19:00:00Z", takeable: true
            }
          ],
          next_job: {
            repo: "unclehowell/cedwyn-hive", number: 25, title: "Free issue",
            url: "https://github.com/unclehowell/cedwyn-hive/issues/25", priority: "NONE",
            labels: ["hive:public"], takeable: true
          }
        }));
      }
    }
  };
  const holder = await publicQueueJobs(env, { agent: "ChatGPT" });
  assert.deepEqual(holder.jobs.map(x => x.task_id), ["unclehowell/cedwyn-hive#24", "unclehowell/cedwyn-hive#25"]);
  assert.equal(holder.jobs[0].status, "IN_PROGRESS");
  const other = await publicQueueJobs(env, { agent: "Claude" });
  assert.deepEqual(other.jobs.map(x => x.task_id), ["unclehowell/cedwyn-hive#25"]);
  const inProgress = await publicQueueJobs(env, { agent: "ChatGPT", status: "IN_PROGRESS" });
  assert.deepEqual(inProgress.jobs.map(x => x.task_id), ["unclehowell/cedwyn-hive#24"]);
});

test("claim, renew and release call the matching authenticated lease endpoint", async () => {
  const calls = [];
  const env = {
    HIVE_QUEUE_TOKEN: "test-token",
    HIVE_QUEUE_AGENT_TOKENS: JSON.stringify({ ChatGPT: "chatgpt-seat-token" }),
    HIVE_QUEUE: {
      async fetch(url, init) {
        calls.push({ url, init });
        return new Response(JSON.stringify({ ok: true, lease: { agent: "ChatGPT", expires_at: "2026-11-10T21:00:00Z" } }));
      }
    }
  };
  for (const [tool, path] of [
    ["hive_claim_job", "/claim"],
    ["hive_renew_job", "/renew"],
    ["hive_release_job", "/release"]
  ]) {
    const result = await publicQueueLease(env, tool, { task_id: "unclehowell/cedwyn-hive#24", agent: "ChatGPT" }, "Bearer chatgpt-seat-token");
    assert.equal(result.ok, true);
    assert.equal(result.http_status, 200);
    assert.equal(result.operation, tool);
  }
  assert.deepEqual(calls.map(x => x.url), [
    "https://hive-queue.internal/claim",
    "https://hive-queue.internal/renew",
    "https://hive-queue.internal/release"
  ]);
  for (const call of calls) {
    assert.equal(call.init.headers.authorization, "Bearer test-token");
    assert.deepEqual(JSON.parse(call.init.body), {
      repo: "unclehowell/cedwyn-hive", issue_number: 24, agent: "ChatGPT"
    });
  }
});

test("lease mutations reject missing or wrong per-seat credentials before reaching the queue", async () => {
  const env = {
    HIVE_QUEUE_TOKEN: "internal-token",
    HIVE_QUEUE_AGENT_TOKENS: JSON.stringify({ ChatGPT: "chatgpt-seat-token" }),
    HIVE_QUEUE: { fetch: async () => { throw new Error("must not call"); } }
  };
  const args = { task_id: "unclehowell/cedwyn-hive#24", agent: "ChatGPT" };
  const missing = await publicQueueLease(env, "hive_claim_job", args);
  const wrong = await publicQueueLease(env, "hive_claim_job", args, "Bearer wrong-token");
  assert.equal(missing.ok, false);
  assert.equal(missing.http_status, 401);
  assert.equal(wrong.ok, false);
  assert.equal(wrong.http_status, 401);
});

test("an authenticated seat still fails closed without the internal queue secret", async () => {
  const env = {
    HIVE_QUEUE_AGENT_TOKENS: JSON.stringify({ ChatGPT: "chatgpt-seat-token" }),
    HIVE_QUEUE: { fetch: async () => { throw new Error("must not call"); } }
  };
  const result = await publicQueueLease(env, "hive_claim_job", {
    task_id: "unclehowell/cedwyn-hive#24", agent: "ChatGPT"
  }, "Bearer chatgpt-seat-token");
  assert.equal(result.ok, false);
  assert.equal(result.http_status, 503);
  assert.match(result.error, /HIVE_QUEUE_TOKEN/);
});
