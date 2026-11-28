# BucklerFamily.Estate — autonomous research and publication architecture

**Status:** Target architecture and implementation contract  
**Date:** 28 November 2026  
**Scope:** Great House Farm / Tŷ Mawr research, evidence, disclosure, Project Office and BucklerFamily.Estate apps.

## Objective

Take the owner out of routine routing, extraction, indexing, duplicate checking, status chasing, app synchronisation and publication housekeeping. The owner should receive concise exceptions, material discoveries and decisions that genuinely require authority.

Do this by connecting the systems of record that already exist, not by adding parallel task lists or another generic agent dashboard.

**Explicit exclusion:** DATRO and every \`*-datro\` subdomain are outside this architecture and must remain untouched.

## Current architecture (verified baseline)

- \`unclehowell/bucklerfamily-estate\` is the current central site/build source and central catalogue source. \`main\` is maintained source; \`site\` is generated Pages output.
- Every split app is sourced from its dedicated repository under the central \`split-repos.json\` manifest.
- Cloudflare Pages production project \`cedwyn\` now points to \`unclehowell/bucklerfamily-estate/site\`; production succeeded on 27 November 2026.
- HubSpot remains the private task register; Gmail is the source mailbox; Hive is coordination/review; Project Office is the programme portfolio.
- Cloudflare has D1, KV, R2 and Durable Object resources already in use. No estate-wide Cloudflare Queues or Workflows were found in the account audit on 28 November 2026.
- Hive’s GitHub issue-lease Worker is a non-production pilot, not the live job queue. The live Watch Worker monitors sites and reads Hive metadata but does not execute LLM agent runs.
- The live CMS and API Workers still have code paths into the retiring \`unclehowell/cedwyn\` repository. They are migration blockers, not proof of a completed migration.

Do not mark a component “live” because a design, repository, cron or preview exists. It is live only after a deployed endpoint, resource ID, workflow run or successful end-to-end transaction is verified.

## System of record contracts

| Concern | Authority | Derived consumers |
|---|---|---|
| Original correspondence | Gmail | Private HubSpot tasks, reviewed mailbox metadata |
| Work items, owners, deadlines, recipient profiles | HubSpot | Hive queue, Project Office status |
| Agent claims, roster, chat, handover, review protocol | Hive / \`cedwyn-hive\` | Worker metadata and dashboards |
| Canonical source records, provenance and versioned interpretations | \`bucklerfamily-estate\` central catalogue | D1/search/graph/static app read models |
| Application source | Each dedicated app repository | Central Pages build |
| Shared platform/build/release | \`bucklerfamily-estate\` | Cloudflare Pages \`site\` branch |
| Programme milestones, dependencies, risks | Project Office | Public-safe portfolio views |

A derived copy never becomes a second authority. Each write path must name its system of record and verify read-back.

## Event envelope

A new event is an immutable fact that something happened or a source was captured. Minimum envelope:

\`\`\`json
{
  "event_id": "stable-id",
  "event_type": "email.received",
  "source_system": "gmail",
  "source_id": "provider-message-or-thread-id",
  "source_url": "original-source-reference",
  "occurred_at": "source-time-ISO-8601",
  "ingested_at": "capture-time-ISO-8601",
  "actor": "authenticated-source-or-agent",
  "related_ids": {
    "task_id": null,
    "request_id": null,
    "record_ids": [],
    "entity_ids": []
  },
  "content_sha256": "sha256-of-original-or-canonical-payload",
  "privacy_class": "private",
  "idempotency_key": "stable-source-derived-key",
  "state": "received",
  "supersedes_event_id": null,
  "artifact_ref": "private-object-store-reference"
}
\`\`\`

Original bytes remain in the original mailbox or an approved private object store. Store only minimum metadata in the event index. A duplicate source ID/hash maps to the existing event; it must not create a second task or disclosure record. A correction creates a new event with a \`supersedes_event_id\`; never rewrite history.

## Runtime target

1. **Ingress Worker:** validates authenticated event sources, size, MIME/type, source ID and privacy class.
2. **Queue:** buffers work, applies bounded retries and separates private payload references from public metadata.
3. **Workflow:** persists progress across steps, waits for an external reply/deadline/review event and resumes without depending on a laptop or browser tab.
4. **Durable Object:** serialises job claims/leases and idempotency transitions.
5. **D1:** structured event index, job state, source relationships and processing metadata.
6. **R2:** private original artefacts and derived extracts where retention and privacy policy permit.
7. **Agent adapters:** invoke genuinely available agent seats/providers, with tool allowlists, budget limits and explicit run identity.
8. **Publication pipeline:** rebuilds only affected derived pages/apps, runs checks and publishes only public-safe data.

Cloudflare Queues and Workflows are not yet provisioned for this estate. Provisioning must be a separately reviewed change with a zero-spend/free-tier check, retention design, access policy, migration/rollback plan and proof that the existing D1/KV/R2/DO resources will not be overwritten. Do not create new paid resources or secrets as part of a prototype.

## Job contract

Every job has:
- a HubSpot task ID or an explicitly classified non-task maintenance event;
- one claim holder and an expiring lease;
- the exact input event IDs and source references;
- permitted tools and output schema;
- one bounded next action and a completion condition;
- retry budget, expiry and dead-letter outcome;
- a signed changelog entry and outside proof (commit, task ID/read-back, message reference, workflow run or live URL).

HubSpot is the human work register. A job queue is a delivery/coordination mechanism only. The same task must not be invented again by a retry.

## Agent roles

- **Intake/triage:** authenticated source matching, duplicate suppression, quarantine and HubSpot task read-back.
- **Archivist:** preserve original, hash, extract, transcript and page/folio references.
- **Researcher:** search for exact missing records; maintain source-linked positive and negative search results.
- **Evidence examiner:** check identity, date, parcel, agency and counter-evidence; separate fact from inference.
- **Disclosure officer:** verify custodian, statute/policy, request history, deadline and no-fee rule.
- **Project controller:** keep HubSpot tasks, dependencies, milestones and stale-work status.
- **Publisher/developer:** update app repositories, create previews, run tests and publish public-safe outputs.

Only actual active seats count as independent reviewers. A simulated Grok/Claude/other-style pass is analysis, not an actual reviewer identity.

## Email and disclosure boundary

Automation should do the routine preparation, not bypass the current release contract:
- classify FOIA, EIR, SAR, court access, archive access, ordinary enquiries, complaints and preservation enquiries separately;
- identify the correct legal entity and custodian for each category;
- read the complete source thread and attachments before drafting;
- check prior requests, answers, extensions, deadlines, review routes and duplicates;
- obey the two-new-statutory-requests-per-day limit and no-fee/no-paid-copy rule;
- apply all three hats, fourth-excuse sweep, CSSCPSG, and the current actual five-seat/two-round exact-version review gate;
- only use the release mechanism allowed by the current JOIN contract. No agent immediate-send. If genuine Gmail Schedule Send cannot be confirmed or any review proof is missing, hold privately as NOT SCHEDULED / BLOCKED.

Incoming replies can be matched, preserved, extracted, catalogued and turned into HubSpot updates automatically. That does not mean the reply is a substantive answer or that a statutory clock has stopped.

## Evidence and publication boundary

Maintain three layers:
1. **Original artefact** — exact bytes, source, date and hash.
2. **Neutral catalogue record** — what the source is and what it says.
3. **Versioned interpretation** — what it may mean, evidence for/against and confidence classification.

Public apps may receive only the approved public-safe layer. Never expose full HubSpot task bodies, emails, attachments, contact details, legal strategy, authentication material or unreviewed submissions in GitHub, public D1 endpoints, static builds, logs or preview deployments.

The parcel model is controlled vocabulary: A2 farmhouse/garden; A1 northern woodland; B eastern fields; C provisional southern green. Do not conflate parcels. Place-name matches must be disambiguated before merging entities.

## Rebuild and release

A catalogue/event change identifies affected records, claims, chronology entries and apps. The build pipeline then:
1. validates IDs, schema, provenance and relationship references;
2. generates affected read models and app feeds;
3. runs tests, privacy scans, accessibility checks, link checks and 390px layout checks;
4. creates a preview and records source event IDs/commit SHA;
5. publishes only if checks pass;
6. preserves the previous successful artifact and rollback target.

A failed build must not publish partial output. An interpretation change must produce a new version and changelog, not silently rewrite the previous public history.

## Delivery order

| Phase | Work | Completion proof |
|---|---|---|
| 0 | Retire old central repo dependencies: CMS, API, Watch, agent bridge, cron and raw-source fallbacks | All live sources point to maintained successors; every route and scheduled task passes smoke tests; issue #27 gates verified |
| 1 | Private email/disclosure intake | Authenticated intake, no duplicate, private retry/dead-letter, HubSpot task read-back |
| 2 | Event/evidence ledger | Append-only events, content hash, provenance, replay and correction tests |
| 3 | Workflow orchestration | Queue, workflow and lease with bounded retries and external-event resume |
| 4 | Recipient and disclosure workflows | Recipient-specific policy profile, correct clocks, no-fee enforcement, review evidence |
| 5 | App regeneration | A verified catalogue event updates each affected app and leaves unrelated apps unchanged |
| 6 | Autonomous operations | Every active agent runner has an actual recurring schedule; exception dashboard is accurate |

## Operational safety

- Do not alter Pages domains, Workers routes, DNS, secrets or persistent data stores during code-only changes.
- Do not change, probe, rebuild, detach or migrate DATRO systems or any \`*-datro\` subdomain.
- Do not use the old central repository for new features. Keep it available until all live dependencies and state are migrated and rollback expires.
- Never delete a D1 database, KV namespace, Durable Object namespace or R2 bucket as part of source retirement.
- Keep current Hive JOIN, mailbox release and recipient guardrails authoritative.
- Do not claim a schedule, deployment, email, request or task exists without external confirmation.
