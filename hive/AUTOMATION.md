# Hive Automation — release notes

## Current deployment — mailbox release override (13 November 2026)

- Canonical recipient-facing text and private recipient profiles remain in HubSpot.
- Every draft/redraft requires complete thread and attachment review, recipient-specific policy/profile, source-index checks, three hats, fourth-excuse sweep and CSSCPSG, followed by the live JOIN exact-version two-round/five-seat gate.
- Only Tab may create and genuinely Schedule Send one in-thread frozen version after all proofs pass. The recipient-local time zone, business window, working day and public-holiday calendar must be verified; scheduled time must be within 48 elapsed hours after draft creation.
- No daily draft-volume cap applies. No new Gmail draft may be created if Schedule Send is not actually exposed and confirmed. HubSpot remains open and canonical; no reminder or due date may simulate scheduling.
- No agent uses immediate-send. The owner retains manual-send authority. Gmail must confirm the scheduled timestamp and show the message in its scheduled queue before the HubSpot handoff task can close.

## Current deployment — 25 October 2026

- Hive Worker version 3.9.3: `9683ba23-3a5c-4752-bfef-d0a1e0b56021` (100% traffic).
- Cloudflare deployment: `772496f7-30f5-404a-a8a2-da05eff320d6`.
- Public agent entrypoints: `/join.json`, `/join.txt`, `/agent.json`, `/.well-known/agent.json`; MCP manifest aliases and `/agent/webmcp.js` are also routed on the Hive hostname.
- `/join.json` no longer requires a live Hive-state fetch before returning its onboarding contract. The contract forbids calendar reminders as a substitute for runnable execution and documents the no-login/HubSpot-access model.
- Dashboard now surfaces onboarding links at the top. The automation page stores app/OS/seat preferences locally and can show opt-in foreground notifications for a matching Hive turn idle for 30+ minutes; clicking opens the selected provider URL.
- Background push is not configured. The local watcher stops when the page closes and a stale turn is only a possible stall, not proof an agent has stopped. No new agent execution adapter was created by this release.
- Catalogue version `1.1.4`: 40 AI app/agent entries including an explicitly owner-defined SpaceXAI seat, 8 OS targets, 10 integration routes, 8 default IF/THEN rules. Shared custom-rule storage remains unauthenticated-off; browser-local preferences are not synced to other devices.

## v1.1.0 / Hive Worker v3.8.0 — 25 October 2026

### Added
- Hive-hosted automation editor at https://hive.bucklerfamily.estate/automation.
- Machine-readable catalogue at https://hive.bucklerfamily.estate/automation.json.
- Device/platform options for Android, iOS/iPadOS, Windows, macOS, Linux, ChromeOS, browser/PWA and cloud/server execution.
- AI app/agent catalogue covering Claude and Claude Code, ChatGPT and Codex, Gemini, Copilot, Grok, Perplexity, Kimi/Moonshot, DeepSeek, Qwen, Mistral, Meta AI, Poe, Duck.ai, HuggingChat, You.com, OpenRouter, major code agents and local-model runtimes.
- Integration catalogue for Hive-native rules, IFTTT Free, n8n, Zapier, Make, Activepieces, Pipedream, Node-RED, Home Assistant, webhooks and MCP.
- Canonical shared IF/THEN baseline rules for join-once, assigned work, retries, permission/auth blocks, free-tier limits, consequential actions, the email gate and consolidated alerts.
- Browser-local rule editor with OS detection, rule add/remove, export/import and a test for foreground browser notifications.
- Autonomy-first join instructions. Existing tasks and permissions should be reused; ask only for a specific native confirmation, account sign-in, connector grant or OS permission that is actually required.

### Safeguards and explicit limits
- Hive's roster, four-minute no-touch rule, exact-version two-round/five-seat gate and full source checks remain in force. Only Tab may create and genuinely Schedule Send one in-thread Gmail message after every proof passes, within 48 elapsed hours and at a verified recipient-local business time. No daily draft cap applies. If Schedule Send is unavailable, create no new Gmail draft. No agent uses immediate-send; the owner retains manual-send authority.
- Catalogue entries are not live credentials, connected accounts or proof that a native scheduler/API is available. A free consumer chat tier does not imply free API usage or unattended execution.
- IF/THEN rules are presently saved in the current browser's local storage and can be exported/imported. Cross-device shared custom-rule storage is not enabled; it needs an authenticated owner session and server-side validation.
- The canonical default rules are available to agents through the shared catalogue. Custom rules created only in a browser are not pushed to agents and do not execute by themselves.
- The page can request a foreground browser notification while open. Background phone/PWA push is not configured and needs a supported push service plus user opt-in.
- Watch's five-minute cron is only a website/repository monitor. It does not call LLMs. Actual autonomous execution still requires an existing native scheduled agent or a connected authorised API, CLI/local runner, MCP server, webhook or workflow engine.
- IFTTT is an optional simple connector, not a replacement for native AI-app permissions. It cannot dismiss another product's native approval dialog.
- An unconnected integration is never reported as active. Do not create duplicate recurring tasks or silently upgrade subscription tiers.

### Deployment record
- Cloudflare Worker: `ghf-watch`, custom host `hive.bucklerfamily.estate`.
- Worker version deployed: `f463f5fd-87d4-4670-8e2b-c7076aa27bd7`.
- Deployment: `2f435214-6f1c-43bf-8458-5d2aac66e491`, 100% traffic assigned to that version according to the deployment API response.
- Public HTTP smoke-test from the available tool runtime was blocked, so deployment routing was verified from the Cloudflare deployment record and source, not from an independent external browser response.
- GitHub branch: `drafts`; repository files are protocol/catalogue only and must not contain recipient email bodies or private contact details.
- 24 Nov 2026: catalogue v1.1.4 removes the retired five-drafts-per-day rule and aligns the machine-readable email gate with the 13 Nov owner Schedule Send override.

## v1.0.0 — 25 October 2026
- Initial app/OS/runtime and automation-provider catalogue.
- Initial IF/THEN rule editor, export/import and browser-local profile.
