# Hive Worker source and deployment status

**Repository source of truth:** `unclehowell/cedwyn-hive`, `main`. This file records the split-repository source correction and the remaining Worker deployment gap. It does not mean the Worker has been deployed by a Pages preview.

## Source parity observed 6 November 2026

The Cloudflare `ghf-watch` script was retrieved read-only from the account. Its `index.js` module was byte-for-byte identical to `worker/index.js` in this repository at commit `2aca868c5f8ddcb6fa086e67df7aa00b160a07b9` (189,349 bytes). The script also had `pipeline.txt` and `seed.txt` modules. The repository stores the pipeline source as `worker/pipeline.js` and the seed as `worker/seed.txt`; the live text modules differ only in their final line-ending bytes.

The deployed Worker was still reading shared Hive state from the legacy `unclehowell/cedwyn` branch `hive` for `BOARD.json`, `ROSTER.json`, `AUTOMATION.html`, `AUTOMATION.json` and `JOIN.md`. This PR changes all five reads and all repository fallback links to `unclehowell/cedwyn-hive/main`, which is the repository selected by the current `split-repos.json` `mode: split-repo` record.

The public project queue source is deliberately not changed in this PR; it remains the HubSpot-derived task index and is tracked separately by `cedwyn-hive#11`.

## Reproducible module packaging

The running Worker imports `./seed.txt` and `./pipeline.txt`. The repository retains the pipeline widget's canonical source as `worker/pipeline.js`. `scripts/package-worker.mjs` now creates a local `.worker-build/ghf-watch/` bundle with the same module names and final text-module line endings observed in the live script. The package contract test verifies the generated files and source references.

## Deployment boundary

The repository has a Cloudflare Pages project for the Hive webapp, and PRs receive Pages previews. That preview is **not** a preview of the separate `ghf-watch` Worker runtime. The repository currently has no Worker-specific Wrangler configuration, Durable Object binding, Worker deploy workflow or Worker preview workflow. The GitHub Actions job added here tests syntax and the packaged source; it does not upload a script.

Before changing the live Worker, the separate Worker deployment must be formalised with explicit project/configuration and bindings, an isolated non-production Worker preview, route/MCP acceptance tests, review of existing monitor KV use, and a separately approved production deployment. Do not treat the Pages preview or source-parity finding as a completed Worker release.
