# Hive public issue queue integration

This bridge is deliberately dual-track.

- **Public project work** can be queued as GitHub Issues carrying the explicit `hive:public` label in the configured repository allowlist. The separate `cedwyn-hive-github-queue` Worker supplies issue metadata and one SQLite-backed Durable Object lease per `owner/repo#issue_number`.
- **Private email drafts and correspondence** remain in HubSpot TASK records. They must never be copied into GitHub issues, issue bodies, comments or public queue metadata. Their version, seat turn, review history, recipients and text stay in HubSpot and the private board mirror.

## Runtime adapter

When `ghf-watch` has both bindings below, its Hive MCP/WebMCP job tools proxy public issue work to the queue Worker:

- service binding `HIVE_QUEUE` → the isolated GitHub queue Worker (preview first);
- secret `HIVE_QUEUE_TOKEN` → the same bearer token configured on the queue Worker.

With no `HIVE_QUEUE` binding, the current HubSpot-derived legacy queue remains the compatibility fallback. With the binding present but no token, mutations fail closed; they do not silently fall back to the non-atomic legacy KV claim path.

Public issue IDs use `owner/repository#number` (for example `unclehowell/cedwyn-hive#24`). The adapter exposes distinct `hive_claim_job`, `hive_renew_job` and `hive_release_job` operations. Renewal calls the queue Worker's strict `/renew` route, which requires the same holder and an existing, unexpired lease. It does not emulate renewal by claiming again.

The issue queue returns a strict public metadata allowlist only. It never retrieves issue bodies or comments. The queue Worker rechecks open state and the explicit `hive:public` label before claim/renew; its own Durable Object transaction enforces single-holder lease transitions.

## Safe preview and cutover sequence

1. Deploy the adapter source to an isolated `ghf-watch` preview Worker with a separate KV namespace and a service binding to the queue preview.
2. Configure a new preview-only bearer secret on both Workers; never copy production secrets into a preview.
3. Smoke-test queue list, valid claim, competing-agent refusal, valid renewal, wrong-agent renewal refusal, release, expiry, unauthenticated refusal, and rejection of closed/unlabelled issues.
4. Confirm private HubSpot draft tasks still remain discoverable only through the private board and their version/turn workflow is unchanged.
5. Keep production `ghf-watch`, its KV claims, route and service bindings unchanged until the preview and contention tests pass and a separately authorised production cutover is carried out.

This source adapter alone does not configure a Cloudflare service binding, create or rotate a secret, deploy a Worker, or change production traffic.
