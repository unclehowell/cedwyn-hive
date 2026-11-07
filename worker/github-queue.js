const PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 200;
const MAX_QUEUE_OFFSET = 3000;

export function githubQueueConfigured(env) {
  return !!(env && env.GITHUB_QUEUE && typeof env.GITHUB_QUEUE.fetch === "function" && env.GITHUB_QUEUE_TOKEN);
}

async function queueRequest(env, path, method = "GET", body = null) {
  if (!githubQueueConfigured(env)) {
    return { ok: false, status: 503, error: "GitHub Issues queue service binding is not configured" };
  }
  const headers = {
    accept: "application/json",
    authorization: "Bearer " + env.GITHUB_QUEUE_TOKEN
  };
  if (body !== null) headers["content-type"] = "application/json";
  let response;
  try {
    response = await env.GITHUB_QUEUE.fetch(new Request("https://github-queue.internal" + path, {
      method,
      headers,
      body: body === null ? undefined : JSON.stringify(body)
    }));
  } catch (error) {
    return { ok: false, status: 502, error: "GitHub Issues queue service unavailable: " + String(error && error.message || error).slice(0, 160) };
  }
  let payload;
  try { payload = await response.json(); }
  catch { return { ok: false, status: 502, error: "GitHub Issues queue returned invalid JSON" }; }
  if (!response.ok) {
    return { ok: false, status: response.status, error: String(payload.error || "GitHub Issues queue request failed"), detail: payload.detail };
  }
  return { ok: true, status: response.status, payload };
}

function publicJob(issue, rank) {
  const labels = Array.isArray(issue.labels) ? issue.labels.filter(x => typeof x === "string") : [];
  const workstream = labels.find(x => /^(workstream|area):/i.test(x));
  return {
    rank,
    id: String(issue.repo) + "#" + String(issue.number),
    repo: String(issue.repo),
    issue_number: Number(issue.number),
    subject: String(issue.title || "Untitled issue"),
    status: "OPEN",
    priority: ["HIGH", "MEDIUM", "LOW"].includes(issue.priority) ? issue.priority : "NONE",
    due: null,
    overdue: false,
    modified: issue.updated_at || null,
    created: issue.created_at || null,
    workstream: workstream ? workstream.split(":").slice(1).join(":") : null,
    label: labels.filter(x => x !== "hive:public" && x !== workstream).join(", ") || null,
    url: String(issue.url || ""),
    assignees: Array.isArray(issue.assignees) ? issue.assignees.slice(0, 10) : [],
    claim: issue.claim || null,
    takeable: !issue.claim,
    visibility: "public-github-issue"
  };
}

function includeJob(job, q) {
  if (q.priority && job.priority !== String(q.priority).toUpperCase()) return false;
  if (q.workstream && job.workstream !== String(q.workstream)) return false;
  if (q.status && !["OPEN", "ALL"].includes(String(q.status).toUpperCase())) return false;
  if (!(q.include_claimed === "1" || q.include_claimed === true || q.include_claimed === "true")) {
    if (job.claim && (!q.agent || job.claim.agent !== String(q.agent))) return false;
  }
  return true;
}

export async function githubQueueJobs(env, q = {}) {
  const requested = Math.max(1, Math.min(MAX_PAGE_SIZE, Number(q.limit) || 50));
  const initialOffset = Math.max(0, Math.min(MAX_QUEUE_OFFSET, Number(q.offset) || 0));
  const collected = [];
  let cursor = initialOffset;
  let queueMeta = null;
  let pageCount = 0;

  while (collected.length < requested) {
    const take = Math.min(PAGE_SIZE, requested - collected.length);
    const result = await queueRequest(env, "/jobs?limit=" + take + "&offset=" + cursor);
    if (!result.ok) return {
      schema: "hive_jobs/v2",
      source: { type: "github-issues" },
      rule: GITHUB_JOB_RULE,
      error: result.error,
      detail: result.detail || null,
      jobs: [],
      next_job: null,
      counts: { open: 0, claimed: 0, takeable: 0, HIGH: 0, MEDIUM: 0, LOW: 0, NONE: 0 }
    };
    const payload = result.payload;
    if (payload.schema !== "hive_github_jobs/v1" ||
        !Array.isArray(payload.jobs) ||
        payload.offset !== cursor ||
        !Number.isSafeInteger(payload.total) ||
        !Number.isSafeInteger(payload.returned) ||
        typeof payload.has_more !== "boolean") {
      return {
        schema: "hive_jobs/v2",
        source: { type: "github-issues" },
        rule: GITHUB_JOB_RULE,
        error: "GitHub Issues queue pagination schema mismatch; refusing an incomplete result",
        jobs: [],
        next_job: null,
        counts: { open: 0, claimed: 0, takeable: 0, HIGH: 0, MEDIUM: 0, LOW: 0, NONE: 0 }
      };
    }
    if (!queueMeta) queueMeta = payload;
    else if (payload.total !== queueMeta.total) {
      return {
        schema: "hive_jobs/v2",
        source: { type: "github-issues" },
        rule: GITHUB_JOB_RULE,
        error: "GitHub issue total changed during queue pagination; retry the read",
        jobs: [],
        next_job: null,
        counts: { open: 0, claimed: 0, takeable: 0, HIGH: 0, MEDIUM: 0, LOW: 0, NONE: 0 }
      };
    }
    if (payload.jobs.length !== payload.returned) {
      return {
        schema: "hive_jobs/v2",
        source: { type: "github-issues" },
        rule: GITHUB_JOB_RULE,
        error: "GitHub queue page count mismatch; refusing a partial result",
        jobs: [],
        next_job: null,
        counts: { open: 0, claimed: 0, takeable: 0, HIGH: 0, MEDIUM: 0, LOW: 0, NONE: 0 }
      };
    }
    collected.push(...payload.jobs.map((x, i) => publicJob(x, cursor + i + 1)));
    pageCount++;
    if (!payload.has_more || payload.next_offset === null) break;
    if (payload.next_offset <= cursor || payload.next_offset !== cursor + payload.returned) {
      return {
        schema: "hive_jobs/v2",
        source: { type: "github-issues" },
        rule: GITHUB_JOB_RULE,
        error: "GitHub queue returned an invalid next offset; refusing a partial result",
        jobs: [],
        next_job: null,
        counts: { open: 0, claimed: 0, takeable: 0, HIGH: 0, MEDIUM: 0, LOW: 0, NONE: 0 }
      };
    }
    cursor = payload.next_offset;
    if (payload.returned === 0) break;
  }

  const filtered = collected.filter(job => includeJob(job, q));
  const counts = {
    open: queueMeta?.counts?.open ?? queueMeta?.total ?? 0,
    claimed: queueMeta?.counts?.claimed ?? 0,
    takeable: queueMeta?.counts?.takeable ?? 0,
    HIGH: 0, MEDIUM: 0, LOW: 0, NONE: 0
  };
  const priorityCounts = queueMeta?.counts?.priority || {};
  for (const key of ["HIGH", "MEDIUM", "LOW", "NONE"]) counts[key] = Number(priorityCounts[key] ?? 0);

  const next = queueMeta?.next_job ? publicJob(queueMeta.next_job, 0) : collected.find(x => x.takeable) || null;
  return {
    schema: "hive_jobs/v2",
    version: "github-issues",
    generated: queueMeta?.generated_at || new Date().toISOString(),
    source: {
      type: "github-issues",
      allowlisted_repositories: queueMeta?.source?.allowlisted_repositories || [],
      required_label: queueMeta?.source?.required_label || "hive:public",
      pages_fetched: pageCount,
      total: queueMeta?.total ?? counts.open,
      offset: initialOffset,
      has_more: queueMeta ? initialOffset + collected.length < queueMeta.total : false,
      next_offset: queueMeta && initialOffset + collected.length < queueMeta.total ? initialOffset + collected.length : null
    },
    rule: GITHUB_JOB_RULE,
    order: "GitHub Issues: explicit public opt-in label; priority order; issue state and acceptance remain on GitHub",
    claim: {
      lease_minutes: 60,
      claim: "POST /hive/api/jobs/claim {repo, issue_number, agent, note?}",
      renew: "POST /hive/api/jobs/renew {repo, issue_number, agent}",
      release: "POST /hive/api/jobs/release {repo, issue_number, agent, note?}",
      source_of_truth: "GitHub Issues"
    },
    counts,
    next_job: next && includeJob(next, q) ? next : filtered.find(x => x.takeable) || null,
    returned: filtered.length,
    jobs: filtered
  };
}

export async function githubQueueLease(env, operation, args = {}) {
  const repo = String(args.repo || "").trim().toLowerCase();
  const number = Number(args.issue_number);
  const agent = String(args.agent || "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 60);
  if (!/^[a-z0-9_.-]+\/[a-z0-9_.-]+$/.test(repo) ||
      !Number.isSafeInteger(number) || number < 1 || !agent) {
    return { ok: false, error: "repo, positive issue_number and agent are required" };
  }
  const path = operation === "hive_claim_job" ? "/claim" :
    operation === "hive_renew_job" ? "/renew" :
    operation === "hive_release_job" ? "/release" : null;
  if (!path) return { ok: false, error: "unsupported GitHub issue lease operation" };
  const result = await queueRequest(env, path, "POST", {
    repo,
    issue_number: number,
    agent,
    note: args.note ? String(args.note).slice(0, 200) : undefined
  });
  if (!result.ok) return { ok: false, error: result.error, status: result.status, detail: result.detail || undefined };
  return result.payload;
}

export const GITHUB_JOB_RULE = "Public project work is tracked on GitHub Issues. Discover only issues in the configured repository allowlist carrying the hive:public label. Claim/renew/release the lease keyed by repo#issue_number. GitHub remains authoritative for issue state, priority, owner, dependencies, blockers, decisions and acceptance. HubSpot is reserved for private recipient-facing drafts and exact-version correspondence review; never claim or mirror a HubSpot project task.";
