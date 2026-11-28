# cedwyn-hive Cloudflare Worker — JOIN contract proxy source candidate

**Status: migration candidate only. Not deployed.**

This source was exported from the live Cloudflare Worker `cedwyn-hive` on 28 November 2026. Its repository fallback for the Hive JOIN contract now reads `hive/JOIN.md` from the dedicated `unclehowell/cedwyn-hive` repository on `main`.

Only the JOIN fallback URL was changed. The origin-probe logic, response fields, version selection and error handling remain otherwise preserved.

Before deployment, compare the candidate against the live Worker export, test the `JOIN.md` response and version-header parsing, verify the origin fallback, preserve the existing route/settings, and smoke-test rollback. No schedule, route, binding, secret, D1/KV data or live Worker was changed by this snapshot.
