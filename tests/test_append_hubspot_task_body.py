import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from tools.append_hubspot_task_body import build_append_payload

NOW = datetime(2026, 11, 25, 16, 0, tzinfo=timezone.utc)
LAST_MODIFIED = "2026-11-25T15:59:00Z"


def snapshot(**overrides):
    data = {
        "id": 123456789,
        "complete": True,
        "body": "Original recipient-facing text\n\nPrior signed review line\n",
        "lastmodified_at": LAST_MODIFIED,
        "fetched_at": "2026-11-25T15:59:30Z",
    }
    data.update(overrides)
    return data


class AppendHubSpotTaskBodyTests(unittest.TestCase):
    def test_exact_existing_body_is_preserved_as_prefix(self):
        original = snapshot()["body"]
        result = build_append_payload(
            snapshot(), "2026-11-25 | ChatGPT: housekeeping note", LAST_MODIFIED, NOW
        )
        update = result["update_object"]
        new_body = update["properties"]["hs_task_body"]
        self.assertEqual(update["objectId"], 123456789)
        self.assertEqual(update["objectType"], "TASK")
        self.assertTrue(new_body.startswith(original))
        self.assertEqual(new_body[len(original):], "2026-11-25 | ChatGPT: housekeeping note")
        self.assertTrue(result["proof"]["original_body_preserved_as_prefix"])
        self.assertEqual(
            result["proof"]["existing_body_sha256"],
            __import__("hashlib").sha256(original.encode()).hexdigest(),
        )

    def test_html_and_unicode_body_are_not_normalised(self):
        original = "<p>Welsh: Tŷ Mawr &amp; Llandough</p>\r\n"
        result = build_append_payload(snapshot(body=original), "— dated note", LAST_MODIFIED, NOW)
        self.assertTrue(result["update_object"]["properties"]["hs_task_body"].startswith(original))

    def test_incomplete_snapshot_blocks(self):
        with self.assertRaisesRegex(ValueError, "complete must be true"):
            build_append_payload(snapshot(complete=False), "note", LAST_MODIFIED, NOW)

    def test_stale_lastmodified_blocks(self):
        with self.assertRaisesRegex(ValueError, "changed since"):
            build_append_payload(
                snapshot(lastmodified_at="2026-11-25T15:59:10Z"), "note", LAST_MODIFIED, NOW
            )

    def test_stale_snapshot_blocks(self):
        with self.assertRaisesRegex(ValueError, "stale or future-dated"):
            build_append_payload(
                snapshot(lastmodified_at="2026-11-25T15:52:00Z", fetched_at="2026-11-25T15:52:30Z"), "note", "2026-11-25T15:52:00Z", NOW
            )

    def test_snapshot_must_not_predate_lastmodified(self):
        with self.assertRaisesRegex(ValueError, "predates"):
            build_append_payload(
                snapshot(fetched_at="2026-11-25T15:58:00Z"), "note", LAST_MODIFIED, NOW
            )

    def test_timestamps_require_timezone(self):
        with self.assertRaisesRegex(ValueError, "timezone offset"):
            build_append_payload(
                snapshot(lastmodified_at="2026-11-25T15:59:00"), "note", LAST_MODIFIED, NOW
            )

    def test_empty_append_blocks(self):
        with self.assertRaisesRegex(ValueError, "non-empty"):
            build_append_payload(snapshot(), "  \n", LAST_MODIFIED, NOW)

    def test_empty_existing_body_uses_separate_first_draft_path(self):
        with self.assertRaisesRegex(ValueError, "first-draft path"):
            build_append_payload(snapshot(body=""), "initial draft", LAST_MODIFIED, NOW)

    def test_invalid_task_id_blocks(self):
        with self.assertRaisesRegex(ValueError, "positive HubSpot TASK ID"):
            build_append_payload(snapshot(id=True), "note", LAST_MODIFIED, NOW)

    def test_helper_never_updates_other_task_properties(self):
        result = build_append_payload(snapshot(), "note", LAST_MODIFIED, NOW)
        self.assertEqual(set(result["update_object"]["properties"]), {"hs_task_body"})


if __name__ == "__main__":
    unittest.main()
