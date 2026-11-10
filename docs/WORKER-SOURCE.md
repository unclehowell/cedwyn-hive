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

The Worker now contains an optional `HIVE_QUEUE` service-binding adapter for public GitHub Issues. When that binding is present, its MCP/WebMCP job tools call the separate GitHub queue Worker and expose distinct claim, renew and release operations. With no binding, the current HubSpot-derived queue remains the compatibility fallback. The adapter does not configure a binding or token and does not change production by itself. Private email drafts and correspondence remain in HubSpot; no HubSpot bodies, CRM identifiers, private correspondence or recipients may enter the public queue.

## Historical runtime parity and deployment boundary

A read-only check on 6 November 2026 found the deployed `ghf-watch` `index.js` byte-for-byte identical to repository `worker/index.js` at commit `2aca868c5f8ddcb6fa086e67df7aa00b160a07b9` (189,349 bytes). That is a **historical** parity observation, not proof that the current `main` source still matches the deployed Worker. The repository source has advanced since that snapshot; re-fetch the live script and compare it with the proposed package before any deployment.

The running Worker imports `./seed.txt`, `./pipeline.txt` and `./hive-public-queue.js`. The repository stores the pipeline widget source as `worker/pipeline.js`. `scripts/package-worker.mjs` creates a deterministic local package at `.worker-build/ghf-watch/`, preserving the text-module names and final CRLF endings and including the JavaScript adapter module. The source-contract tests check Hive source URLs, adapter wiring, module syntax and package contents.

The GitHub Actions workflow tests packaging, Worker syntax and the source contract. It does **not** upload a Worker. A Cloudflare Pages preview is not a preview of the separate `ghf-watch` Worker runtime.

Before changing the live Worker, formalise and validate the separate Worker deployment configuration, all existing bindings, an isolated non-production Worker preview, route/MCP acceptance tests and production cutover. Preserve the current production service binding and traffic until those checks pass. Do not report the Worker as deployed or the Hive job queue as migrated on the strength of a source commit or Pages preview.
