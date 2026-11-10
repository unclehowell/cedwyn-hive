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
    status: claim ? "IN_PROGRESS" : "NOT_STARTED",
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
  let jobs = issues.map(mapIssue).filter(Boolean);
  if (query.status) jobs = jobs.filter(x => x.status === String(query.status).toUpperCase());
  if (query.priority) jobs = jobs.filter(x => x.priority === String(query.priority).toUpperCase());
  if (query.workstream && String(query.workstream) !== "public-github-issues") jobs = [];
  if (!(query.include_claimed === "1" || query.include_claimed === true || query.include_claimed === "true")) {
    jobs = jobs.filter(x => !x.claim || (query.agent && x.claim.agent === safeAgent(query.agent)));
  }
  const next_job = data.next_job ? mapIssue(data.next_job) : jobs.find(x => x.takeable) || null;
  const counts = {
    open: Number(data.counts?.open) || issues.length,
    claimed: Number(data.counts?.claimed) || issues.filter(x => x.claim).length,
    takeable: Number(data.counts?.takeable) || issues.filter(x => x.takeable).length,
    HIGH: Number(data.counts?.HIGH) || issues.filter(x => x.priority === "HIGH").length,
    MEDIUM: Number(data.counts?.MEDIUM) || issues.filter(x => x.priority === "MEDIUM").length,
    LOW: Number(data.counts?.LOW) || issues.filter(x => x.priority === "LOW").length,
    NONE: Number(data.counts?.NONE) || issues.filter(x => x.priority === "NONE").length
  };
  return {
    schema: "hive_public_jobs/v1",
    version: "1",
    generated: data.generated_at || new Date().toISOString(),
    source: data.source,
    counts,
    next_job,
    returned: jobs.length,
    jobs: jobs.slice(0, limit),
    rule: "This queue contains public GitHub issues only. Email drafts, correspondence and private case tasks remain in HubSpot and must not be copied here."
  };
}

function constantTimeEqual(left, right) {
  const a = new TextEncoder().encode(String(left || ""));
  const b = new TextEncoder().encode(String(right || ""));
  let diff = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) diff |= (a[i] || 0) ^ (b[i] || 0);
  return diff === 0;
}

export async function publicQueueLease(env, toolName, args = {}, authorization = "") {
  if (!env || !env.HIVE_QUEUE) return null;
  const ref = parsePublicIssueId(args.task_id || args.id);
  const agent = safeAgent(args.agent);
  if (!ref) return { ok: false, error: "task_id must be a public issue id in owner/repository#number form", http_status: 400 };
  if (!agent) return { ok: false, error: "agent is required", http_status: 400 };
  let seatTokens = {};
  try { seatTokens = JSON.parse(env.HIVE_QUEUE_AGENT_TOKENS || "{}"); } catch { seatTokens = {}; }
  const expected = seatTokens && typeof seatTokens === "object" ? seatTokens[agent] : null;
  const supplied = String(authorization || "").replace(/^Bearer\\s+/i, "").trim();
  if (typeof expected !== "string" || !expected || !constantTimeEqual(expected, supplied)) {
    return { ok: false, error: "unauthorized Hive seat credential", http_status: 401 };
  }
  if (!env.HIVE_QUEUE_TOKEN) return { ok: false, error: "public issue lease writes are disabled: HIVE_QUEUE_TOKEN is not configured", http_status: 503 };

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
