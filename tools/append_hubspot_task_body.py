#!/usr/bin/env python3
"""Build a fail-closed append-only HubSpot TASK body update payload.

This is a local payload guard, not a HubSpot API client. It never writes to HubSpot.
Snapshots and emitted payloads contain the complete private task body: keep them
outside Git, public logs, GitHub issues, Hive Chat and CI artifacts.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

FRESH_SECONDS = 300


def _timestamp(value: Any, field: str) -> datetime:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field} is required")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError(f"{field} must be a valid ISO-8601 timestamp") from exc
    if parsed.tzinfo is None:
        raise ValueError(f"{field} must include a timezone offset")
    return parsed.astimezone(timezone.utc)


def _sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def build_append_payload(
    snapshot: dict[str, Any],
    append_text: str,
    expected_lastmodified_at: str,
    now: datetime | None = None,
) -> dict[str, Any]:
    """Return a HubSpot TASK body-only update and non-sensitive integrity proof.

    expected_lastmodified_at must be the value captured during the preceding
    full read. snapshot must be a fresh, complete re-fetch immediately before
    the write. The helper requires an existing non-empty body; initial drafts
    have a separate creation path.
    """
    task_id = snapshot.get("id")
    if not isinstance(task_id, int) or isinstance(task_id, bool) or task_id <= 0:
        raise ValueError("snapshot.id must be a positive HubSpot TASK ID")
    if snapshot.get("complete") is not True:
        raise ValueError("snapshot.complete must be true after a verified full-body read")

    current_body = snapshot.get("body")
    if not isinstance(current_body, str) or not current_body:
        raise ValueError("existing task body is empty or missing; use the separate first-draft path")
    if not isinstance(append_text, str) or not append_text.strip():
        raise ValueError("append_text must contain a non-empty signed changelog entry")

    expected_modified = _timestamp(expected_lastmodified_at, "expected_lastmodified_at")
    actual_modified = _timestamp(snapshot.get("lastmodified_at"), "snapshot.lastmodified_at")
    fetched_at = _timestamp(snapshot.get("fetched_at"), "snapshot.fetched_at")
    current_time = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)

    if actual_modified != expected_modified:
        raise ValueError("task changed since the preceding read; re-read and reconcile before writing")
    if fetched_at < actual_modified:
        raise ValueError("snapshot.fetched_at predates snapshot.lastmodified_at")
    age_seconds = (current_time - fetched_at).total_seconds()
    if age_seconds < -60 or age_seconds > FRESH_SECONDS:
        raise ValueError(f"snapshot is stale or future-dated; maximum age is {FRESH_SECONDS} seconds")

    separator = ""
    if not current_body.endswith(("\n", "\r")) and not append_text.startswith(("\n", "\r")):
        separator = "\n"
    new_body = current_body + separator + append_text

    if not new_body.startswith(current_body):
        raise ValueError("integrity check failed: original body is not preserved as a prefix")
    if len(new_body.encode("utf-8")) <= len(current_body.encode("utf-8")):
        raise ValueError("integrity check failed: appended body did not grow")

    update = {
        "objectId": task_id,
        "objectType": "TASK",
        "associations": None,
        "properties": {"hs_task_body": new_body},
    }
    proof = {
        "task_id": task_id,
        "prewrite_lastmodified_at": actual_modified.isoformat().replace("+00:00", "Z"),
        "snapshot_fetched_at": fetched_at.isoformat().replace("+00:00", "Z"),
        "snapshot_age_seconds": round(age_seconds, 3),
        "existing_body_sha256": _sha256(current_body),
        "resulting_body_sha256": _sha256(new_body),
        "existing_body_bytes": len(current_body.encode("utf-8")),
        "resulting_body_bytes": len(new_body.encode("utf-8")),
        "original_body_preserved_as_prefix": True,
    }
    return {"update_object": update, "proof": proof}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--snapshot", required=True, type=Path, help="private JSON full-task snapshot")
    parser.add_argument("--append-file", required=True, type=Path, help="private UTF-8 changelog text to append")
    parser.add_argument("--expected-lastmodified-at", required=True, help="timestamp from the preceding full read")
    args = parser.parse_args()

    try:
        snapshot = json.loads(args.snapshot.read_text(encoding="utf-8"))
        append_text = args.append_file.read_text(encoding="utf-8")
        result = build_append_payload(snapshot, append_text, args.expected_lastmodified_at)
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        print(f"BLOCKED: {exc}", file=sys.stderr)
        return 2

    json.dump(result, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
