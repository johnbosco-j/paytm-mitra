# LEAP AI — Claude Code Skill Index

This directory contains **38 independently invocable project-specific Claude Code skills**. All skills are stored at `.claude/skills/<name>/SKILL.md` and contain YAML frontmatter and domain-specific implementation, verification, and safety instructions.

## Usage

From your LEAP AI repository root, start `claude`. The skills are available via contextual matching and, depending on your Claude Code version, slash invocation: `/frontend-nextjs`, `/voice-indic`, `/unit-economics`, etc. Do not ask Claude to invoke all 38 at once; select by task.

## Skills

1. **`/admin-governance`** — Use when implementing store role management, audit reporting, privacy requests, feature entitlements and support controls.
2. **`/ai-extraction`** — Use when converting merchant text, voice transcripts, invoices or receipts into structured validated business records.
3. **`/ai-orchestration`** — Use when creating LangGraph merchant agents, bounded tool use, human approval interrupts and action workflow checkpoints.
4. **`/api-contracts`** — Use when drafting REST contract shapes, OpenAPI generation, typed clients, versioning and integration tests.
5. **`/approval-workflows`** — Use when implementing merchant approval, rejection, edits, audit, trial state machines and reversible external actions.
6. **`/backend-fastapi`** — Use when implementing Python FastAPI routes, Pydantic validation, SQLAlchemy services, business operations and background job APIs.
7. **`/campaigns-and-retention`** — Use when building margin-safe promotions, campaign content, loyalty and consented customer re-engagement.
8. **`/customer-service-intelligence`** — Use when implementing merchant-side customer service notes, complaint triage, recurring questions and resolution workflow.
9. **`/data-import-and-etl`** — Use when implementing CSV, POS exports, payment report import, schema mapping, cleaning and data quality pipelines.
10. **`/design-system`** — Use when establishing LEAP AI visual identity, reusable UI components, micro-interactions, responsive layouts, and visual quality.
11. **`/devops-and-release`** — Use when setting up Docker, GitHub Actions, staging, deployment, backups, rollback or operational readiness.
12. **`/document-vision-ocr`** — Use when creating invoice/receipt scanning, image extraction, inventory intake and reviewable document processing.
13. **`/financial-operations`** — Use when adding expense intelligence, cash runway forecasting, finance dashboard and operational accounting explanations.
14. **`/forecasting-and-ml`** — Use when implementing data baselines, forecasts, opportunity rankings, backtesting and measured model quality.
15. **`/frontend-nextjs`** — Use when implementing or changing LEAP AI Next.js App Router pages, typed React components, forms, data fetching, and state handling.
16. **`/internationalization-accessibility`** — Use when adding Tamil/English localization, Indian number formatting, inclusive interactions, and accessibility audits.
17. **`/inventory-and-expiry`** — Use when implementing products, stock movement ledger, lot expiry, stockout alerts and corrective inventory operations.
18. **`/merchant-analytics-and-metrics`** — Use when building merchant dashboards, reporting queries, ROI metrics, attribution or evaluating growth outcomes.
19. **`/merchant-demand-intelligence`** — Use when capturing, normalizing, clustering or ranking customer requests that did not result in a sale.
20. **`/merchant-onboarding`** — Use when implementing the first real merchant journey: signup, stores, roles, locale, catalog and business settings.
21. **`/mobile-native`** — Use when building optional real Android Kotlin/Jetpack Compose and iOS Swift/SwiftUI clients sharing LEAP APIs.
22. **`/neighborhood-privacy`** — Use when proposing cross-merchant demand signals or building privacy-preserving aggregated local inventory insights.
23. **`/notifications-communications`** — Use when adding merchant alert inbox, email/SMS communication, reminders or sending approved campaign drafts.
24. **`/observability`** — Use when adding production logs, metrics, traces, Sentry, LLM-cost dashboards and incident observability.
25. **`/offline-pwa-mobile`** — Use when implementing offline-first shop-floor capture, service workers, local sync, or native Kotlin/Swift integration planning.
26. **`/payment-reconciliation`** — Use when importing authorized Paytm/payment exports, matching settlements, detecting exceptions or designing provider-safe connectors.
27. **`/postgres-supabase`** — Use when designing LEAP AI PostgreSQL schemas, Supabase Auth, row-level security, migrations, indexes and tenant isolation.
28. **`/product-architect`** — Use when planning LEAP AI features, choosing architecture, splitting scope, or reconciling the pitch with a real product.
29. **`/provider-integrations`** — Use when integrating Paytm, Sarvam, Claude API, email, POS or supplier systems and managing credentials/webhooks.
30. **`/release-audit`** — Use before submission, deployment, pilot onboarding or claiming any LEAP AI capability works.
31. **`/security-and-privacy`** — Use for auth/RLS audits, threat modeling, secrets, financial authorization, privacy, consent, and secure external integrations.
32. **`/spatial-3d-ui`** — Use when creating Blender assets, Three.js/React Three Fiber charts or an optional Unity store digital twin.
33. **`/sprint-orchestration`** — Use when coordinating the three-person hackathon sprint, planning milestones, or sequencing tasks across Claude Code sessions.
34. **`/supplier-procurement`** — Use when implementing store suppliers, quote comparison, purchase order drafts, fulfillment tracking and procurement decisions.
35. **`/team-collaboration`** — Use when coordinating Johnbosco, Jeffrey and Joe, reviewing branches, delegating files or preparing technical handoff.
36. **`/testing-and-quality`** — Use when creating unit, integration, Playwright, accessibility, AI evals, security tests or release-quality checks.
37. **`/unit-economics`** — Use when computing merchant profit, stock-trial scenarios, contribution margin, purchase outlay, pricing and ROI.
38. **`/voice-indic`** — Use when building Tamil/English speech input, transcription, code-switching, microphone UX and speech provider adapters.

## Suggested skill combinations

- **Foundations:** `/product-architect` + `/sprint-orchestration` + `/postgres-supabase` + `/backend-fastapi` + `/frontend-nextjs` + `/testing-and-quality`
- **Tamil request capture:** `/voice-indic` + `/ai-extraction` + `/merchant-demand-intelligence` + `/internationalization-accessibility`
- **Growth decision loop:** `/unit-economics` + `/forecasting-and-ml` + `/approval-workflows` + `/merchant-analytics-and-metrics`
- **Money and systems:** `/payment-reconciliation` + `/financial-operations` + `/provider-integrations` + `/security-and-privacy`
- **Retail operations:** `/inventory-and-expiry` + `/supplier-procurement` + `/campaigns-and-retention`
- **Production readiness:** `/devops-and-release` + `/observability` + `/release-audit` + `/team-collaboration`

See `docs/13_CLAUDE_PROMPTS.md` for copy-paste milestone prompts and `docs/01_MASTER_IMPLEMENTATION_PLAN.md` for implementation priority.
