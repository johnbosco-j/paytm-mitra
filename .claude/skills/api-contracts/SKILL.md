---
name: api-contracts
description: "Use when drafting REST contract shapes, OpenAPI generation, typed clients, versioning and integration tests."
---

# Api Contracts — LEAP AI skill

## When this skill applies
Keep Next.js frontend, Python backend, native clients and external adapters aligned under a reviewed API contract.

## Read first
- `docs/05_API_CONTRACTS_AND_INTEGRATIONS.md`; `docs/03_SYSTEM_ARCHITECTURE.md`; `docs/08_SECURITY_AND_COMPLIANCE.md`.

## Implementation procedure
1. Choose noun-based `/api/v1/stores/{store_id}/...` routes, operationId, pagination/filtering and explicit enums.
2. Define Pydantic models with field semantics, nullability, units, INR numeric precision and source provenance.
3. Standardize error envelope with correlation_id and safe machine code; differentiate 401/403/404/409/422.
4. Add idempotency and optimistic revision where concurrent action/stock writes are possible.
5. Generate OpenAPI schema from FastAPI, then typed TypeScript client in `packages/contracts`.
6. Design storage/job/resource endpoints to never leak provider secrets or other-store IDs.
7. Add contract tests and build failure if web types drift from backend schema.
8. For breaking changes create version migration plan and consumer update; use compatibility during rolling deploy.
9. Update docs and examples with actual verified request/response after implementation.

## Verification and definition of done
- OpenAPI and TS types generated from real running code.
- All routes have documented auth and store membership checks.
- Mutation errors are stable and parseable by web client.
- Contract test catches breaking shape changes.

## Guardrails and anti-patterns
- Don't handwrite duplicate frontend types that drift from backend.
- Never expose internal DB row model directly as public response.
- No undocumented endpoints invented for Paytm/Sarvam.

## Example invocation
`/api-contracts Specify and generate typed contracts for demand and approvals APIs.`

## Reporting contract
For each feature report **files changed, schema/API changes, commands actually executed, tests passed/failed, security/finance implications, remaining blockers and next incremental step**. Do not claim outcomes that were not measured. All changes must integrate with existing repository modules rather than generating a disconnected sample app.
