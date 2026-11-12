---
name: financial-operations
description: "Use when adding expense intelligence, cash runway forecasting, finance dashboard and operational accounting explanations."
---

# Financial Operations — LEAP AI skill

## When this skill applies
Help merchants see their operational cash position while clearly separating observed amounts, assumptions and scenarios.

## Read first
- `docs/04_DATA_MODEL_AND_EVENTS.md`; `docs/12_METRICS_AND_EXPERIMENTS.md`; `docs/08_SECURITY_AND_COMPLIANCE.md`.

## Implementation procedure
1. Enumerate expense categories and payment source; support invoices/manual entry with reviewed attribution.
2. Build money ledger for revenue, inventory purchase outlay, operating expense, fees and cash movements with source trace.
3. Derive scenario cash runway from known balances and scheduled costs; unknown beginning balance cannot be assumed zero.
4. Expose optimistic/baseline/conservative cases, data coverage and which obligations are excluded.
5. Separate accounting profit from cash, and unit economics from income statements.
6. Flag impending known bill or expense spike with evidence and a recommended review, never unapproved transfers or lending decisions.
7. Design merchant-friendly explainable UI and tamper-evident history for edits.
8. Test missing expenses, corrections, refunds, negative cash, unposted settlements and rounding.

## Verification and definition of done
- Actual/source and projected fields clearly labeled.
- Money arithmetic uses Decimal/paise and matches ledger fixtures.
- Unknown inputs produce incomplete-data warning rather than precise confidence.
- Only permitted store roles can view sensitive cash information.

## Guardrails and anti-patterns
- Never offer regulated credit decisions, loans or individualized investment advice.
- No unconditional claims of cash runway without opening balance/obligations.
- Don't conflate ₹138 purchase-adjusted cash difference with gross profit ₹182.

## Example invocation
`/financial-operations Build store expenses and conservative cash runway scenarios.`

## Reporting contract
For each feature report **files changed, schema/API changes, commands actually executed, tests passed/failed, security/finance implications, remaining blockers and next incremental step**. Do not claim outcomes that were not measured. All changes must integrate with existing repository modules rather than generating a disconnected sample app.
