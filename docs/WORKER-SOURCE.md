# Hive Worker source and deployment status

**Repository source of truth:** `unclehowell/cedwyn-hive`, branch `main`. The Worker source is `worker/index.js`; its text-module inputs are `worker/seed.txt` and `worker/pipeline.js`.

## Hive state source contract

The Worker must read all Hive state from `unclehowell/cedwyn-hive@main`, folder `hive/`:

- `ROSTER.json`
- `BOARD.json` and `SCOREBOARD.json`
- `JOIN.md`
- `AUTOMATION.html` and `AUTOMATION.json`
- the relevant `BATON` files

The Cedwyn website and research-content repository remains `unclehowell/cedwyn`; it is not the Hive state repository. Active Worker fallbacks, the generated join contract, and the embedded agent instructions must all name the split Hive repository. The retired `unclehowell/cedwyn@hive` paths must not be used for current Hive state.

The public job queue is deliberately unchanged here. It still uses the legacy HubSpot-derived queue/claim path; the GitHub Issues queue and issue-keyed lease integration are tracked separately in [cedwyn-hive#11](https://github.com/unclehowell/cedwyn-hive/issues/11). No HubSpot bodies, CRM identifiers, private correspondence or recipients may enter the public queue.

## Historical runtime parity and deployment boundary

A read-only check on 6 November 2026 found the deployed `ghf-watch` `index.js` byte-for-byte identical to repository `worker/index.js` at commit `2aca868c5f8ddcb6fa086e67df7aa00b160a07b9` (189,349 bytes). That is a **historical** parity observation, not proof that the current `main` source still matches the deployed Worker. The repository source has advanced since that snapshot; re-fetch the live script and compare it with the proposed package before any deployment.

The running Worker imports `./seed.txt` and `./pipeline.txt`. The repository stores the pipeline widget source as `worker/pipeline.js`. `scripts/package-worker.mjs` creates a deterministic local package at `.worker-build/ghf-watch/`, preserving the text-module names and final CRLF endings. The source-contract test checks both the Hive source URLs and the packaged module contents.

The GitHub Actions workflow tests packaging, Worker syntax and the source contract. It does **not** upload a Worker. A Cloudflare Pages preview is not a preview of the separate `ghf-watch` Worker runtime.

Before changing the live Worker, formalise and validate the separate Worker deployment configuration, all existing bindings, an isolated non-production Worker preview, route/MCP acceptance tests and production cutover. Preserve the current production service binding and traffic until those checks pass. Do not report the Worker as deployed or the Hive job queue as migrated on the strength of a source commit or Pages preview.
