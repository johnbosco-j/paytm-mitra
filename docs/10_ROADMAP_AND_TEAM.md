# 10 — Delivery schedule, owners, and team operating plan

## 1. Real-time context

Hackathon in Chennai is scheduled for **15 November 2026**. This blueprint was prepared 12 November 2026. Treat event organizers' current submission status, access and event rules as authoritative; do not assume a submission deadline not published in the devSemble stage panel. There is very little implementation time. Prioritize a working full flow over optional technology breadth.

## 2. Suggested division of responsibilities

| Owner | Primary responsibility | Review obligations |
|---|---|---|
| **Johnbosco J** | architecture, Python FastAPI, AI adapters/agents, unit economics, deployment integration | approve API contract and final finance/security gate |
| **Jeffrey Figo J** | Next.js UI, routing, design tokens, accessibility, charts, mobile/PWA | approve UI quality, live user interaction, typed client |
| **Joe Naren A** | PostgreSQL models, imports, test fixtures and eval sets, QA, business validation, pitch story | approve data correctness, test coverage, sources and rehearsal |

Everyone owns code reviews, security and observed results together. Do not assert that a member performed these tasks until they actually do.

## 3. Three-day hackathon sprint (compressed)

### Nov 12: establish working base
- Johnbosco: FastAPI project, auth verification interface, service boundaries, pricing calculation module and API skeleton.
- Jeffrey: web shell, UI tokens, authentication routes, onboarding, mobile navigation, form patterns.
- Joe: Postgres schema + Alembic, sample labeled fixture set, cross-tenant test accounts, expected golden financial cases.
- Sync: one-page API contract and DB map; CI green; environment documented.
- End of day gate: sign-in and store creation working end-to-end in local stack.

### Nov 13: capture demand with confidence
- Johnbosco: missed-request API, STT provider adapter, typed extraction, confidence/correction logic, safe job statuses.
- Jeffrey: Demand Radar, mic/typed capture, transcript review, request cards and error states.
- Joe: voice fixture evaluation, catalog import/CRUD QA, duplicate/alias matching tests, security checks.
- End of day gate: Tamil + typed request persist and are editable; cross-tenant negative tests pass.

### Nov 14: decision, approval and outcome
- Johnbosco: opportunity scoring + deterministic economics + approval/trial services, API traceable evidence.
- Jeffrey: opportunity scenario page, approval sheet, trial timeline, outcomes dashboard and polish.
- Joe: financial goldens, browser E2E, edge-case retries, test deployment smoke and concise pitch evidence.
- Team: staging release, secrets/backup, actual live walkthrough; freeze core logic at night.
- End of day gate: P0 full loop usable via deployed web, persistent backend and real database.

### Nov 15: event day
- Verify domain and status; test live sign-in, database, audio, backend queues; have typed request fallback.
- Use a 4–5 minute demonstration: missed signal → language capture → verified demand → action math → approval → result.
- Present what works, what is built but permission-gated, and what is roadmap. No exaggerated traction or official Paytm integration claims.
- Keep an offline read-only pitch/video as fallback, clearly separate from live functionality.

## 4. Suggested longer-term roadmap (after event)

**Weeks 1–2:** inventory lots, expiry, supplier quote flows, stronger input handling, STT evaluation, consent center, improved uptime.

**Weeks 3–4:** authorized CSV import, settlement exception workflows, campaigns + consent, staff invites, analytics metrics, improved testing.

**Weeks 5–8:** forecasting/backtests, multi-store permissions, periodic jobs, tenant quotas, notification routing, reliable invoicing/OCR.

**Weeks 9–12:** real merchants under consented pilot, instrumentation, 30-store pilot *proposal* validated, incident/onboarding support, pricing tests, security review and approved provider integrations.

**Beyond:** B2B vendor integrations, city-level aggregation (with privacy thresholds), optional mobile/3D and commercial packaging. Release dates are targets, not promises.

## 5. Mandatory synchronization artifacts

- **Architecture decision log** for new provider or stack choice.
- **API contract update** whenever response shape changes.
- **Daily check-in:** done, blocked, test proof, next PR.
- **Demo readiness matrix:** core flow, security, provider fallback, mobile and live staging.
- **Risk register:** hidden deadline uncertainty, limited Paytm API access, Tamil STT accuracy, unit cost completeness, expensive external AI calls.

## 6. Blockers policy

If an authorized Paytm integration is unavailable, do not freeze the app: merchant-uploaded transaction CSV and manually entered sales remain real and valid workflows. If speech API quota runs out, typed Tamil entry and optional queued audio processing remain. If 3D is not ready, it stays behind a flag and is absent from core navigation.

## 7. Hackathon evaluation narrative

- **Problem:** every unfulfilled ask creates no payment event, and merchant operations are fragmented.
- **Uniqueness:** consented unmet demand ledger + profit-aware proposed actions + audit + outcome learning.
- **Technical depth:** AI provider abstraction, Tamil speech, event-driven backend, tenant-safe Postgres, tested finance math, approval state machine.
- **Business value:** track actual incremental gross profit with honest baselines, not "chat prompts sent".
- **Scalability:** modular domains and safe connector architecture; no false launch claim.
- **Team evidence:** each person demonstrates tested ownership of a visible part of the pipeline.

## 8. Acceptance calendar

| Gate | By | Proof |
|---|---|---|
| Auth + DB + web | Nov 12 | first test store persisted |
| Tamil/text demand | Nov 13 | request saved, reviewed, replay safe |
| Real recommendation | Nov 14 | source rows + arithmetic verified |
| Approvals + outcome | Nov 14 | E2E with stock and sales audit |
| Staging + mobile + fallback | Nov 14 | smoke and screenshots |
| Pitch | Nov 15 | clear claims grounded in working behavior |
