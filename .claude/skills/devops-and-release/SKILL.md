---
name: devops-and-release
description: "Use when setting up Docker, GitHub Actions, staging, deployment, backups, rollback or operational readiness."
---

# Devops And Release — LEAP AI skill

## When this skill applies
Create repeatable local and hosted LEAP AI environments with verified gates and safe secrets.

## Read first
- `docs/11_RELEASE_RUNBOOK.md`; `docs/09_TESTING_AND_ACCEPTANCE.md`; `docs/03_SYSTEM_ARCHITECTURE.md`.

## Implementation procedure
1. Set up reproducible `pnpm`/Python lockfiles, lint/type/test scripts and Docker Compose services for Postgres/Redis/API/worker/web.
2. Maintain environment examples with placeholders; create secret-scanned `.gitignore`, separate staging and prod credentials.
3. Add CI for web lint/type/unit, backend ruff/type/pytest, database migration/RLS tests and OpenAPI generated client consistency.
4. Add Playwright E2E critical path, dependency scans and deployment artifact checks; fail fast on P0 errors.
5. Deploy Next.js on Vercel/Node host and persistent FastAPI/worker containers; managed Supabase/Postgres and Redis.
6. Define DNS/TLS, CORS, headers, structured logs, alerts, health/readiness checks, queues and object storage restrictions.
7. Implement feature flags for incomplete integrations, supplier messages, 3D and experimental models.
8. Create DB backup/restore plan, migration rollout order, reversible app rollback and smoke checks after deploy.
9. Report exact commands and CI results; compare staging/production config without exposing secrets.

## Verification and definition of done
- Fresh checkout starts by documented commands; clean DB migration and health pass.
- Staging live P0 flow works in a new browser with new data.
- Backup/restore tested or explicitly identified as release blocker.
- No live secrets committed and no synthetic production metric contamination.

## Guardrails and anti-patterns
- Don't deploy an untested migration into production.
- Avoid deploying backend to an environment incompatible with long-lived jobs.
- No "deployed" claim based only on successful frontend build.

## Example invocation
`/devops-and-release Set up CI, staging deployment and rollback for web/API/worker.`

## Reporting contract
For each feature report **files changed, schema/API changes, commands actually executed, tests passed/failed, security/finance implications, remaining blockers and next incremental step**. Do not claim outcomes that were not measured. All changes must integrate with existing repository modules rather than generating a disconnected sample app.
