# Hive Chat Worker

This directory contains the Cloudflare Worker and its SQLite-backed `HiveChat` Durable Object.

## Source and runtime

- Entry point: `worker.js`.
- Binding: `env.CHAT` -> `HiveChat`.
- Storage: Durable Object SQLite. The Worker uses a small D1-shaped adapter over `ctx.storage.sql`; it does not require a D1 database.
- The original deployment wrapper's first-install path uses migration tag `v1` / `new_sqlite_classes: ["HiveChat"]`. The current Cloudflare API confirms the live SQLite namespace and `CHAT` binding, but the read surface inspected here does not expose the historical migration ledger. Keep `v1` unchanged and do not deploy production through Wrangler until the migration history is reconciled from the original deployer state.
- The hourly Cron Trigger is `7 * * * *`. Cron Triggers do not invoke a Preview's `scheduled()` handler.

The repository-owned `wrangler.jsonc` is the configuration source for local dry-runs, branch Previews, and the separately gated production configuration. The production routes in that file match the currently configured `cedwyn-datro.bucklerfamily.estate` origin routes. The public apex `/hive/*` route remains owned by the separate apex router; do not attach the chat Worker directly to the apex routes.

## Commands

Run from this directory:

~~~sh
# Default safe operation: build/validate only; no upload or deployment
python3 deploy.py

# Create or update an isolated Preview for the current Git branch
python3 deploy.py --preview --message "Hive Chat branch check"

# Name a Preview explicitly
python3 deploy.py --preview --name pr-123 --message "PR 123 review"

# Delete only that named Preview (and its isolated Durable Object state)
python3 deploy.py --delete-preview pr-123
~~~

The wrapper pins Wrangler `4.135.0`, defaults to a dry-run, and deliberately contains no production-deploy command. Preview creation/deletion requires Cloudflare authentication through the usual Wrangler profile or `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` environment variables. Never put credential values in arguments or source.

## Worker Previews

`wrangler preview` creates a Preview under the same Worker. The `previews.durable_objects.bindings` entry supplies the `CHAT` binding used by the code; Cloudflare provisions a separate Durable Object namespace and SQLite state for each Preview. Preview routes and Cron Triggers do not target the production route/schedule. Preview URLs are public by default: do not put real personal information, seat keys, claim codes or private research into Preview messages. Delete a Preview only by its explicit Preview name when the branch is closed.

The GitHub workflow `.github/workflows/hive-chat-preview.yml` runs syntax/config tests and a Wrangler dry-run for each relevant PR. When repository secrets are present and the PR originates in this repository, it creates a Preview and comments the URL. If those secrets are absent, it explicitly reports **NOT DEPLOYED** rather than treating a passing test run as a live Preview. Closed PRs receive a matching Preview cleanup attempt.

## Production boundary

No automatic production deployment is configured by this workflow or by `deploy.py`. A production rollout requires a separately approved release plan that first reconciles the deployed Worker/DO migration state, binding, route map, Cron schedule, secret set, rollback version and data-preservation check. Do not run `wrangler deploy` directly as a shortcut.

## Local hygiene

`.wrangler/`, `.dev.vars*`, `.env*` and `node_modules/` are local-only. Do not commit credentials or runtime state.
