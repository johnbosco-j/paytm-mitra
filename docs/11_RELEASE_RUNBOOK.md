# 11 — Environment setup, CI/CD, deployment and incidents

## Local environment

Standardize `.env.example` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or current public key naming), `SUPABASE_JWT_*` / JWKS URL, `DATABASE_URL`, `REDIS_URL`, `OBJECT_STORAGE_*`, `SARVAM_API_KEY`, `ANTHROPIC_API_KEY`/alternate provider, `SENTRY_DSN`, `APP_ENV`, `CORS_ALLOWED_ORIGINS`. Never commit actual values; verify current provider variable/SDK conventions.

Local services: Postgres, Redis, API and worker via Docker Compose; Next.js via `pnpm dev` or Compose. Define migration command, DB reset only for local/test, data seed explicitly labeled synthetic and disabled in production. Document exactly how `pnpm install`, Python dependency manager, formatter and test commands are invoked after bootstrapping. **Do not hard-code imaginary scripts before the repository has package manifests.**

## CI pipeline

1. Secret scan and dependency review.
2. Install pinned Node and Python toolchains with lockfiles.
3. TS lint + typecheck + web unit tests.
4. Python ruff/format + mypy or pyright + pytest.
5. Fresh Postgres migration and RLS test.
6. OpenAPI client generation + compile.
7. Browser E2E critical flow and accessibility smoke.
8. Build images and inspect artifact digest; deploy staging after checks.

## Staging/production separation

- Separate tenant databases/projects, object storage buckets, provider keys, admin accounts, callback/webhook URLs and feature flags.
- Staging uses fake/test merchant data clearly labeled; no customer data copied from production without approved anonymization.
- Production requires verified custom domain, TLS, security headers, alerts and backup plan.

## Release checklist

- Review migration reversibility, data locks and rollout order.
- Confirm backup snapshot and latest restore drill.
- Validate least-privilege credentials and current external provider access.
- Deploy schema compatible first, then API/worker, then Next.js frontend.
- Smoke: create auth session, read store, add demand, finance simulation, approval denial/approval, log out and cross-store unauthorized read.
- Verify internal metrics: 5xx rate, p95 latency, job queue age, STT error, LLM cost, DB pool, client JS errors.
- Enable features gradually; keep kill switches for external sends/Paytm sync/model provider.

## Observability

Log correlation IDs, safe store identifiers, domain event class, elapsed time and outcome. Do not log PII/raw receipts/audio/credentials. Use OpenTelemetry traces, Sentry error reporting and metrics dashboards. Every background job has retry counter, dead-letter handling and sanitized diagnostics. Alert on auth anomalies, cross-tenant denial spikes, reconciliation anomalies and runaway model spend.

## Backup and restore

Encrypted daily or managed continuous database backup according to service capability; retention policy documented. Test restore into isolated environment; verify migrations, indexes, tenant policies, and object references. Restore drill results recorded, not merely assumed.

## Outage modes

- Model provider down → continue deterministic dashboards, ledger and manual requests.
- STT down → type Tamil request, optionally queue recording.
- Redis/worker down → text capture still succeeds; async jobs labeled pending and recover when available.
- PostgreSQL down → read-only unavailable notice, no pretending writes succeeded; retry only idempotent actions.
- Paytm connector down → disable sync and warn of stale data; do not hide settlement gaps.
- Storage down → avoid accepting lost audio; preserve local safe retry and user notice.

## Rollback

Rollback frontend/backend to compatible revision. Prefer forward-fix of DB migrations; restore if destructive change is unavoidable and recovery plan approved. Do not revert a migration without considering writes after the release. Freeze partner sends if event processing becomes inconsistent.

## Performance and cost

Establish budgets for frontend bundle sizes, audio minute cost, AI tokens per extraction, database query latency and outgoing notifications. Implement tenant quotas, caching for read-only summaries, short-lived signed URLs, worker concurrency limits, and backpressure on high-cost requests.
