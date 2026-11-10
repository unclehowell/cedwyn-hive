const MAX_LIMIT = 100;
const ISSUE_ID = /^([a-z0-9_.-]+\/[a-z0-9_.-]+)#([1-9][0-9]{0,8})$/i;

function safeAgent(value) {
  return String(value || "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 60);
}

export function parsePublicIssueId(value) {
  const match = String(value || "").trim().match(ISSUE_ID);
  if (!match) return null;
  const number = Number(match[2]);
  if (!Number.isSafeInteger(number) || number < 1) return null;
  return { repo: match[1].toLowerCase(), issue_number: number, task_id: match[1].toLowerCase() + "#" + number };
}

function mapIssue(issue, index = 0) {
  const repo = String(issue?.repo || "").toLowerCase();
  const number = Number(issue?.number);
  if (!/^[a-z0-9_.-]+\/[a-z0-9_.-]+$/.test(repo) || !Number.isSafeInteger(number) || number < 1) return null;
  const labels = Array.isArray(issue.labels) ? issue.labels.map(x => String(x).slice(0, 80)).slice(0, 20) : [];
  const id = repo + "#" + number;
  const claim = issue.claim && typeof issue.claim === "object" ? {
    agent: safeAgent(issue.claim.agent),
    claimed_at: issue.claim.claimed_at || null,
    renewed_at: issue.claim.renewed_at || null,
    expires: issue.claim.expires_at || null
  } : null;
  return {
    rank: index + 1,
    id,
    task_id: id,
    repo,
    issue_number: number,
    status: "NOT_STARTED",
    priority: ["HIGH", "MEDIUM", "LOW"].includes(issue.priority) ? issue.priority : "NONE",
    due: null,
    overdue: false,
    modified: issue.updated_at || null,
    workstream: "public-github-issues",
    label: labels.find(x => !/^priority:/i.test(x)) || "Public project issue",
    public_label: labels.find(x => !/^priority:/i.test(x)) || "Public project issue",
    subject: String(issue.title || "Untitled public issue").slice(0, 240),
    public_subject: String(issue.title || "Untitled public issue").slice(0, 240),
    visibility: "public",
    url: String(issue.url || "").slice(0, 500),
    hubspot_url: null,
    labels,
    claim,
    takeable: issue.takeable === true && !claim
  };
}

async function readJson(response) {
  try { return await response.json(); }
  catch { return { error: "queue service returned invalid JSON" }; }
}

export async function publicQueueJobs(env, query = {}) {
  if (!env || !env.HIVE_QUEUE) return null;
  const limit = Math.max(1, Math.min(MAX_LIMIT, Number(query.limit) || 50));
  const response = await env.HIVE_QUEUE.fetch("https://hive-queue.internal/jobs?limit=" + limit);
  const data = await readJson(response);
  if (!response.ok || data?.error) {
    return {
      schema: "hive_public_jobs/v1",
      error: String(data?.detail || data?.error || "public issue queue unavailable").slice(0, 500),
      rule: "Only open GitHub issues with the explicit hive:public label in the configured repository allowlist appear here. Private email drafts remain in HubSpot.",
      jobs: [],
      next_job: null
    };
  }
  const issues = Array.isArray(data.jobs) ? data.jobs : [];
  const jobs = issues.map(mapIssue).filter(Boolean);
  const next_job = data.next_job ? mapIssue(data.next_job) : jobs.find(x => x.takeable) || null;
  const counts = {
    open: Number(data.counts?.open) || jobs.length,
    claimed: Number(data.counts?.claimed) || jobs.filter(x => x.claim).length,
    takeable: Number(data.counts?.takeable) || jobs.filter(x => x.takeable).length,
    HIGH: jobs.filter(x => x.priority === "HIGH").length,
    MEDIUM: jobs.filter(x => x.priority === "MEDIUM").length,
    LOW: jobs.filter(x => x.priority === "LOW").length,
    NONE: jobs.filter(x => x.priority === "NONE").length
  };
  return {
    schema: "hive_public_jobs/v1",
    version: "1",
    generated: data.generated_at || new Date().toISOString(),
    source: data.source,
    counts,
    next_job,
    returned: jobs.length,
    jobs,
    rule: "This queue contains public GitHub issues only. Email drafts, correspondence and private case tasks remain in HubSpot and must not be copied here."
  };
}

export async function publicQueueLease(env, toolName, args = {}) {
  if (!env || !env.HIVE_QUEUE) return null;
  const ref = parsePublicIssueId(args.task_id || args.id);
  const agent = safeAgent(args.agent);
  if (!ref) return { ok: false, error: "task_id must be a public issue id in owner/repository#number form" };
  if (!agent) return { ok: false, error: "agent is required" };
  if (!env.HIVE_QUEUE_TOKEN) return { ok: false, error: "public issue lease writes are disabled: HIVE_QUEUE_TOKEN is not configured" };

  const route = {
    hive_claim_job: "/claim",
    hive_renew_job: "/renew",
    hive_release_job: "/release"
  }[toolName];
  if (!route) return { ok: false, error: "unknown public issue lease operation" };

  const response = await env.HIVE_QUEUE.fetch("https://hive-queue.internal" + route, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer " + env.HIVE_QUEUE_TOKEN
    },
    body: JSON.stringify({ repo: ref.repo, issue_number: ref.issue_number, agent })
  });
  const data = await readJson(response);
  return {
    ...data,
    ok: response.ok && data?.ok !== false,
    task_id: ref.task_id,
    repo: ref.repo,
    issue_number: ref.issue_number,
    operation: toolName,
    http_status: response.status
  };
}
