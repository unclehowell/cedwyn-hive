#!/usr/bin/env python3
"""Portable, non-production Hive Chat Wrangler wrapper.

Default: build a dry-run. Use --preview to create/update the current branch's
isolated Worker Preview, or --delete-preview NAME to remove that named Preview.
There is deliberately no production-deploy command in this wrapper.
"""
from __future__ import annotations

import argparse
import re
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Sequence

HERE = Path(__file__).resolve().parent
CONFIG = "wrangler.jsonc"
WRANGLER = ("npx", "--yes", "wrangler@4.135.0")
PREVIEW_NAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9-]{0,62}$")


def validate_preview_name(name: str) -> str:
    if not isinstance(name, str) or not PREVIEW_NAME_RE.fullmatch(name):
        raise ValueError("preview name must be 1-63 letters, digits or hyphens and start with a letter or digit")
    return name


def build_command(mode: str, name: str | None = None, message: str | None = None) -> list[str]:
    """Build a reproducible Wrangler command without performing the operation."""
    if mode == "dry-run":
        if name or message:
            raise ValueError("name/message are only valid for a Preview")
        return [*WRANGLER, "deploy", "--dry-run", "--config", CONFIG]

    if mode == "preview":
        args = [*WRANGLER, "preview", "--config", CONFIG]
        if name is not None:
            args.extend(["--name", validate_preview_name(name)])
        if message:
            args.extend(["--message", message])
        return args

    if mode == "delete-preview":
        if not name:
            raise ValueError("a Preview name is required for deletion")
        return [
            *WRANGLER, "preview", "delete", "--config", CONFIG,
            "--name", validate_preview_name(name), "--skip-confirmation",
        ]

    raise ValueError("supported modes are dry-run, preview and delete-preview; production deploy is intentionally excluded")


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument("--dry-run", action="store_true", help="build and validate without uploading (default)")
    modes.add_argument("--preview", action="store_true", help="create/update this branch's isolated Worker Preview")
    modes.add_argument("--delete-preview", metavar="NAME", help="delete only the named Worker Preview and its isolated state")
    parser.add_argument("--name", help="optional Preview name; Wrangler defaults to the current branch")
    parser.add_argument("--message", help="optional Preview deployment annotation")
    args = parser.parse_args(argv)

    if args.delete_preview and (args.name or args.message):
        parser.error("--delete-preview takes its name as the option value; do not also use --name or --message")
    if not args.preview and not args.delete_preview and (args.name or args.message):
        parser.error("--name and --message can only be used with --preview")
    return args


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    mode = "delete-preview" if args.delete_preview else "preview" if args.preview else "dry-run"
    name = args.delete_preview if args.delete_preview else args.name

    try:
        command = build_command(mode, name, args.message)
    except ValueError as exc:
        print(f"BLOCKED: {exc}", file=sys.stderr)
        return 2

    if not shutil.which(command[0]):
        print("BLOCKED: Node.js/npm (npx) is not installed. Install Node.js 22 or later.", file=sys.stderr)
        return 2

    print("Running:", " ".join(command), flush=True)
    try:
        result = subprocess.run(command, cwd=HERE, check=False)
    except OSError as exc:
        print(f"BLOCKED: could not start Wrangler: {exc}", file=sys.stderr)
        return 2
    return int(result.returncode)


if __name__ == "__main__":
    raise SystemExit(main())
