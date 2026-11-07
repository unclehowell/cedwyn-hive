import test from "node:test";
import assert from "node:assert/strict";
import { githubQueueJobs, githubQueueLease, githubQueueConfigured } from "../../worker/github-queue.js";

function fakeIssue(number, extra = {}) {
  return {
    repo: "unclehowell/cedwyn",
    number,
    title: "Public work item " + number,
    url: "https://github.com/unclehowell/cedwyn/issues/" + number,
    state: "open",
    priority: number === 1 ? "HIGH" : "LOW",
    labels: ["hive:public", "priority:low", "workstream:research"],
    assignees: [],
    created_at: "2026-11-07T00:00:00Z",
    updated_at: "2026-11-07T01:00:00Z",
    claim: null,
    ...extra
  };
}

function page(offset, items, total) {
  const next = offset + items.length < total ? offset + items.length : null;
  return {
    schema: "hive_github_jobs/v1",
    offset,
    limit: 100,
    total,
    returned: items.length,
    has_more: next !== null,
    next_offset: next,
    generated_at: "2026-11-07T02:00:00Z",
    source: {
      type: "github-issues",
      allowlisted_repositories: ["unclehowell/cedwyn"],
      required_label: "hive:public"
    },
    counts: {
      open: total, claimed: 0, takeable: total,
      priority: { HIGH: 1, MEDIUM: 0, LOW: total - 1, NONE: 0 }
    },
    jobs: items,
    next_job: items[0] || null
  };
}

function environment(handler) {
  const calls = [];
  const env = {
    GITHUB_QUEUE_TOKEN: "test-only-secret",
    GITHUB_QUEUE: {
      async fetch(request) {
        calls.push(request);
        return handler(request);
      }
    }
  };
  return { env, calls };
}

test("reads multiple issue pages through the private service binding", async () => {
  const first = Array.from({length: 100}, (_,i) => fakeIssue(i + 1));
  const second = Array.from({length: 50}, (_,i) => fakeIssue(i + 101));
  const {env,calls} = environment(async request => {
    const url = new URL(request.url);
    const offset = Number(url.searchParams.get("offset"));
    return new Response(JSON.stringify(offset === 0 ? page(0,first,150) : page(100,second,150)));
  });
  const result = await githubQueueJobs(env,{limit:150,include_claimed:"1"});
  assert.equal(calls.length,2);
  assert.equal(new URL(calls[0].url).pathname,"/jobs");
  assert.equal(new URL(calls[1].url).searchParams.get("offset"),"100");
  assert.equal(calls[0].headers.get("authorization"),"Bearer test-only-secret");
  assert.equal(result.schema,"hive_jobs/v2");
  assert.equal(result.jobs.length,150);
  assert.equal(result.jobs[0].id,"unclehowell/cedwyn#1");
  assert.equal(result.jobs[0].subject,"Public work item 1");
  assert.equal(result.jobs[0].workstream,"research");
  assert.equal(result.jobs[0].hubspot_url,undefined);
  assert.equal(JSON.stringify(result).includes("test-only-secret"),false);
  assert.equal(JSON.stringify(result).includes("hubspot"),false);
  assert.equal(result.source.total,150);
});

test("refuses an incomplete or wrong-schema queue response", async () => {
  const {env} = environment(async () => new Response(JSON.stringify({
    schema:"hive_github_jobs/v1",offset:0,total:1,returned:0,
    has_more:false,next_offset:null,jobs:[fakeIssue(1)]
  })));
  const result=await githubQueueJobs(env,{limit:1});
  assert.equal(result.jobs.length,0);
  assert.match(result.error,/schema mismatch|page count mismatch/);
});

test("reports not configured when the private service binding or token is missing", async () => {
  assert.equal(githubQueueConfigured({}),false);
  const result=await githubQueueJobs({}, {limit:10});
  assert.equal(result.error,"GitHub Issues queue service binding is not configured");
  assert.equal(result.counts.open,0);
});

test("claims, renews and releases use the internal service with the server-held bearer token", async () => {
  const seen=[];
  const {env}=environment(async request => {
    seen.push({
      path:new URL(request.url).pathname,
      method:request.method,
      auth:request.headers.get("authorization"),
      body:request.method==="POST"?await request.json():null
    });
    return new Response(JSON.stringify({ok:true,operation:new URL(request.url).pathname}));
  });
  for (const operation of ["hive_claim_job","hive_renew_job","hive_release_job"]) {
    const result=await githubQueueLease(env,operation,{
      repo:"unclehowell/cedwyn",issue_number:42,agent:"Tab",note:"test"
    });
    assert.equal(result.ok,true);
  }
  assert.deepEqual(seen.map(x=>x.path),["/claim","/renew","/release"]);
  assert.ok(seen.every(x=>x.method==="POST"&&x.auth==="Bearer test-only-secret"));
  assert.deepEqual(seen[0].body,{repo:"unclehowell/cedwyn",issue_number:42,agent:"Tab",note:"test"});
});

test("rejects malformed issue identity before making an internal request", async () => {
  const {env,calls}=environment(async()=>new Response("{}"));
  const result=await githubQueueLease(env,"hive_claim_job",{task_id:"123",agent:"Tab"});
  assert.equal(result.ok,false);
  assert.match(result.error,/repo, positive issue_number and agent/);
  assert.equal(calls.length,0);
});
