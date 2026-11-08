import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from tools.validate_mailbox_release import validate_release

NOW = datetime(2026, 11, 8, 23, 0, tzinfo=timezone.utc)
VERSION = "v0.1.0"
BODY_HASH = "a" * 64
ENVELOPE_HASH = "b" * 64
SEATS = ["Tab", "ChatGPT", "Grok", "Claude", "Instinct"]


def stamp(value):
    return value.isoformat().replace("+00:00", "Z")


def valid_payload():
    reviewers = [seat for seat in SEATS if seat != "Tab"]
    def approvals(at):
        return [{
            "agent": seat,
            "version": VERSION,
            "recipient_text_sha256": BODY_HASH,
            "verdict": "APPROVE",
            "material": True,
            "reviewed_at": stamp(at + timedelta(seconds=i))
        } for i, seat in enumerate(reviewers)]
    return {
        "schema": "hive_mailbox_release/v1",
        "task": {
            "id": 123456789,
            "version": VERSION,
            "status": "DEFINITELY READY TO SEND",
            "author": "Tab",
            "recipient_text_sha256": BODY_HASH,
            "recipient_envelope_sha256": ENVELOPE_HASH,
            "lastmodified_at": stamp(NOW - timedelta(minutes=2)),
            "fetched_at": stamp(NOW - timedelta(minutes=1))
        },
        "roster": {"active_seats": SEATS, "checked_at": stamp(NOW - timedelta(minutes=1))},
        "rounds": {
            "round1": approvals(NOW - timedelta(minutes=20)),
            "round2": approvals(NOW - timedelta(minutes=10))
        },
        "proofs": {
            "open_issues": 0,
            "seat_agreements_version": VERSION,
            "final_three_hat_version": VERSION,
            "attachments_verified_version": VERSION,
            "subject_recipient_thread_verified_version": VERSION,
            "recipient_envelope_sha256": ENVELOPE_HASH
        },
        "gmail": {
            "checked_at": stamp(NOW - timedelta(seconds=30)),
            "count_scope": "all_mailbox_drafts_created_today_utc",
            "drafts_created_today_utc": 4,
            "executor": "Tab",
            "action": "create_one_final_draft",
            "thread_mode": "reply",
            "thread_id": "thread-123",
            "reply_to_message_id": "message-456"
        }
    }


class MailboxReleaseTests(unittest.TestCase):
    def test_valid_release_passes(self):
        self.assertEqual(validate_release(valid_payload(), NOW), [])

    def test_missing_reviewer_blocks(self):
        payload = valid_payload()
        payload["rounds"]["round2"] = payload["rounds"]["round2"][:-1]
        self.assertTrue(any("missing approvals" in item for item in validate_release(payload, NOW)))

    def test_stale_version_blocks(self):
        payload = valid_payload()
        payload["rounds"]["round1"][0]["version"] = "v0.0.9"
        self.assertTrue(any("does not match" in item for item in validate_release(payload, NOW)))

    def test_body_hash_change_blocks(self):
        payload = valid_payload()
        payload["rounds"]["round2"][0]["recipient_text_sha256"] = "c" * 64
        self.assertTrue(any("frozen body" in item for item in validate_release(payload, NOW)))

    def test_stale_hubspot_fetch_blocks(self):
        payload = valid_payload()
        payload["task"]["fetched_at"] = stamp(NOW - timedelta(minutes=6))
        self.assertTrue(any("stale" in item for item in validate_release(payload, NOW)))

    def test_daily_cap_blocks(self):
        payload = valid_payload()
        payload["gmail"]["drafts_created_today_utc"] = 5
        self.assertTrue(any("daily mailbox cap" in item for item in validate_release(payload, NOW)))

    def test_non_dealer_blocks(self):
        payload = valid_payload()
        payload["gmail"]["executor"] = "Grok"
        self.assertTrue(any("only Tab" in item for item in validate_release(payload, NOW)))

    def test_open_issue_blocks(self):
        payload = valid_payload()
        payload["proofs"]["open_issues"] = 1
        self.assertTrue(any("open_issues" in item for item in validate_release(payload, NOW)))

    def test_reply_without_thread_blocks(self):
        payload = valid_payload()
        payload["gmail"]["reply_to_message_id"] = ""
        self.assertTrue(any("reply_to_message_id" in item for item in validate_release(payload, NOW)))


if __name__ == "__main__":
    unittest.main()
