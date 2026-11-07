import { corsHeaders } from "./cors.js";
import { IssueLease } from "./issue-lease.js";
import { fetchAllSearchPages } from "./github-pagination.js";
import { issuePage } from "./issue-page.js";

const API = "https://api.github.com";
const LABEL = "hive:public";
const MAX_REPOS = 30;
const MAX_LIMIT = 100;
const GITHUB_SEARCH_PAGE_SIZE = 100;
const GITHUB_SEARCH_MAX_PAGES = 10;
const DEFAULT_TTL = 60 * 60 * 1000;

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra }
  });
}

function repoAllowlist(env) {
  return String(env.PUBLIC_REPOS || "").split(",").map(x => x.trim().toLowerCase()).filter(Boolean).slice(0, MAX_REPOS);
}

function validRepo(repo, repos) {
  const value = String(repo || "").trim().toLowerCase();
  return repos.includes(value) && /^[a-z0-9_.-]+\/[a-z0-9_.-]+$/.test(value) ? value : null;
}

function priority(labels) {
  const names = labels.map(x => String(x.name || "").toLowerCase());
  if (names.some(x => x === "priority:critical" || x === "priority:high")) return "HIGH";
  if (names.some(x => x === "priority:medium")) return "MEDIUM";
  if (names.some(x => x === "priority:low")) return "LOW";
  return "NONE";
}

function publicIssue(item) {
  const labels = Array.isArray(item.labels) ? item.labels.map(x => String(x.name || "")).filter(Boolean) : [];
  return {
    repo: String(item.repository_url || "").split("/").slice(-2).join("/").toLowerCase(),
    number: Number(item.number),
    title: String(item.title || "").slice(0, 240),
    url: String(item.html_url || ""),
    state: String(item.state || ""),
    priority: priority(labels),
    labels: labels.slice(0, 20),
    assignees: Array.isArray(item.assignees) ? item.assignees.map(x => String(x.login || "")).filter(Boolean).slice(0, 10) : [],
    created_at: item.created_at || null,
    updated_at: item.updated_at || null
  };
}

async function githubIssues(repo, env) {
  const q = encodeURIComponent("repo:" + repo + " is:issue is:open label:" + LABEL);
  const items = await fetchAllSearchPages(async page => {
    const url = API + "/search/issues?q=" + q + "&per_page=" + GITHUB_SEARCH_PAGE_SIZE + "&page=" + page + "&sort=updated&order=desc";
    const response = await fetch(url, {
      headers: { accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", "user-agent": "cedwyn-hive-queue" },
      cf: { cacheTtl: 30, cacheEverything: true }
    });
    if (!response.ok) throw new Error("GitHub issue search failed for " + repo + " (HTTP " + response.status + ")");
    return response.json();
  }, { pageSize: GITHUB_SEARCH_PAGE_SIZE, maxPages: GITHUB_SEARCH_MAX_PAGES });
  return items.filter(item => !item.pull_request && item.state === "open" &&
    (item.labels || []).some(x => String(x.name || "").toLowerCase() === LABEL)).map(publicIssue);
}

async function issueIsEligible(repo, number) {
  const response = await fetch(API + "/repos/" + repo + "/issues/" + number, {
    headers: { accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", "user-agent": "cedwyn-hive-queue" }
  });
  if (!response.ok) return false;
  const issue = await response.json();
  return !issue.pull_request && issue.state === "open" &&
    Array.isArray(issue.labels) && issue.labels.some(x => String(x.name || "").toLowerCase() === LABEL);
}

async function tokenMatches(expected, supplied) {
  if (!expected || !supplied) return false;
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
    crypto.subtle.digest("SHA-256", encoder.encode(supplied))
  ]);
  const left = new Uint8Array(a), right = new Uint8Array(b);
  let mismatch = 0;
  for (let i = 0; i < left.length; i++) mismatch |= left[i] ^ right[i];
  return mismatch === 0;
}

function objectFor(env, repo, number) {
  const key = repo + "#" + number;
  return env.ISSUE_LEASES.getByName(key);
}

async function route(request, env) {
  const url = new URL(request.url);
  const repos = repoAllowlist(env);
  if (url.pathname === "/health" && request.method === "GET") {
    return json({ ok: true, service: "cedwyn-hive-github-queue", source: "public GitHub Issues", label: LABEL, repo_count: repos.length });
  }
  if (url.pathname === "/jobs" && request.method === "GET") {
    const limit = Math.max(1, Math.min(MAX_LIMIT, Number(url.searchParams.get("limit")) || 50));
    const offset = Math.max(0, Math.min(3000, Number(url.searchParams.get("offset")) || 0));
    try {
      const pages = await Promise.all(repos.map(repo => githubIssues(repo, env)));
      const issues = pages.flat().sort((a, b) => {
        const rank = { HIGH: 0, MEDIUM: 1, LOW: 2, NONE: 3 };
        return rank[a.priority] - rank[b.priority] || String(a.created_at).localeCompare(String(b.created_at));
      });
      const leases = await Promise.all(issues.map(async issue => ({ issue, lease: await objectFor(env, issue.repo, issue.number).getLease() })));
      const rows = leases.map(({ issue, lease }) => ({ ...issue, claim: lease, takeable: !lease }));
      return json({
        schema: "hive_github_jobs/v1",
        generated_at: new Date().toISOString(),
        source: { type: "github-issues", allowlisted_repositories: repos, required_label: LABEL },
        counts: { open: rows.length, claimed: rows.filter(x => x.claim).length, takeable: rows.filter(x => x.takeable).length, priority: { HIGH: rows.filter(x => x.priority === "HIGH").length, MEDIUM: rows.filter(x => x.priority === "MEDIUM").length, LOW: rows.filter(x => x.priority === "LOW").length, NONE: rows.filter(x => x.priority === "NONE").length } },
        ...issuePage(rows, limit, offset),
        next_job: rows.find(x => x.takeable) || null
      });
    } catch (error) {
      return json({ error: "GitHub issue queue unavailable", detail: String(error.message || error) }, 502);
    }
  }
  if (url.pathname === "/claim" || url.pathname === "/renew" || url.pathname === "/release") {
    if (request.method !== "POST") return json({ error: "POST required" }, 405);
    if (!env.HIVE_QUEUE_TOKEN) return json({ error: "queue write operations are disabled until HIVE_QUEUE_TOKEN is configured" }, 503);
    const authorization = request.headers.get("authorization") || "";
    const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!(await tokenMatches(env.HIVE_QUEUE_TOKEN, supplied))) return json({ error: "unauthorized" }, 401);
    let body;
    try { body = await request.json(); } catch { return json({ error: "valid JSON body required" }, 400); }
    const repo = validRepo(body.repo, repos);
    const number = Number(body.issue_number);
    const agent = String(body.agent || "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 60);
    if (!repo || !Number.isSafeInteger(number) || number < 1 || !agent) return json({ error: "repo, positive issue_number and agent are required" }, 400);
    if (url.pathname !== "/release" && !(await issueIsEligible(repo, number))) return json({ error: "issue is not open and explicitly labelled " + LABEL }, 409);
    const stub = objectFor(env, repo, number);
    if (url.pathname === "/release") return json(await stub.release(agent));
    if (url.pathname === "/renew") return json(await stub.renew(agent, DEFAULT_TTL));
    return json(await stub.claim(agent, DEFAULT_TTL));
  }
  if (url.pathname === "/lease" && request.method === "GET") {
    const repo = validRepo(url.searchParams.get("repo"), repos);
    const number = Number(url.searchParams.get("issue_number"));
    if (!repo || !Number.isSafeInteger(number) || number < 1) return json({ error: "valid repo and issue_number required" }, 400);
    return json({ repo, issue_number: number, lease: await objectFor(env, repo, number).getLease() });
  }
  return json({ error: "not found" }, 404);
}

export { IssueLease };
export default {
  async fetch(request, env) {
    const cors = corsHeaders(request);
    if (request.method === "OPTIONS") {
      if (!cors) return json({ error: "origin not allowed" }, 403);
      return new Response(null, { status: 204, headers: cors });
    }
    try {
      const response = await route(request, env);
      if (!cors) return response;
      const headers = new Headers(response.headers);
      for (const [key, value] of Object.entries(cors)) headers.set(key, value);
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    } catch (error) {
      const response = json({ error: "queue request failed", detail: String(error.message || error) }, 500);
      if (!cors) return response;
      const headers = new Headers(response.headers);
      for (const [key, value] of Object.entries(cors)) headers.set(key, value);
      return new Response(response.body, { status: response.status, headers });
    }
  }
};
