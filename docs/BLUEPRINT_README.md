# LEAP AI — Claude Code Master Build Kit

> **Lost-demand Evaluation & Action Platform**  
> **Product:** The Merchant Growth Operating System  
> **Hackathon:** Paytm Build for India AI — Chennai, 15 November 2026  
> **Team:** Johnbosco J · Jeffrey Figo J · Joe Naren A  
> **Scope:** Build a real merchant application, not a fake dashboard, canned chat, or simulated backend.

## What you are getting

- `CLAUDE.md`: persistent instructions that Claude Code reads when working in the project.
- `.claude/skills/*/SKILL.md`: independently invocable skills for specialized engineering tasks.
- `docs/01_MASTER_IMPLEMENTATION_PLAN.md`: delivery phases, dependencies, milestones, verification gates.
- `docs/02_PRODUCT_REQUIREMENTS.md`: exhaustive merchant jobs-to-be-done, features, acceptance criteria.
- `docs/03_SYSTEM_ARCHITECTURE.md`: deployment boundaries, data flows, monorepo layout, diagrams.
- `docs/04_DATA_MODEL_AND_EVENTS.md`: relational schema, tenancy, events, ledger semantics.
- `docs/05_API_CONTRACTS_AND_INTEGRATIONS.md`: REST contracts, provider adapters, authorized Paytm integration.
- `docs/06_AI_AGENTS_AND_EVALUATION.md`: voice-to-request AI, confidence handling, LangGraph, evals.
- `docs/07_DESIGN_SYSTEM_AND_UX.md`: differentiated premium UI, mobile-first flows, motion and spatial layer.
- `docs/08_SECURITY_AND_COMPLIANCE.md`: privacy, consent, access control, payments, secrets, abuse.
- `docs/09_TESTING_AND_ACCEPTANCE.md`: unit, integration, browser, accessibility, security and AI evals.
- `docs/10_ROADMAP_AND_TEAM.md`: event critical path + responsible owners + long-term build.
- `docs/11_RELEASE_RUNBOOK.md`: environment, deployments, monitoring and rollback.
- `docs/12_METRICS_AND_EXPERIMENTS.md`: impact instrumentation and margin-aware evaluation.
- `docs/13_CLAUDE_PROMPTS.md`: exact starter and incremental instructions for Claude Code.
- `docs/14_SOURCE_REGISTER.md`: upstream docs and product evidence; no fake claims.
- `docs/15_RISK_AND_DECISIONS.md`: trade-offs, priorities and failure modes.
- `docs/16_USER_JOURNEYS.md`: exhaustive real-world walkthrough and edge-case scenarios.
- `docs/17_10_SLIDE_PITCH_ALIGNMENT.md`: connects implementation to pitch claims.

## Start here (Mac / Linux)

1. Create a new git repository, or copy this entire kit into the root of your LEAP AI repository. Preserve the **hidden** `.claude` directory.
2. Check that `CLAUDE.md` exists at repository root, and run `find .claude/skills -name SKILL.md`.
3. Install a supported Claude Code version from its official documentation and authenticate.
4. Run `claude` from the project root.
5. Paste the **Kickoff prompt** from `docs/13_CLAUDE_PROMPTS.md`. Do not ask Claude to create everything in one giant unchecked step.
6. Ask Claude to implement Phase 0 foundations, then the entire Phase 1 merchant journey, completing tests after each slice.
7. Use `/skills` to inspect available skills or call one explicitly, e.g. `/frontend-nextjs`, when the local Claude Code version supports direct skill invocation.

### Copy-paste quick start for Claude Code

```text
Read CLAUDE.md and docs/01_MASTER_IMPLEMENTATION_PLAN.md through docs/10_ROADMAP_AND_TEAM.md. Treat those as the agreed LEAP AI specification. Do not create fake metrics, fabricated Paytm APIs, or UI-only flows. First inspect the repository and write an implementation inventory and task graph. Then implement Milestone 0 (foundation) with working local setup, authentication, tenant-safe data model, CI checks, and tests. Follow the individual skills in .claude/skills as each specialty becomes relevant. Do not skip acceptance criteria. After each milestone report changed files, commands executed, tests passed/failed, and the next highest-risk task.
```

## Strategic scope

- **Day-one essential vertical slice:** real onboarding → real store → real catalog/costs → missed request capture (text + Tamil voice) → structured demand signal → profit-aware proposed stocking trial → approve → record result → observable dashboard update.
- **Capability expansion:** stockout/expiry, supplier quotes, campaigns, customer retention, cash flow, settlement import/reconciliation, staffing, collaborative demand signals.
- **Platform scale:** real Paytm integration **only with authorization**; queues, observability, multistore permissions, offline mobile, model evaluation, audit compliance, cost controls.
- **Optional experiences:** Three.js + Blender 3D shelf view; Unity digital twin only if it adds validated value and does not delay core flows.

## Project truthfulness contract

1. Product requirements are **proposals** until implemented and tested.
2. Local test fixtures may be synthetic but must be labeled and must never substitute for production transaction data.
3. No Paytm affiliation, partnership, approved API access, payment processing, measured merchant ROI or customer traction is claimed unless independently documented.
4. Every financial forecast exposes data source, assumptions, uncertainty and relevant costs. Revenue is not profit.
5. Every external write (outbound message, reorder, campaign, payment-related action) needs explicit merchant approval and an audit trail.
6. This package contains **instructions and specifications**, not a completed app.

## Recommended working order

`CLAUDE.md` → `01_MASTER_IMPLEMENTATION_PLAN.md` → `02_PRODUCT_REQUIREMENTS.md` → `03_SYSTEM_ARCHITECTURE.md` → `04_DATA_MODEL_AND_EVENTS.md` → `/backend-fastapi` + `/postgres-supabase` → `/frontend-nextjs` + `/merchant-demand-intelligence` → `/ai-orchestration` + `/voice-indic` → `/testing-and-quality` → `/security-and-privacy` → `/devops-and-release`.

## Research and assumptions

See `docs/14_SOURCE_REGISTER.md`. Framework/provider interfaces change: Claude must verify SDK methods and packages against current official documentation **at implementation time** before generating code.
