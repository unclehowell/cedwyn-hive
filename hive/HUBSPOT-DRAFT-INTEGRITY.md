# HubSpot TASK body integrity

Version 1.0.0 · 25 November 2026 · Applies to existing task-body writes

## Purpose

HubSpot TASK bodies are the private canonical record for recipient-facing draft text and its append-only audit history. A claim, review, hand-off or housekeeping note must never replace that complete body with a summary, excerpt, placeholder or reconstructed copy.

## Required write sequence

1. Read the full task (id, hs_task_body, hs_lastmodifieddate) from HubSpot. Never use a search result, preview, Hive board row or truncated response as the write source.
2. Keep the task ID, full body and last-modified timestamp private. Re-fetch the task immediately before a write. If the body is incomplete or its last-modified timestamp differs from the preceding read, stop and reconcile.
3. Mark the private snapshot complete=true only after confirming that the connector returned the complete body without a truncation warning. A private snapshot has this shape:

~~~json
{
  "id": 536896413928,
  "complete": true,
  "body": "EXACT FULL TASK BODY FROM HUBSPOT",
  "lastmodified_at": "2026-11-25T15:59:00Z",
  "fetched_at": "2026-11-25T15:59:30Z"
}
~~~

This example is illustrative only; never commit a real task snapshot or its body to the repository.

4. Put only the new signed changelog line in a separate private UTF-8 file. Build the body-only update payload:

~~~sh
python tools/append_hubspot_task_body.py \
  --snapshot /private/path/task-snapshot.json \
  --append-file /private/path/changelog-entry.txt \
  --expected-lastmodified-at "2026-11-25T15:59:00Z"
~~~

The helper checks the task ID, explicit completeness flag, timestamp freshness (maximum five minutes), preceding/current last-modified equality, body presence and non-empty append. It constructs a payload whose new body starts with the exact existing body and changes only hs_task_body. Its stdout contains the private resulting payload: do not copy it into shell logs, CI, issues, chat or commits.

5. Submit the payload immediately through the authorised HubSpot task update path, with one writer per task. The payload is a body-only update; update status, title or owner separately after a fresh read and only when authorised.
6. Re-fetch the task after the update. Verify byte-for-byte preservation of the original body as a prefix, the exact append at the end, and the expected before/after hashes. Record the post-write timestamp and result privately.
7. If a re-fetch, helper, write or post-write verification fails, stop. Do not retry with a summary or a second guessed payload. Recover from HubSpot property history through the authorised dealer/owner process.

## Guard boundary

This helper is a deterministic local payload builder, not an API client and not an atomic write guard. The current connected HubSpot write operation does not expose a compare-and-swap / If-Match precondition. A concurrent edit can still occur after the final read and before the update. Therefore the operational controls remain mandatory: one writer, immediate pre-write re-fetch, no intervening work, immediate read-back and fail-closed recovery. The helper does not prove that the connector returned a complete body; the caller must establish that before setting complete=true.

An initially empty body is not accepted. Use the separate first-draft creation workflow rather than treating an empty body as an append candidate.

## Privacy

The task snapshot, append file and generated payload contain private HubSpot task content. Store them only in the authorised private runtime. Never commit them, retain them in public build artifacts, or include them in GitHub/Hive Chat. CI tests use synthetic examples only.
