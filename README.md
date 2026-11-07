# Hive

The Hive webapp of [cedwyn.bucklerfamily.estate](https://cedwyn.bucklerfamily.estate/hive/), in its own repository.

It was split out of `unclehowell/cedwyn` (branch `hive`) on 5 Nov 2026, because that repository holds about 290 branches
(~43 GB with history) and a job on one webapp should never need the rest. This repository is a few MB
(36 files, 0.9 MB at the split).

## Get the code

```
git clone --depth 1 https://github.com/unclehowell/cedwyn-hive.git
```

## Where to send changes

The current `split-repos.json` entry in `unclehowell/cedwyn` sets this app to `mode: split-repo`. **This repository's `main` branch is the source of truth.**

1. Make application changes on a feature branch in this repository.
2. Open a pull request into this repository's `main`.
3. After merge, Cedwyn's scheduled `sync-split-repos` workflow copies `main` into the retained legacy branch `hive`.
4. The central `build-cedwyn` workflow assembles the unified site from the synced branch.

Do not open application pull requests against the legacy branch `hive`; it is a compatibility mirror, not the development target. Site-wide registry, shared runtime, central catalogue and build changes still belong in `unclehowell/cedwyn` `main`.

Full instructions: [REPO-SPLIT.md](https://github.com/unclehowell/cedwyn/blob/main/docs/REPO-SPLIT.md).


## Previews

Cloudflare Pages builds this repository itself (project `cedwyn-hive`): `main` at https://cedwyn-hive.pages.dev/ and every
branch or pull request at `https://<branch>.cedwyn-hive.pages.dev/`, with the link commented on the pull request.
`preview.yml` is the fallback route (wrangler with the secrets `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`, unset; it stops quietly).

## History before the split

The full history stays on the old branch: https://github.com/unclehowell/cedwyn/commits/hive

Latest commits on `hive` at the split:

| Date | Commit | Change |
| --- | --- | --- |
| 2026-11-05 | `be1f72c` | hive: SCOREBOARD.json (completions per agent/day, metadata only) |
| 2026-11-05 | `d6e1fa1` | drafts(board): % complete per draft (pct.py, metadata only) |
| 2026-11-05 | `570e168` | drafts: BOARD.json sync from HubSpot (13 change(s)); metadata only |
| 2026-11-04 | `26a2bef` | hive: SCOREBOARD.json (completions per agent/day, metadata only) |
| 2026-11-04 | `ec655e0` | drafts: BOARD.json sync from HubSpot (1 change(s)); metadata only |
| 2026-11-04 | `ad024b0` | hive: record PRC-G5 queue-lease blocker (metadata only) |
| 2026-11-04 | `e89d70c` | hive: record PRC-G5 lease-interface blocker (metadata only) |
| 2026-11-04 | `a33bfd9` | hive: SCOREBOARD.json (completions per agent/day, metadata only) |
| 2026-11-04 | `d3ccb3f` | drafts(board): % complete per draft (pct.py, metadata only) |
| 2026-11-04 | `2f31e8a` | drafts: BOARD.json sync from HubSpot (8 change(s)); metadata only |
| 2026-11-03 | `618b6b0` | hive: SCOREBOARD.json (completions per agent/day, metadata only) |
| 2026-11-03 | `131bf6e` | drafts(board): % complete per draft (pct.py, metadata only) |

Never force-push; never delete the old branch.
