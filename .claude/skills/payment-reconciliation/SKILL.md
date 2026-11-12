---
name: payment-reconciliation
description: "Use when importing authorized Paytm/payment exports, matching settlements, detecting exceptions or designing provider-safe connectors."
---

# Payment Reconciliation — LEAP AI skill

## When this skill applies
Provide traceable payment-versus-settlement accounting without pretending that payment data grants SKU or customer access.

## Read first
- `docs/05_API_CONTRACTS_AND_INTEGRATIONS.md`; `docs/04_DATA_MODEL_AND_EVENTS.md`; `docs/08_SECURITY_AND_COMPLIANCE.md`.

## Implementation procedure
1. Verify official Paytm product capability/credentials and permitted merchant scopes before using live API.
2. Default to secure merchant-authorized CSV imports with schema mapping preview, content hashing and versioned normalization.
3. Preserve immutable raw rows: provider reference, amount, currency, timestamp, fee, refund/status, import provenance.
4. Normalize settlement records independently; date/time tolerance and amount matching are configurable and explainable.
5. Reconcile with deterministic rules; candidate matches get a score and ambiguous cases stay reviewable, not forced.
6. Keep unmatched, duplicate, delayed, fee-difference and refund cases in exception queue with traceable input IDs.
7. Merchant actions are annotations/corrections, not destructive replacement of source evidence.
8. If an approved Paytm partner endpoint exists, use official signing/webhook verification/retry and authorization; feature flag it separately.
9. Test duplicate import, replay, time zone, reversals, difference in net vs gross amounts, wrong store access and stale source.

## Verification and definition of done
- Every matched amount can be traced to source rows and calculation rules.
- Import replay cannot duplicate payment facts.
- No live API access claimed if credentials are absent.
- Exceptions do not silently mutate bank/payment balances.

## Guardrails and anti-patterns
- No scraping Paytm portals or guessing undocumented endpoints/signature logic.
- Never infer SKU-level sales from ordinary UPI transaction amount.
- Do not mix settled cash with gross sales without fee/refund treatment.

## Example invocation
`/payment-reconciliation Build an honest settlement CSV importer and exception review workflow.`

## Reporting contract
For each feature report **files changed, schema/API changes, commands actually executed, tests passed/failed, security/finance implications, remaining blockers and next incremental step**. Do not claim outcomes that were not measured. All changes must integrate with existing repository modules rather than generating a disconnected sample app.
