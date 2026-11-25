import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from deploy import build_command, parse_args


class WranglerCommandTests(unittest.TestCase):
    def test_default_command_is_a_dry_run(self):
        args = parse_args([])
        self.assertEqual(
            build_command("dry-run"),
            ["npx", "--yes", "wrangler@4.135.0", "deploy", "--dry-run", "--config", "wrangler.jsonc"],
        )
        self.assertFalse(args.preview)
        self.assertFalse(args.delete_preview)

    def test_preview_command_is_pinned_and_branch_scoped(self):
        command = build_command("preview", "pr-123", "PR 123 review")
        self.assertEqual(command[:5], ["npx", "--yes", "wrangler@4.135.0", "preview", "--config"])
        self.assertIn("--name", command)
        self.assertIn("pr-123", command)
        self.assertIn("--message", command)

    def test_preview_can_default_to_current_git_branch(self):
        command = build_command("preview")
        self.assertNotIn("--name", command)

    def test_delete_is_scoped_to_one_preview(self):
        command = build_command("delete-preview", "pr-123")
        self.assertIn("preview", command)
        self.assertIn("delete", command)
        self.assertIn("pr-123", command)
        self.assertIn("--skip-confirmation", command)

    def test_bad_preview_names_are_rejected(self):
        for name in ("", "../production", "prod/worker", "pr 123", "-starts-with-dash", "x" * 64):
            with self.subTest(name=name):
                with self.assertRaises(ValueError):
                    build_command("preview", name)

    def test_production_mode_is_not_exposed(self):
        with self.assertRaisesRegex(ValueError, "production deploy is intentionally excluded"):
            build_command("production")

    def test_delete_requires_explicit_preview_name(self):
        with self.assertRaisesRegex(ValueError, "Preview name is required"):
            build_command("delete-preview")


if __name__ == "__main__":
    unittest.main()
