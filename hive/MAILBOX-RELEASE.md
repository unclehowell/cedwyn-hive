# Hive mailbox release gate (v3.31.2)

HubSpot is the canonical drafting and review record. Gmail is not a drafting workspace, agent handoff store, backup location or review queue.

## Required sequence

1. Draft, revise and review only in the matching private HubSpot TASK. Freeze the recipient-facing text and compute its SHA-256. Any change to the recipient-facing text, recipient envelope, thread choice or attachment set invalidates the current release proof and starts both review rounds again.
2. Re-fetch the complete HubSpot task and live roster. Record the task ID, exact version, last-modified timestamp, fetch time and recipient-text hash.
3. Complete round 1 and then round 2. Each required active reviewer seat must record its own material approval on the exact same version and hash in each round. The author's write is not a review. An idle skip, routing action, simulated review lens or stale-version approval does not count.
4. Re-check the remaining proofs: zero open issues; seat agreement on the current version; all three hats and fourth-excuse sweep; CSSCPSG; complete thread and attachments; source-index and recipient-profile verification; subject/To/Cc/thread-envelope verification.
5. Verify that the connected Gmail interface exposes a genuine Schedule Send operation. Choose a recipient-local business time after checking the recipient time zone, normal business window, weekends and public holidays. The scheduled timestamp must be no later than 48 elapsed hours after draft creation. There is no daily draft-volume cap.
6. Tab alone performs the single final in-thread create-and-schedule action, using the approved body and verified original thread. Read it back and confirm the exact body hash, subject/recipient envelope, thread, scheduled timestamp and presence in Gmail's scheduled queue before recording the Gmail identifiers. Creation alone is not sending. Once Gmail confirms Schedule Send, the message is queued for automatic delivery at the verified timestamp; do not describe it as an unsent draft. This is the only pre-authorised agent release path under the owner's 13 Nov override. No agent may use immediate-send; any manual send remains owner-only.

## Fail-closed validator

Before the Gmail create action, the dealer runs:

    python tools/validate_mailbox_release.py --proof /private/path/mailbox-release-proof.json

The JSON proof is private working data and must never be committed, logged, attached to a public issue or copied into the public BOARD. It contains task/review metadata and hashes only—never email text, addresses, attachment bytes or legal strategy. The checker requires fresh reads of HubSpot, the roster and Gmail Schedule Send capability (five-minute maximum age). It validates every required reviewer in both rounds, exact version/hash continuity, recipient-profile and source/thread proof, three-hat/fourth-excuse/CSSCPSG proof, attachment proof, the recipient-local business slot, the 48-hour elapsed limit and the Tab creator identity. It never creates, schedules or sends mail. A successful result means only that the metadata preflight passes; Tab must still perform the single genuine Schedule Send action and verify Gmail's scheduled queue/read-back.

## Existing-draft recovery

For each suspected Hive draft already in Gmail:

- Preserve the original draft/message/thread IDs, creation timestamp, headers, exact body and all attachment binaries/metadata.
- Match it to exactly one existing private HubSpot task. If uncertain, create or route a private exception task rather than guessing.
- Append a signed RETURNED FROM GMAIL DRAFT changelog entry with the exact source IDs, version/hash, recovered items and any missing attachments.
- Re-fetch HubSpot and confirm the recovery is complete.
- Only after successful read-back, use a supported Gmail draft-delete operation if its effect is confirmed and the owner's current override permits it. If deletion is unavailable or uncertain, leave the draft untouched and record the legacy exception. Never trash the entire source conversation.
- If the source task cannot be confidently identified, the text does not match, or an attachment cannot be preserved, leave the draft in Gmail untouched and record HOLD for manual reconciliation. Personal drafts and reusable owner templates are not Hive drafts and must never be purged by this process.

## Technical boundary

The validator enforces a fail-closed preflight decision in the dealer workflow, and CI keeps the policy files aligned. It does not intercept direct Gmail connector/API calls. If Schedule Send is absent from the live connector, the proof cannot pass and no new Gmail draft may be created. To make bypass technically impossible, the Gmail connection itself must be reduced to read-only for every non-dealer seat and write permission held only by the dealer identity. Until the provider grants are independently checked, the roster's read-only rule is a policy control, not a provider-enforced permission boundary.
