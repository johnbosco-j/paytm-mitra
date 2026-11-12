---
name: unit-economics
description: "Use when computing merchant profit, stock-trial scenarios, contribution margin, purchase outlay, pricing and ROI."
---

# Unit Economics — LEAP AI skill

## When this skill applies
Protect LEAP from misleading rupee metrics by using precise accounting concepts, conservative inputs and independently tested math.

## Read first
- `docs/04_DATA_MODEL_AND_EVENTS.md`; `docs/09_TESTING_AND_ACCEPTANCE.md`; `docs/12_METRICS_AND_EXPERIMENTS.md`.

## Implementation procedure
1. Define finance glossary: price, cost per unit, purchase outlay, revenue, COGS, gross profit, contribution, cash difference, inventory value, waste/write-off.
2. Use Python Decimal or integer paise with documented rounding; normalize item units before multiplication.
3. Build pure functions for trial scenarios under sales conversions 0..quantity, expected waste, supplier delivery and fee assumptions.
4. Apply explicit sourcing: catalog input, supplier quote, invoice, manual override, date/version of cost price.
5. If cost/price/expiry missing, return `insufficient_data`, not zero defaults or fabricated profitability.
6. Provide formulas/explanations in typed API; keep `estimated`, `observed` and `merchant_reported` separate.
7. Preserve snapshot of assumptions on trial approval and use observed stock/sales/returns for actual result.
8. Verify golden case 16 units @₹22, 14 sales @₹35: outlay ₹352, sales ₹490, COGS ₹308, gross profit ₹182, cash difference ₹138, usable leftover ₹44.
9. Build property-based edge tests: zero qty, refunds, spoilage, negative input rejected, price revisions and currency/precision.

## Verification and definition of done
- All golden calculations independently match expected values.
- Cash outlay and accounting gross profit are displayed under different names.
- Trial approval cannot proceed with changed unit cost without reapproval.
- No LLM-calculated amount is posted as authoritative ledger state.

## Guardrails and anti-patterns
- Never equate demand request count to sales conversion.
- Never call purchase-minus-revenue difference net profit.
- Don't use binary float for financial calculations.

## Example invocation
`/unit-economics Implement the financial calculation library and strict golden cases.`

## Reporting contract
For each feature report **files changed, schema/API changes, commands actually executed, tests passed/failed, security/finance implications, remaining blockers and next incremental step**. Do not claim outcomes that were not measured. All changes must integrate with existing repository modules rather than generating a disconnected sample app.
