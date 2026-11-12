---
name: postgres-supabase
description: "Use when designing LEAP AI PostgreSQL schemas, Supabase Auth, row-level security, migrations, indexes and tenant isolation."
---

# Postgres Supabase — LEAP AI skill

## When this skill applies
Build a tenant-safe database with immutable financial/stock events, transparent migration paths and verifiable least privilege.

## Read first
- `docs/04_DATA_MODEL_AND_EVENTS.md`; `docs/08_SECURITY_AND_COMPLIANCE.md`; `docs/03_SYSTEM_ARCHITECTURE.md`.

## Implementation procedure
1. Establish canonical UUID models, store membership roles, timestamps and normalized monetary/unit columns.
2. Write Alembic migrations and (if using Supabase API exposure) SQL grants/RLS policies for every table before publishing routes.
3. Policies must use authoritative store membership and authenticated identity, not user-editable profile claims.
4. Deny nonmembers and revoked staff regardless of guessed or cached store_id.
5. Implement stock movement append-only ledger, unique idempotency keys, historical unit cost snapshots and outbox event table.
6. Define indexes for tenant + date, tenant + product, membership, import checksum and active approvals.
7. Validate transaction semantics for simultaneous stock adjustments and repeated approval requests.
8. Add explicit policies for object storage assets and derived embeddings, including data deletion path.
9. Implement migration and RLS test suite against clean Postgres plus snapshot/recovery guidance.

## Verification and definition of done
- Direct DB RLS negative tests for every exposed tenant table pass.
- No browser exposure of admin/service database secrets.
- Concurrent duplicate writes produce one ledger effect.
- Clean migration works and existing data remains intact in upgrade tests.

## Guardrails and anti-patterns
- Never depend on UI list filtering for tenant isolation.
- Never write production changes directly to Supabase without migrations.
- Never erase or rewrite immutable financial evidence in place.

## Example invocation
`/postgres-supabase Implement the initial tenant-safe schema and Supabase RLS policies.`

## Reporting contract
For each feature report **files changed, schema/API changes, commands actually executed, tests passed/failed, security/finance implications, remaining blockers and next incremental step**. Do not claim outcomes that were not measured. All changes must integrate with existing repository modules rather than generating a disconnected sample app.
