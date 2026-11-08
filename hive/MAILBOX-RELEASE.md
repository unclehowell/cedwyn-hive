# Hive mailbox release gate (v3.27.0)

HubSpot is the canonical drafting and review record. Gmail is not a drafting workspace, agent handoff store, backup location or review queue.

## Required sequence

1. Draft, revise and review only in the matching private HubSpot TASK. Freeze the recipient-facing text and compute its SHA-256. Any change to the recipient-facing text, recipient envelope, thread choice or attachment set invalidates the current release proof and starts both review rounds again.
2. Re-fetch the complete HubSpot task and live roster. Record the task ID, exact version, last-modified timestamp, fetch time and recipient-text hash.
3. Complete round 1 and then round 2. Each required active reviewer seat must record its own material approval on the exact same version and hash in each round. The author's write is not a review. An idle skip, routing action, simulated review lens or stale-version approval does not count.
4. Re-check the remaining proofs: zero open issues; seat agreement on the current version; final three-hat/fourth-excuse review on that version; attachment verification on that version; subject/To/Cc/thread-envelope verification.
5. Count all Gmail drafts created in the current UTC day. At five, queue the HubSpot task and create nothing.
6. Tab alone creates the single final draft, using the approved body and verified original thread. Read it back and compare the body hash, subject/recipient envelope and thread before recording gmail_draft_id. This does not send the email.

## Fail-closed validator

Before the Gmail create action, the dealer runs:

    python tools/validate_mailbox_release.py --proof /private/path/mailbox-release-proof.json

The JSON proof is private working data and must never be committed, logged, attached to a public issue or copied into the public BOARD. It contains task/review metadata and hashes only—never email text, addresses, attachment bytes or legal strategy. The checker requires fresh reads of HubSpot, the roster and Gmail's daily draft count (five-minute maximum age). It validates every required reviewer in both rounds, exact version/hash continuity, all remaining proofs, the creator identity and the UTC daily cap. It never creates a draft or sends mail. A successful result means only that the metadata proof passes; the dealer must still perform the single approved create/read-back step.

## Existing-draft recovery

For each suspected Hive draft already in Gmail:

- Preserve the original draft/message/thread IDs, creation timestamp, headers, exact body and all attachment binaries/metadata.
- Match it to exactly one existing private HubSpot task. If uncertain, create or route a private exception task rather than guessing.
- Append a signed RETURNED FROM GMAIL DRAFT changelog entry with the exact source IDs, version/hash, recovered items and any missing attachments.
- Re-fetch HubSpot and confirm the recovery is complete.
- Only after successful read-back, trash the individual draft message, never the entire source conversation.
- If the source task cannot be confidently identified, the text does not match, or an attachment cannot be preserved, leave the draft in Gmail untouched and record HOLD for manual reconciliation. Personal drafts and reusable owner templates are not Hive drafts and must never be purged by this process.

## Technical boundary

The validator enforces a fail-closed release decision in the dealer workflow, and CI keeps the policy files aligned. It does not intercept direct Gmail connector/API calls. To make bypass technically impossible, the Gmail connection itself must be reduced to read-only for every non-dealer seat and write permission held only by the dealer identity. Until the provider grants are independently checked, the roster's read-only rule is a policy control, not a provider-enforced permission boundary.
