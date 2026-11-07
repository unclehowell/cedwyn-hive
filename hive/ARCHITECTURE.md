# BucklerFamily.Estate / Cedwyn — Highest Flywheel Architecture

**Audience:** every agent interfacing with BucklerFamily.Estate, Hive, WebMCP, HubSpot, the cedwyn repo, Cloudflare or GitHub.  
**Status:** Standing architecture (owner direction 3 Nov 2026).  
**Read this before taking upkeep, research, FOI, catalogue, ebook, scene or public-output work.**

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
5. **The research is officiated** — findings, gaps and contrary evidence are recorded with provenance; public-safe work is tracked on canonical GitHub issues; private correspondence follow-ups stay in HubSpot; the central artefact DB is fed.
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
| **HubSpot** | Private recipient-facing drafts, exact-version correspondence reviews, confidential follow-up and permitted procurement records. Not the public project work queue. |
| **GitHub `unclehowell/cedwyn`** | Version-controlled source, schemas, protocols, public-safe data, build rules. |
| **Canonical core / evidence catalogue** | Single writer for facts and provenance. Neutral description + transcript + separate versioned “our reading”. |
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
- **Williams Thesis flywheel** (current high-altitude hypothesis register) — `hive/WILLIAMS-THESIS.md` plus the canonical GitHub issue register; do not publish CRM record IDs.
- **Hive join contract** — `hive/JOIN.md` / live Hive pages (no-idle job flywheel, claim/release, social engagement caps, APPROVE-without-edit, etc.).  
- **Change control & deploy** — Library standards: determinism/truth, content/public text, change classes, deploy-and-verify at 390 px.  
- **Flow watch** — anti-stagnation contract; every live item has timestamp, owner, last progress, blocker, next action.

**Practical upkeep rules for agents:**

1. Prefer primary sources. Catalogue first (neutral + transcript), interpret second (versioned “our reading”).  
2. One material step per turn; signed changelog line; outside evidence of completion (live URL, commit SHA, mailbox ref, surviving task id).  
3. Public project work belongs on GitHub Issues; do not create parallel project boards. HubSpot is reserved for private correspondence and exact-version review.
4. Never send email; owner alone sends.  
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
4. Prefer unclaimed `hive:public` GitHub issues from the Hive queue; claim, do one material step, release with evidence.
5. Route public-safe findings (supports and contradicts) into canonical GitHub issues and the central artefact catalogue. Keep private recipient correspondence and confidential material in HubSpot.
6. Treat BucklerFamily.Estate as the brain being continuously improved by the snowball, not as a static site to decorate.

Signed: Grok (Hive), 3 Nov 2026, under owner direction.


## 7. Email-to-task intake and connector-outage continuity (owner direction, 5 Nov 2026)

GitHub Issues are the **single authoritative register for public project work**. HubSpot is authoritative only for private recipient-facing drafts, exact-version correspondence reviews and confidential follow-up records. Email is an intake transport, not a second project database. Do not mirror private CRM records into public GitHub.

### Supported paths — keep these distinct

1. **Private correspondence automation:** use HubSpot MCP/CRM only for private recipient-facing drafts and exact-version correspondence-review records. Public project work is created, claimed and updated on GitHub Issues.
2. **Gmail task creation:** where the HubSpot Sales integration is connected and available, the HubSpot Tasks side panel in Gmail can create a task manually. This is a human UI fallback, not an unattended inbound-email parser.
3. **HubSpot BCC / forwarding address:** these addresses log sent emails or forwarded replies to CRM contact timelines. **They do not, by themselves, create a CRM task.** Do not describe an email as a task merely because it was logged. The native forwarding path also has sender, connected-email, supported-client and message-format constraints.
4. **Dedicated private correspondence intake (implementation target):** provision a distinct address only after the mail route is configured and tested. It is not a public project work queue; public project deliverables are opened as GitHub issues.

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
6. When both private HubSpot MCP and API paths are unavailable, the inbound email remains a private durable handoff; do not expose it in GitHub. Public project work still uses the GitHub issue queue.
7. Keep the bridge idempotent, observable and cheap: store only the minimum dedupe/queue metadata; avoid repeated D1 writes and bulk polling. No public endpoint may retrieve raw submissions.

### Security and governance

For private correspondence intake, HubSpot remains authoritative after successful creation. For public project work, GitHub Issues are authoritative; the two lanes are separate and neither is a mirror of the other.
- Private email bodies, legal strategy, SAR/health material, addresses, attachments and personal data stay in the mailbox and private HubSpot task. GitHub receives only code, schemas, tests and public-safe protocol metadata.
Private correspondence tasks must carry the correct Hive lane and review metadata in HubSpot. Public project issues carry scope, assignee, priority, dependencies, blockers and acceptance. Draft emails remain in HubSpot; only the authorised dealer may create the final in-thread Gmail draft after all review gates, and the owner alone sends.
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
