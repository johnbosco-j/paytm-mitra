# Start building LEAP AI with Claude Code

## Step 1 — Install this kit into your repo

Copy **all contents** of this package into your LEAP AI repository. Include the hidden `.claude` directory (macOS Finder: press `Command + Shift + .` to show hidden files).

## Step 2 — Open Claude Code from the project root

```bash
cd path/to/your/leap-ai
claude
```

## Step 3 — Paste this kickoff instruction

```text
Read CLAUDE.md, README.md, docs/01_MASTER_IMPLEMENTATION_PLAN.md, docs/02_PRODUCT_REQUIREMENTS.md, docs/03_SYSTEM_ARCHITECTURE.md and docs/13_CLAUDE_PROMPTS.md. This is a real application, not a fake demo. Audit the repo first, make a task plan and implement only Milestone 0. Every new capability must have real schema/API/UI/tests, merchant tenant authorization, reliable failure states and no fake outcomes. Keep approved external Paytm access behind a feature flag. Run actual checks, show passing/failing output and tell me the next task after M0.
```

## Step 4 — Implement in order

1. M0: monorepo, auth, database/migrations, CI, health.
2. M1: merchant onboarding, real catalog and tenant isolation.
3. M2: Tamil/typed unmet demand capture and confirmation.
4. M3: explainable data-backed opportunities, deterministic INR calculations.
5. M4: approvals, stock/sales trial tracking, actual results.
6. M5: responsive visual polish, real deployment, negative tests.
7. Later: suppliers, campaigns, statement reconciliation, forecasting, neighborhood aggregates, 3D/native.

## Step 5 — Use targeted project skills

- `/frontend-nextjs` for UI routes and typed API client.
- `/voice-indic` for Tamil speech capture.
- `/unit-economics` for margin/cash precision.
- `/security-and-privacy` for access control review.
- `/testing-and-quality` for honest acceptance evidence.

For other areas see `SKILLS_INDEX.md`. You may invoke one explicitly or let Claude Code match skills as supported by your installed version.

## Important

This is a **complete implementation instruction package**, **not yet built source code**. You must supply API credentials and approve any account connection, production deployment, financial action, customer communication or integration that requires authorization.
