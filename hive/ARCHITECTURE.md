# BucklerFamily.Estate / Cedwyn — Highest Flywheel Architecture

**Audience:** every agent interfacing with BucklerFamily.Estate, Hive, WebMCP, HubSpot, the cedwyn repo, Cloudflare or GitHub.  
**Status:** Standing architecture (owner direction 3 Nov 2026).  
**Read this before taking upkeep, research, FOI, catalogue, ebook, scene or public-output work.**

## 0. Current owner direction: phase out the central `cedwyn` repository (12 Nov 2026)

**Migration authority:** https://github.com/unclehowell/cedwyn-hive/issues/27 — “Cedwyn repository purge-readiness report”. Every agent must read this issue before claiming or changing platform, app-source, catalogue, build, deployment or infrastructure work.

The owner is phasing out \`unclehowell/cedwyn\`; it is not the home for new app features or ordinary PRs. The current successor is \`unclehowell/bucklerfamily-estate\`, established as the active central site/build source on 17 November 2026. That repository owns the estate-wide assembly, shared runtime, build/release workflows and central SQLite evidence catalogue. Its \`main\` branch is the maintained source; its generated \`site\` branch is the Cloudflare Pages publication output. Each dedicated webapp repository remains the authoritative source for that app. Do not invent an additional platform or catalogue repository: the current successor intentionally owns both functions.

A live Cloudflare check on 28 November 2026 confirms the production Pages project named \`cedwyn\` now builds from \`unclehowell/bucklerfamily-estate\`, branch \`site\`; its latest production deployment succeeded on 27 November. This proves the main Pages source has moved, not that every Worker, API, scheduled workflow, state store or fallback has moved. The old repository remains active compatibility infrastructure until every remaining dependency is independently migrated and tested.

**Migration authority:** https://github.com/unclehowell/cedwyn-hive/issues/27 — the retirement register. Keep it current with verified evidence. DATRO and all \`*-datro\` subdomains are outside the estate migration scope; do not probe, modify, route, detach, rebuild or migrate them as part of this work.

**Until the retirement gates in issue #27 are evidenced:**
- Continue app work only in that app's own repository; central platform/catalogue work belongs in \`unclehowell/bucklerfamily-estate\`.
- Do not add new app-source or operational dependencies to \`unclehowell/cedwyn\`.
- Treat old-repository branches, workflows, Worker references and issues as migration dependencies, not current authority.
- Keep the old repository, its Actions, branches and Pages/Worker connections available while any live consumer still reads or writes them.
- Do not delete/archive the repository, disable Actions, remove branches, detach Pages, alter in-scope production routes/DNS, rotate secrets, change D1/KV/R2/DO bindings or cut over production until the successor is tested and rollback is proven.
- Preserve every existing production data store. An API/database read model is not disposable merely because its code has moved.
- Historical references may remain when clearly identified as historical; live code, scheduled jobs and fallback routes must not depend on the retiring repository.

This current state supersedes older statements in this document or linked instructions that say the platform/catalogue successor repositories are not yet established.


## 1. What BucklerFamily.Estate is

**BucklerFamily.Estate (and its Cedwyn layer) is the LLM-wiki / brain.**  
It holds the evidence collected, the neutral catalogue descriptions, the transcripts, and the versioned interpretations (“our reading”). It is the single organised knowledge base for the Cedwyn Estate, the manorial house (Tŷ Mawr / Great House Farm), and the Williams family’s true history and heritage. It is also the public research-reporting surface for public interest.

It is **not** a static brochure site. It is the living centre of a recursive snowball.

## 2. The giant snowball (uppermost flywheel)

One giant flywheel contains many smaller specialist flywheels. The core loop is continuous:

1. **Research & FOI / disclosure requests go out** (questions asked of archives, councils, HMLR, museums, press, private holders).
2. **Replies and primary material come back.**
3. **Clarifications are sought**; more precise questions are generated.
4. **Answers further organise the knowledge base** — neutral catalogue entries, transcripts, relationships, parcel tags, chronological placement.
5. **The research is officiated** — findings, gaps and contrary evidence are recorded with provenance; HubSpot tasks and leads are updated; the central artefact DB is fed.
6. **The story, the estate, the family and public history/heritage are reconstructed** into a central chronological accurate record.
7. **Public and educational outputs are produced and improved** from that record:
   - E-books (semantic-versioned; re-released when the quality of the underlying information improves).
   - Documentary scenes (written and packaged in real time as the evidence firms).
   - Maps, games and other webapps that help others understand a huge and complex story.
   - Guided tour material for Wales.
   - Better museum / heritage presentation (Great House II concept in Argentina / Patagonia).
8. **Every output raises new questions** → the loop turns again.

This is the **highest-level flywheel**. All smaller flywheels (research/title, FOI/email, missing-evidence recovery, evidence grading/red-team, documentary/script, e-books, social/editorial, website/WebMCP, e-commerce, community, Patagonia feasibility, Williams Thesis, etc.) exist to feed or extract value from this one loop.

Formula (operational learning measure, not a claim of historical truth):

`S(n+1) = S(n) + V + R + G + A + P + B − D − U − W`

(See `academy/FLYWHEELS/snowball.md` for the variable definitions and the full master protocol.)

## 3. Systems of record (do not invent parallel ones)

| System | Role |
|--------|------|
| **HubSpot** | Work queue, owners, due dates, correspondence follow-ups, organisations, contributors, procurement, decisions. Authoritative task bodies. |
| **GitHub repositories** | Each webapp has its own authoritative repository. `unclehowell/bucklerfamily-estate` is the central platform/build source and canonical catalogue source; `unclehowell/cedwyn` is a retiring compatibility repository only. See migration control issue #27. |
| **Canonical core / evidence catalogue** | The central SQLite catalogue in `unclehowell/bucklerfamily-estate` is the single writer for record identity, source provenance, neutral descriptions and versioned interpretations. Static chunks, D1 read models, graphs, search indexes and app views are derived read models. |
| **D1 / graph / search / app views** | Derived read models. |
| **Gmail** | Communication channel and original correspondence. No agent sends without applicable approval. |
| **Hive** | Agent coordination, claims, chat, handover. Not a second task database. |
| **Projects** | Public portfolio, milestones, workstreams, risks. |
| **Docs / Library / Agent Library** | Master protocol, skills, runners, machine-readable instructions. |
| **WebMCP / llms.txt / agent index / footer** | Entry points to the same rules and approved public read surfaces. |

## 4. Upkeep handbook — what every agent must follow

When interfacing with BucklerFamily.Estate, agents treat the following as the standing guide for maintenance and best practice:

- **Snowball master protocol** — https://cedwyn.bucklerfamily.estate/academy/FLYWHEELS/snowball.md  
- **This architecture page** — `hive/ARCHITECTURE.md` (and its live mirror when deployed).  
- **Library / Maintainer handbook** — https://library.bucklerfamily.estate/handbook.html and the site manuals under `/manual/`.  
- **BucklerFamily.Estate handbook v0.2.0** — https://cedwyn.bucklerfamily.estate/academy/handbook/ (agents; JSON index `webmcp-handbook.json`; one-file edition; WebMCP tool `get_cedwyn_handbook`). Page 1 writes this uppermost flywheel as eight arcs (ask, receive, clarify, organise and officiate, reconstruct, present, re-release, learn and return) and page 3 maps every running flywheel to its arc. Human overview: https://cedwyn.bucklerfamily.estate/library/.  
- **Research paradigm** — https://cedwyn.bucklerfamily.estate/academy/MEMORY/research-paradigm.md (Williams as Welsh gentry in a manorial house; tenancy narrative rejected as framework; Bute title under scrutiny; evidence catalogue is foundation).  
- **Be Ambitious skill** — `hive/BE-AMBITIOUS.md` (four questions + rewrite deeper before claiming or executing).  
- **Williams Thesis flywheel** (current high-altitude hypothesis register) — `hive/WILLIAMS-THESIS.md` + HubSpot master 537268777192.  
- **Hive join contract** — `hive/JOIN.md` / live Hive pages (no-idle job flywheel, claim/release, social engagement caps, APPROVE-without-edit, etc.).  
- **Change control & deploy** — Library standards: determinism/truth, content/public text, change classes, deploy-and-verify at 390 px.  
- **Flow watch** — anti-stagnation contract; every live item has timestamp, owner, last progress, blocker, next action.

**Practical upkeep rules for agents:**

1. Prefer primary sources. Catalogue first (neutral + transcript), interpret second (versioned “our reading”).  
2. One material step per turn; signed changelog line; outside evidence of completion (live URL, commit SHA, mailbox ref, surviving task id).  
3. Never create parallel task lists; HubSpot is the register.  
4. No agent may use immediate-send. Tab may use genuine Gmail Schedule Send only under the 13 Nov owner override after the exact-version review and recipient-specific send-readiness gates; manual sending remains owner-only.  
5. Never invent transcripts or claim findings that are still hypotheses.  
6. Preserve and surface contrary evidence.  
7. Public pages and e-books improve by semantic version when the underlying catalogue quality improves — re-release, do not overwrite history silently.  
8. Documentary scenes are produced in real time from the chronological record; they are not fiction.  
9. Webapps (maps, games, directories, terrain, virtual tour) exist to help others make sense of the same complex story the research is reconstructing.  
10. Free-tier constraints (Cloudflare, GitHub, agent seats) are real; finish small verified units rather than open unbounded work.

## 5. Downstream outcomes the flywheel is building toward

- A **central chronological accurate record** of the Cedwyn Estate, the manorial house, and the Williams family’s history and heritage.  
- **E-books** that can be re-released under new semantic versions as evidence quality rises.  
- **Documentary scenes** written and packaged as the record firms, ready for a full scene-by-scene documentary.  
- **Online dimension**: maps, games and other webapps that communicate the story.  
- **Guided tour** materials for Wales.  
- **Museum / heritage presentation** (Great House II concept, Argentina / Patagonia) informed by the same reconstructed record.  
- Full public transparency of the research process itself (approved correspondence, FOI trails, catalogue growth) so the public interest dimension is visible.

## 6. Agent entry points (WebMCP / Hive)

Any agent arriving via WebMCP, Hive, llms.txt, the agent footer, or a chat runner must:

1. Read this architecture document (or its live mirror).  
2. Read the Snowball master protocol.  
3. Apply Be Ambitious before claiming work.  
4. Prefer open HubSpot jobs from the Hive job index; claim, do one material step, release with evidence.  
5. Route every finding (supports or contradicts) into HubSpot leads and the central artefact catalogue.  
6. Treat BucklerFamily.Estate as the brain being continuously improved by the snowball, not as a static site to decorate.

Signed: Grok (Hive), 3 Nov 2026, under owner direction.


## 7. Email-to-task intake and connector-outage continuity (owner direction, 5 Nov 2026)

HubSpot remains the **single authoritative task register**. An email is an intake transport, not a second task database. This route exists so an owner or authorised agent can lodge work even when the HubSpot MCP connector or a direct CRM API client is unavailable.

### Supported paths — keep these distinct

1. **Normal automation:** use the HubSpot MCP or CRM API to create/read/update the CRM `TASK` object. The portal schema has confirmed `TASK` read/write access (object type `0-27`). Required task fields include subject, body and status; priority, due timestamp, task type and owner are available. Follow the current CRM schema, permissions and association rules; do not invent object types or association IDs.
2. **Gmail task creation:** where the HubSpot Sales integration is connected and available, the HubSpot Tasks side panel in Gmail can create a task manually. This is a human UI fallback, not an unattended inbound-email parser.
3. **HubSpot BCC / forwarding address:** these addresses log sent emails or forwarded replies to CRM contact timelines. **They do not, by themselves, create a CRM task.** Do not describe an email as a task merely because it was logged. The native forwarding path also has sender, connected-email, supported-client and message-format constraints.
4. **Dedicated Cedwyn email intake (implementation target):** provision a distinct address such as `task-intake@bucklerfamily.estate` only after the mail route is actually configured and tested. Route it through Cloudflare Email Routing to a Worker which validates and parses a task-submission message, then creates the HubSpot `TASK` via the CRM API. This address is not live until the configuration and end-to-end acceptance tests pass.

HubSpot references: [log email with BCC or forwarding address](https://knowledge.hubspot.com/connected-email/log-email-in-your-crm-with-the-bcc-or-forwarding-address) (timeline logging); [create tasks](https://knowledge.hubspot.com/tasks/create-tasks) (including Gmail task creation); [HubSpot remote MCP server](https://developers.hubspot.com/docs/apps/developer-platform/build-apps/integrate-with-the-remote-hubspot-mcp-server) (task/activity access and the sensitive-data restriction).

### Intake envelope

A message is a task command only when its subject begins `[CEDWYN TASK]` or it contains the explicit `X-Cedwyn-Task: 1` header. Ordinary correspondence forwarded for filing must never be converted into work automatically.

- Subject after the prefix becomes the concise task title.
- Body becomes the private task brief, retaining the original message ID, sender, received time, source URL/reference and any explicit requested due date or priority.
- Optional `HubSpot-Record: <record URL or verified object ID>` identifies the record association. Resolve and validate the association against HubSpot before creating it. If the required association cannot be resolved, quarantine the intake for review; never create a dummy contact/company or guess an ID.
- Default status is `NOT_STARTED`; use `IN_PROGRESS` only when work has genuinely begun. Priority and due date are set only when explicitly supplied or derived from a documented rule.
- Accept only configured, authenticated senders. Validate the envelope sender and SPF/DKIM/DMARC where available; do not trust display names or arbitrary forwarded headers. Reject spoofed or unapproved submitters.
- Never send an automatic outbound reply or create a Gmail draft as part of intake unless separately authorised. A task-creation receipt is an internal confirmation surfaced to the submitting agent/owner, not a claim based only on SMTP acceptance.

### Reliability and failure handling

1. Validate message size, MIME structure, allowed sender, command marker and required fields before writing.
2. Compute an idempotency key from the authenticated sender plus RFC Message-ID (and retain a content hash as a collision check). A retry of the same message must not create a second task.
3. Create the task through the CRM API, then read it back and verify its HubSpot task ID, subject, status and source marker. Only this read-back counts as successful intake.
4. On a transient API failure, place a **private, minimal retry record** in the existing Cedwyn intake queue (or another approved private durable store), retaining the original email in the mailbox of record. The queue must not expose task bodies, correspondence, contacts or attachments through public routes, logs, GitHub or preview deployments. Use an expiry/retention policy and a dead-letter state after bounded retries.
5. On duplicate, malformed, unauthenticated or unassociated input, quarantine/reject with a reason. Never silently drop it or silently create a partial task.
6. When both MCP and API paths are unavailable, the inbound email itself is the durable handoff. Record the receipt ID and queued state; do **not** say it is in HubSpot until the later task read-back succeeds.
7. Keep the bridge idempotent, observable and cheap: store only the minimum dedupe/queue metadata; avoid repeated D1 writes and bulk polling. No public endpoint may retrieve raw submissions.

### Security and governance

- HubSpot remains authoritative after successful creation; the email, queue and GitHub are not parallel task registers.
- Private email bodies, legal strategy, SAR/health material, addresses, attachments and personal data stay in the mailbox and private HubSpot task. GitHub receives only code, schemas, tests and public-safe protocol metadata.
- Agent-created tasks must carry the correct Hive lane and owner/claim metadata in the HubSpot body; they do not gain permission to send correspondence. Draft emails remain HubSpot tasks; only Tab may create and Schedule Send one exact-version in-thread message after all review gates. No agent may use immediate-send; manual sending remains owner-only.
- One original message maps to at most one task. If a submission contains multiple distinct jobs, create separate tasks only after explicit structured delimitation and preserve a common intake correlation ID.
- Never mark a task complete because an email was received, parsed, queued or accepted by the SMTP gateway.

### Activation gate — do not claim the address works until all pass

- Confirm ownership and routing of the dedicated intake address; configure Cloudflare Email Routing and the Worker binding.
- Store a least-privilege HubSpot private-app/API credential only as a Worker secret; never commit it, expose it to browser code or place it in GitHub Actions logs. Confirm the account scopes and the `TASK` API permissions.
- Decide and test the approved sender allowlist and the canonical HubSpot association policy.
- Test a valid submission, duplicate Message-ID, spoofed sender, malformed MIME, oversized attachment, unresolved association, API timeout, queued retry and successful replay. Check that no raw private payload is exposed in logs or public URLs.
- Verify the created task by reading it back from HubSpot. Test replay without duplication and verify the queue drains.
- Publish the address to agents only after a cache-busted end-to-end test and a documented rollback. Until then, use MCP/API or the Gmail Tasks side panel; never invent an intake address.

Change note: 5 Nov 2026 — ChatGPT (Hive seat 2), under owner direction. Architecture addition only; no email address, Cloudflare route, Worker, secret or API credential has been provisioned by this change.


## 8. Estate autonomy and event reconstruction architecture (owner direction, 28 Nov 2026)

The target is an estate research flywheel that progresses routine, bounded work without the owner repeatedly routing agents. It must be event-driven, resumable, auditable and fail-closed. It must not create a competing task database or weaken the current mailbox/review rules.

### 8.1 Event capture and provenance

Every meaningful external or internal change is an event: an incoming email, disclosure response, attachment, archive item, verified source discovery, catalogue correction, project milestone, GitHub change, failed workflow, build or deployment. Store a stable event ID, event type, source system and source ID, original URL/thread reference, occurred-at and ingested-at timestamps, actor, related entity/record/request/task IDs, content hash, privacy class, idempotency key, processing state and links to superseding events.

The original source remains in its original system of record or approved private object store. It is never overwritten by an extracted transcript or a newer interpretation. Derived records point back to the original. A correction appends a new event and records what it supersedes.

### 8.2 Specialist processing

Use specialised, bounded workers for:
- intake and matching of authenticated messages and files;
- document extraction and transcript production;
- entity, place, parcel and chronology matching;
- duplicate detection and source verification;
- adversarial evidence review and counter-evidence discovery;
- recipient, statutory regime, custodian and deadline analysis;
- project control and dependency updates;
- public-safe app generation, testing and release.

A job must have an owner/agent, lease, input event IDs, allowed tools, output schema, completion test, retry policy and deadline. The job lease prevents duplicate work; HubSpot remains authoritative for human work/tasks, and GitHub remains authoritative for app source and code review.

### 8.3 Durable execution target

Cloudflare is the preferred estate runtime:
- Workers receive authenticated events and run small deterministic handlers.
- Queues absorb bursts and provide bounded retries.
- Workflows persist multi-step jobs, sleep until deadlines and wait for external events or review.
- Durable Objects provide exclusive job claims and idempotent transitions.
- D1 holds structured event indexes and processing metadata.
- R2 holds approved original artefacts and derived extracts with content hashes and retention metadata.

**Verified platform status on 28 November 2026:** the account has existing D1, KV, R2 and Durable Object resources, but no estate-wide Cloudflare Queues or Workflows have been provisioned. The existing Hive issue-lease Worker is a pilot and is not wired into the live Hive UI/JOIN contract. These are implementation gaps, not live capabilities. Do not repurpose existing namespaces or create paid dependencies without a documented cost, privacy, export and rollback assessment.

### 8.4 Evidence model

Maintain three distinct layers:
1. **Original artefact:** source file, original email or exact public record, with capture details and hash.
2. **Neutral catalogue record:** what the source is, what it says, its date, creator, custodian, page/folio and related IDs.
3. **Interpretation:** versioned reasoning, evidence for and against, confidence classification, author/reviewer and the propositions it affects.

A material public claim must be traceable to one or more primary artefacts. Conflicting sources remain visible. The parcel model A1/A2/B/C must be preserved and checked explicitly wherever relevant; a broad place or “farm” label is never a substitute for parcel identity.

### 8.5 Privacy and release boundaries

Private correspondence, full HubSpot task bodies, addresses, personal data, legal strategy, authentication material and unreviewed submissions remain in approved private systems. GitHub and public app endpoints carry only code, generic protocols and public-safe metadata. Never put raw emails, attachments, contact details, secrets or private case notes into public repositories, workflow logs, preview builds or unauthenticated queues.

A public update is generated from approved catalogue fields and published only after schema, provenance, link, privacy, accessibility and build checks pass. Preserve the previous working release and record the source event IDs and commit in the release log. A failure keeps the previous release live.

### 8.6 Email and disclosure autonomy

Routine discovery, recipient research, request drafting, duplicate checks, deadline calculation, response matching, attachment indexing and HubSpot updates should run automatically within the documented project policy. Requests must be scoped to identifiable recorded information, use the correct recipient and route, respect the two-new-statutory-requests-per-day limit and carry a no-fee rule. A proposed fee or paid service is an exception.

Outbound dispatch remains governed by the live \`hive/JOIN.md\` and \`hive/THREE-HAT-FOI-GUARDRAILS.md\`: full thread continuity; recipient-specific statutory/policy checks; three analytical hats and the fourth-excuse sweep; actual active-seat reviews on the same frozen version; and the permitted release mechanism only. Simulated reviewers do not count. No agent may use immediate-send. If genuine Gmail Schedule Send or any required review proof cannot be verified, retain the canonical text privately as blocked/not scheduled and do not claim dispatch. This architecture may automate preparation and tracking, but it must not silently bypass the current release contract.

### 8.7 Agent wake-ups and workload

The Cloudflare Watch cron is monitoring infrastructure, not an LLM runner. Each real Hive seat needs its own verified runner and recurrence in its own harness, with a logged last-run timestamp and execution result. A seat may not be marked active or independently reviewed merely because a cron ran or another seat simulated its review. Every run must re-read the current roster, claim one eligible HubSpot task, perform one bounded material step, write completion evidence and release the claim. If its connector, source or permitted tool is unavailable, record the blocker and fail closed.

### 8.8 Publication and migration controls

The central build is \`unclehowell/bucklerfamily-estate\`; each app is sourced from its dedicated repository and the current \`split-repos.json\` manifest. Generated Pages output is the \`site\` branch. The production Pages project named \`cedwyn\` was verified on 28 November to use \`unclehowell/bucklerfamily-estate/site\`, with a successful deployment on 27 November. This does not retire downstream Worker/API/cron dependencies.

The live \`cedwyn-cms\`, \`cedwyn-api\` and \`ghf-watch\` services still contain old-repository source references and must be migrated, tested and re-read before issue #27 can be closed. Preserve their current routes, bindings and persistent data until successors pass smoke tests. Keep all DATRO systems and \`*-datro\` hosts outside this work and unchanged.
