# 13 — Claude Code prompt library / handoff protocol

> **Use these prompts in order.** They ask Claude Code to write and verify real code. Do not ask it to print 100,000 lines without tests. Claude should inspect repo state before acting and never fabricate passing tests or external access.

## Prompt 0 — full project initialization (paste first)

```text
You are the lead engineer building LEAP AI, an actual independent merchant growth platform for Paytm Build for India AI Hackathon Chennai. Read root CLAUDE.md and docs/01_MASTER_IMPLEMENTATION_PLAN.md through docs/10_ROADMAP_AND_TEAM.md, then inspect current repo files. Read relevant .claude/skills as necessary. Before coding, return: (1) repo inventory, (2) a dependency DAG for M0–M5, (3) exact files to create, (4) risks and unverified credentials, (5) implementation order. Implement only M0 now: Next.js App Router + TypeScript strict, Tailwind/shadcn, FastAPI/Pydantic, Postgres migrations/RLS approach, Redis worker, clean local boot, Docker, environment example, CI lint/type/tests and health endpoint. Do not hardcode fake merchant metrics or unapproved Paytm endpoints. Execute checks and report their results.
```

## Prompt 1 — foundational tenant-safe merchant product

```text
Implement M1 of the LEAP AI plan as an end-to-end working feature: verified Supabase Auth session in FastAPI, store creation, membership-based tenant isolation, role permissions, product catalog CRUD including purchase/selling cost, inventory adjustment ledger, beautiful mobile-responsive Next.js onboarding and catalog screens. Read skills frontend-nextjs, backend-fastapi, postgres-supabase, security-and-privacy and testing-and-quality. Produce migrations, OpenAPI client, pytest security tests, Playwright smoke tests, and docs. Absolutely forbid cross-store reads even if store_id is changed in URL. Run verification commands and report exact results.
```

## Prompt 2 — voice-first demand capture

```text
Implement M2: a real missed-request inbox supporting Tamil/English typed input and optional uploaded/recorded audio via an official currently documented provider (Sarvam if key available). Use provider abstraction. AI extraction must be structured and reviewed by merchant; unknown units/price remain null. Store original/transcribed/confirmed states and audit correction, with signed storage and retention. Implement mobile microphone permission, upload and provider-failure states. Manual text must work without provider keys. Read voice-indic, ai-extraction, merchant-demand-intelligence, backend-fastapi, frontend-nextjs and security skills. Add adversarial tests and an actual E2E flow.
```

## Prompt 3 — explainable opportunity + profit math

```text
Implement M3: derive opportunity candidates only from merchant-confirmed missed requests, real product inventory and actual configured costs. Python Decimal-only economics, separate purchase cash outlay from cost of goods sold and profit. Provide evidence links, conservative trial sizing, confidence and 'insufficient data' behavior. Use transparent rule baseline first, layer model-generated explanation only when it cites source IDs. Read unit-economics, merchant-demand-intelligence, forecasting-and-ml and ai-orchestration skills. Create golden math tests including 16 bought @ ₹22, 14 sold @ ₹35; cash difference ₹138, gross profit ₹182, remaining inventory ₹44. Hook real API to scenario UI with tests.
```

## Prompt 4 — approval-to-outcome workflow

```text
Implement M4: draft/approve/reject/execute/complete action state machine with independent server-side role authorization, idempotency, audit events, a transactionally updated stock ledger and user-visible trial timeline. No autonomous supplier orders or outgoing messages. Record sales/returns/waste and expose actual vs projected results. Read approval-workflows, backend-fastapi, postgres-supabase, inventory-and-expiry and testing-and-quality skills. Prove a staff user cannot approve and repeated POST cannot create duplicate movements.
```

## Prompt 5 — make product memorable and deployment-ready

```text
Implement M5 and UX polish without adding fake features: visually exceptional LEAP AI interface with polished dark navy/cyan design, Tamil font support, responsive mobile capture, interactive evidence cards, a transparent unit economics breakdown and working approval timeline. Use real persisted backend data. Set up production-like staging deployment for Next.js web, FastAPI API, worker and managed Postgres, plus Sentry and smoke E2E. Read design-system, frontend-nextjs, internationalization-accessibility, observability, devops-and-release and testing-and-quality skills. Hide incomplete modules. Verify full browser journey and document all unmet prerequisites.
```

## Prompt 6 — expand operations without building empty screens

```text
Review P1/P2 features in docs/02_PRODUCT_REQUIREMENTS.md. Pick the single highest-value next vertical slice using user value, implementation effort, dependencies and permissions; justify selection in a brief ADR. Implement it across schema, API, UI, docs, events and tests. Do not enable a navigation item if feature has no working workflow. Follow the matching skill plus security-and-privacy and testing-and-quality. Demonstrate authentic persistence and failures, not synthetic production metrics.
```

## Prompt 7 — security audit / adversarial challenge

```text
Act as the critical security engineer for LEAP AI. Inspect authentication, RLS, store-id scoping, signed upload paths, agent tools, secrets, prompt injection, customer messaging consent, and monetary approval. Write tests that attempt unauthorized cross-tenant read/write, duplicate stock movement, privilege escalation, CSV formula injection and malicious transcript instructions. Fix issues, run full suite, report actual results and residual vulnerabilities. Use security-and-privacy and testing-and-quality skills.
```

## Prompt 8 — realistic launch review

```text
Audit LEAP AI readiness as if 10 real small merchants were going to use it for a month. Compare implementation to docs/01–12 and produce a feature-by-feature matrix: operational, permission gated, unimplemented, at risk. Do not write new code until critical P0 defects are classified. Inspect logs/trace handling, backup/restore, export/deletion, finance arithmetic, i18n, provider costs, error states, GitHub Actions and deployment. Run tests and produce a go/no-go recommendation with precise supporting evidence.
```

## Prompt 9 — specialized UI request

```text
Create the specified LEAP AI screen without changing business rules: read docs/07_DESIGN_SYSTEM_AND_UX.md and .claude/skills/design-system/SKILL.md plus frontend-nextjs. Build accessible mobile-first UI bound to actual typed APIs; include empty/loading/error/permission-denied states, no fake metrics, Tamil/English support, responsive views at 360/768/1440px. Test real interactions; provide screenshots and changed files.
```

## Prompt 10 — safe Paytm connectivity

```text
Assess Paytm connectivity readiness. Read current official Paytm docs and the integration scopes actually issued to this team (do not invent). If authorized credentials and a matching account capability exist, implement adapter with signature verification, replay-safe ingestion, per-merchant consent, backfill and tests. Otherwise implement only a generic authorized statement CSV import and document exact access that is missing. Never scrape private dashboards, imply official partnership or claim item-level data from payment-only records. Use provider-integrations, payment-reconciliation and security-and-privacy skills.
```

## Prompt 11 — build the optional 3D retail radar

```text
Only after all P0 E2E gates pass: build a performant optional 3D inventory shelf heatmap driven by real authorized item availability and unmet-request counts. Blender glTF assets + Three.js/React Three Fiber inside Next.js, with accessible 2D equivalent and reduced-motion fallback. Keep it isolated behind a feature flag. Use spatial-3d-ui plus frontend-nextjs skills. No Unity dependency in core app; if Unity added, use read-only API integration.
```

## Prompt 12 — sprint review and regression

```text
Inspect git status and changed files; read current milestone in docs/01. Provide working/blocked matrix and identify the single highest-leverage task for an actual merchant journey. Run applicable lint, types, migration check, pytest, Playwright and security negative tests. Fix P0 regressions before new features. Update docs and implementation scoreboard. Be explicit about tests not run and any provider keys missing. Do not claim success without evidence.
```

## Prompt operating guidance

- **Explicitly select a skill** with `/skill-name` if your Claude Code version supports direct invocation; otherwise Claude Code will load relevant project skill instructions when applicable.
- Use one milestone per working session, or one bounded vertical slice after foundational work. Avoid asking it to "build every feature today." Parallel agents can coordinate independent modules after contracts are frozen.
- Use worktree branches for parallel agent work, and avoid concurrent edits to migration/schema files without coordination.
- Require precise commit summaries and test output. Never make `git commit` a substitute for testing.
