#!/usr/bin/env python3
"""Fail-closed validator for private Hive Gmail mailbox-release metadata.

This checker does not contact HubSpot or Gmail, create drafts, or send mail.
Its input must be assembled from fresh live reads by the authorised dealer.
Do not put email text, addresses, attachment bytes or private legal strategy
in the proof file.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

FRESH_SECONDS = 300
SHA256_RE = re.compile(r"^[a-fA-F0-9]{64}$")
VERSION_RE = re.compile(r"^v\d+\.\d+\.\d+$")


def parse_utc(value: Any, field: str, errors: list[str]) -> datetime | None:
    if not isinstance(value, str) or not value.strip():
        errors.append(f"{field} is missing")
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        errors.append(f"{field} is not a valid ISO-8601 timestamp")
        return None
    if parsed.tzinfo is None:
        errors.append(f"{field} must include a UTC offset")
        return None
    return parsed.astimezone(timezone.utc)


def check_fresh(value: Any, field: str, now: datetime, errors: list[str]) -> datetime | None:
    parsed = parse_utc(value, field, errors)
    if parsed is None:
        return None
    age = (now - parsed).total_seconds()
    if age < -60:
        errors.append(f"{field} is in the future")
    elif age > FRESH_SECONDS:
        errors.append(f"{field} is stale (older than {FRESH_SECONDS} seconds)")
    return parsed


def is_sha256(value: Any) -> bool:
    return isinstance(value, str) and bool(SHA256_RE.fullmatch(value))



def parse_hhmm(value: Any, field: str, errors: list[str]) -> int | None:
    if not isinstance(value, str) or not re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", value):
        errors.append(f"{field} must be a 24-hour HH:MM value")
        return None
    hour, minute = (int(part) for part in value.split(":"))
    return hour * 60 + minute


def validate_schedule(gmail: dict[str, Any], now: datetime, errors: list[str]) -> None:
    """Fail closed unless genuine Schedule Send and a recipient-local business slot are proven."""
    if gmail.get("schedule_send_supported") is not True:
        errors.append("genuine Gmail Schedule Send is not exposed and verified")
    if gmail.get("schedule_send_operation") != "gmail_schedule_send":
        errors.append("gmail.schedule_send_operation must identify the genuine Gmail Schedule Send operation")

    planned = check_fresh(gmail.get("planned_draft_creation_at"), "gmail.planned_draft_creation_at", now, errors)
    scheduled = parse_utc(gmail.get("scheduled_send_at"), "gmail.scheduled_send_at", errors)
    if planned and scheduled:
        delta = (scheduled - planned).total_seconds()
        if delta <= 0:
            errors.append("gmail.scheduled_send_at must be after planned draft creation")
        if delta > 48 * 60 * 60:
            errors.append("gmail.scheduled_send_at exceeds the 48 elapsed-hour limit after draft creation")

    zone_name = gmail.get("recipient_timezone")
    zone = None
    if not isinstance(zone_name, str) or not zone_name.strip():
        errors.append("gmail.recipient_timezone is required")
    else:
        try:
            zone = ZoneInfo(zone_name)
        except ZoneInfoNotFoundError:
            errors.append("gmail.recipient_timezone must be a valid IANA time zone")

    local_raw = gmail.get("recipient_local_send_at")
    local_dt = None
    if not isinstance(local_raw, str) or not local_raw.strip():
        errors.append("gmail.recipient_local_send_at is required")
    else:
        try:
            local_dt = datetime.fromisoformat(local_raw.replace("Z", "+00:00"))
            if local_dt.tzinfo is None:
                errors.append("gmail.recipient_local_send_at must include a UTC offset")
                local_dt = None
        except ValueError:
            errors.append("gmail.recipient_local_send_at must be a valid ISO-8601 timestamp")

    if scheduled and zone and local_dt:
        expected = scheduled.astimezone(zone)
        if local_dt.replace(tzinfo=None) != expected.replace(tzinfo=None) or local_dt.utcoffset() != expected.utcoffset():
            errors.append("gmail.recipient_local_send_at does not match scheduled_send_at in recipient_timezone")
        if expected.weekday() >= 5:
            errors.append("gmail.scheduled_send_at falls on a weekend in the recipient's time zone")

        start = parse_hhmm(gmail.get("business_window_start"), "gmail.business_window_start", errors)
        end = parse_hhmm(gmail.get("business_window_end"), "gmail.business_window_end", errors)
        local_minutes = expected.hour * 60 + expected.minute
        if start is not None and end is not None:
            if start >= end:
                errors.append("recipient business window must have start earlier than end")
            elif not (start <= local_minutes < end):
                errors.append("gmail.scheduled_send_at is outside the verified recipient-local business window")

    if gmail.get("business_day_verified") is not True:
        errors.append("recipient working day and public-holiday calendar have not been verified")
    if not isinstance(gmail.get("business_calendar_source_url"), str) or not gmail["business_calendar_source_url"].startswith("https://"):
        errors.append("gmail.business_calendar_source_url must identify the checked recipient holiday calendar")
    calendar_checked = parse_utc(gmail.get("business_calendar_checked_at"), "gmail.business_calendar_checked_at", errors)
    if calendar_checked:
        age = (now - calendar_checked).total_seconds()
        if age < -60 or age > 7 * 24 * 60 * 60:
            errors.append("gmail.business_calendar_checked_at must be within the last seven days")


def validate_release(payload: dict[str, Any], now: datetime | None = None) -> list[str]:
    """Return blockers; an empty list means the supplied metadata proof passes."""
    now = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    errors: list[str] = []

    if payload.get("schema") != "hive_mailbox_release/v2":
        errors.append("schema must be hive_mailbox_release/v1")

    task = payload.get("task")
    roster = payload.get("roster")
    rounds = payload.get("rounds")
    proofs = payload.get("proofs")
    gmail = payload.get("gmail")
    if not all(isinstance(item, dict) for item in (task, roster, rounds, proofs, gmail)):
        return errors + ["task, roster, rounds, proofs and gmail must be objects"]

    task_id = task.get("id")
    if not isinstance(task_id, int) or isinstance(task_id, bool) or task_id <= 0:
        errors.append("task.id must be a positive HubSpot task ID")

    version = task.get("version")
    if not isinstance(version, str) or not VERSION_RE.fullmatch(version):
        errors.append("task.version must be a semantic version such as v0.1.0")
    if task.get("status") != "DEFINITELY READY TO SEND":
        errors.append("task.status must be DEFINITELY READY TO SEND")

    body_hash = task.get("recipient_text_sha256")
    envelope_hash = task.get("recipient_envelope_sha256")
    if not is_sha256(body_hash):
        errors.append("task.recipient_text_sha256 must be a SHA-256 hash")
    if not is_sha256(envelope_hash):
        errors.append("task.recipient_envelope_sha256 must be a SHA-256 hash")

    task_fetched = check_fresh(task.get("fetched_at"), "task.fetched_at", now, errors)
    task_modified = parse_utc(task.get("lastmodified_at"), "task.lastmodified_at", errors)
    if task_fetched and task_modified and task_modified > task_fetched:
        errors.append("task.lastmodified_at is later than the recorded HubSpot fetch")

    check_fresh(roster.get("checked_at"), "roster.checked_at", now, errors)
    active = roster.get("active_seats")
    author = task.get("author")
    if not isinstance(active, list) or not active or any(not isinstance(item, str) or not item.strip() for item in active):
        errors.append("roster.active_seats must list every currently active Hive seat")
        active = []
    if len(set(active)) != len(active):
        errors.append("roster.active_seats contains duplicate seats")
    if not isinstance(author, str) or author not in active:
        errors.append("task.author must be an active roster seat")

    required = set(active) - ({author} if isinstance(author, str) else set())
    if not required:
        errors.append("no independent active reviewer seats remain after excluding the author")

    parsed_rounds: dict[str, dict[str, datetime]] = {}
    for round_name in ("round1", "round2"):
        records = rounds.get(round_name)
        if not isinstance(records, list):
            errors.append(f"rounds.{round_name} must be an array")
            continue
        seen: dict[str, datetime] = {}
        for index, record in enumerate(records):
            field = f"rounds.{round_name}[{index}]"
            if not isinstance(record, dict):
                errors.append(f"{field} must be an object")
                continue
            agent = record.get("agent")
            if not isinstance(agent, str) or agent not in required:
                errors.append(f"{field}.agent is not a required independent reviewer")
                continue
            if agent in seen:
                errors.append(f"{round_name} contains more than one entry for {agent}")
                continue
            if record.get("version") != version:
                errors.append(f"{field}.version does not match the frozen task version")
            if record.get("recipient_text_sha256") != body_hash:
                errors.append(f"{field}.recipient_text_sha256 does not match the frozen body")
            if record.get("verdict") != "APPROVE" or record.get("material") is not True:
                errors.append(f"{field} is not a material APPROVE")
            reviewed = parse_utc(record.get("reviewed_at"), f"{field}.reviewed_at", errors)
            if reviewed:
                seen[agent] = reviewed

        missing = required - set(seen)
        if missing:
            errors.append(f"{round_name} is missing approvals from: {', '.join(sorted(missing))}")
        parsed_rounds[round_name] = seen

    first = parsed_rounds.get("round1", {})
    second = parsed_rounds.get("round2", {})
    for agent in required & set(first) & set(second):
        if second[agent] <= first[agent]:
            errors.append(f"round 2 approval for {agent} is not later than round 1")

    if proofs.get("open_issues") != 0:
        errors.append("proofs.open_issues must be exactly 0")
    for field in (
        "seat_agreements_version",
        "final_three_hat_version",
        "attachments_verified_version",
        "subject_recipient_thread_verified_version",
        "full_context_thread_verified_version",
        "recipient_profile_verified_version",
        "source_indexes_verified_version",
        "csscpsg_verified_version",
    ):
        if proofs.get(field) != version:
            errors.append(f"proofs.{field} must match task.version")
    if proofs.get("recipient_envelope_sha256") != envelope_hash:
        errors.append("proofs.recipient_envelope_sha256 does not match the verified envelope")

    check_fresh(gmail.get("checked_at"), "gmail.checked_at", now, errors)
    validate_schedule(gmail, now, errors)
    if gmail.get("executor") != "Tab":
        errors.append("only Tab (dealer) may create and schedule the final Gmail draft")
    if gmail.get("action") != "create_and_schedule_one_final_draft":
        errors.append("gmail.action must be create_and_schedule_one_final_draft")

    mode = gmail.get("thread_mode")
    if mode == "reply":
        if not isinstance(gmail.get("thread_id"), str) or not gmail["thread_id"].strip():
            errors.append("reply draft requires gmail.thread_id")
        if not isinstance(gmail.get("reply_to_message_id"), str) or not gmail["reply_to_message_id"].strip():
            errors.append("reply draft requires gmail.reply_to_message_id")
    elif mode != "new":
        errors.append("gmail.thread_mode must be reply or new")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate a private Hive Gmail mailbox-release proof.")
    parser.add_argument("--proof", required=True, type=Path, help="Private JSON proof file assembled from live HubSpot, roster and Gmail reads.")
    args = parser.parse_args()
    try:
        payload = json.loads(args.proof.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"BLOCKED: cannot read valid proof JSON: {exc}", file=sys.stderr)
        return 2
    if not isinstance(payload, dict):
        print("BLOCKED: proof root must be a JSON object", file=sys.stderr)
        return 2

    blockers = validate_release(payload)
    if blockers:
        print("BLOCKED — no Gmail draft may be created:")
        for blocker in blockers:
            print(f"- {blocker}")
        return 1

    print(f"READY: task {payload['task']['id']} version {payload['task']['version']} passed the mailbox-release preflight. Schedule Send must still be confirmed by Gmail.")
    print("This checker does not create, schedule or send email; Tab must perform the single approved Schedule Send action and verify Gmail's scheduled queue/read-back. The owner alone sends.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
