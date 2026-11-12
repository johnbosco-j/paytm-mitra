---
name: merchant-analytics-and-metrics
description: "Use when building merchant dashboards, reporting queries, ROI metrics, attribution or evaluating growth outcomes."
---

# Merchant Analytics And Metrics — LEAP AI skill

## When this skill applies
Make the dashboard truthfully measurable, directly linked to source rows and useful for the next merchant decision.

## Read first
- `docs/12_METRICS_AND_EXPERIMENTS.md`; `docs/04_DATA_MODEL_AND_EVENTS.md`; `docs/07_DESIGN_SYSTEM_AND_UX.md`.

## Implementation procedure
1. Define each KPI with numerator, denominator, time window, source, assumptions, zero data behavior and currency.
2. Build tenant-scoped SQL/materialized views for demand counts, confirmed rate, stockouts, trials, approvals, inventory and cash.
3. Distinguish observed/reported/model-inferred/projected with visible labels; include last updated and import coverage.
4. Add frontend ECharts/Recharts with accessible table alternative and Tamil formatted descriptions.
5. Separate gross profit from purchase-adjusted cash and contribution after known extra fees; no ROI without real denominator.
6. Track pilot outcomes via event schema with privacy-minimized analytics and evidence-trace export.
7. Add filters for store, SKU, timeframe, language; prevent aggregate leak across stores.
8. Backtest predictions and show error when enough outcomes exist; never present a hypothetical sample as actual uplift.
9. Test edge cases missing costs, cancellations, returns, duplicate imports, zero sales and timezone boundaries.

## Verification and definition of done
- Every metric can be independently reproduced from source/test records.
- Empty or incomplete dataset results in guidance, not fictitious numbers.
- No store sees another store's dashboard or derived data.
- Actual results have explicit sample size and evaluation period.

## Guardrails and anti-patterns
- Do not optimize the UX to hide negative results.
- Don't label trial cash difference as profit.
- No fabricated merchant traction, subscriber conversion or confidence percentages.

## Example invocation
`/merchant-analytics-and-metrics Implement merchant outcome dashboard using real canonical data.`

## Reporting contract
For each feature report **files changed, schema/API changes, commands actually executed, tests passed/failed, security/finance implications, remaining blockers and next incremental step**. Do not claim outcomes that were not measured. All changes must integrate with existing repository modules rather than generating a disconnected sample app.
