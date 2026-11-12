---
name: backend-fastapi
description: "Use when implementing Python FastAPI routes, Pydantic validation, SQLAlchemy services, business operations and background job APIs."
---

# Backend Fastapi — LEAP AI skill

## When this skill applies
Build clear, secure and testable backend services whose business rules stay deterministic and independent of LLM providers.

## Read first
- `docs/03_SYSTEM_ARCHITECTURE.md`; `docs/04_DATA_MODEL_AND_EVENTS.md`; `docs/05_API_CONTRACTS_AND_INTEGRATIONS.md`.

## Implementation procedure
1. Inspect existing `services/api` package structure, API versioning and current migrations.
2. Define typed request/response Pydantic v2 models with explicit optional fields, validators and stable error codes.
3. Verify Supabase JWT and active merchant membership on every store endpoint; apply role dependencies, not just frontend restrictions.
4. Separate routers, domain service, repository, provider adapter and external task; no logic in a single giant route.
5. Use SQLAlchemy 2 async/sync consistently, transaction scopes, row locks/idempotency where concurrent stock/approval matters.
6. Implement domain events and outbox insert atomically for ledger-changing actions.
7. Keep finance calculations pure and Decimal-based; AI models only return structured interpretation/suggestions.
8. Expose `/health`, `/ready`, OpenAPI and correlation-aware sanitized error envelope.
9. Add real DB integration tests for status codes, validation, user roles, retries and failure states.

## Verification and definition of done
- `ruff`, type checker, pytest pass where configured; OpenAPI compiles with TS client.
- Cross-tenant resource IDs yield no other-store data.
- Mutations idempotent; GET never mutates records.
- 5xx logs redact PII and include trace ID.

## Guardrails and anti-patterns
- Never trust store IDs from request without membership verification.
- No float arithmetic for monetary values, no hallucinated endpoints.
- Avoid catch-all `except` that turns broken transaction into fake success.

## Example invocation
`/backend-fastapi Implement the demand and opportunity v1 REST services with tests.`

## Reporting contract
For each feature report **files changed, schema/API changes, commands actually executed, tests passed/failed, security/finance implications, remaining blockers and next incremental step**. Do not claim outcomes that were not measured. All changes must integrate with existing repository modules rather than generating a disconnected sample app.
