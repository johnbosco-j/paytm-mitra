---
name: forecasting-and-ml
description: "Use when implementing data baselines, forecasts, opportunity rankings, backtesting and measured model quality."
---

# Forecasting And Ml — LEAP AI skill

## When this skill applies
Make honest risk-calibrated predictions from sparse merchant data; avoid magic AI percentages and baseless sales promises.

## Read first
- `docs/06_AI_AGENTS_AND_EVALUATION.md`; `docs/12_METRICS_AND_EXPERIMENTS.md`; `docs/02_PRODUCT_REQUIREMENTS.md`.

## Implementation procedure
1. Define business target and label: observed sales, stockouts, reported unserved demand, trial sell-through; avoid leakage.
2. Construct tenant-scoped training windows with clean timestamps, holidays, data missingness and POS source availability.
3. Establish naive/seasonal naive/moving average as benchmark; implement Polars feature building and split by time.
4. Add ML only if it beats baseline consistently on held-out periods and enough data; otherwise abstain.
5. Explain feature influence and confidence interval limitations; never use uncalibrated probability as factual certainty.
6. Distinguish seasonality from recurring stockouts that censor observed sales.
7. Generate scenario ranges for purchase trial and run uncertainty/sensitivity analysis.
8. Version model, dataset schema, training window and evaluation output; monitor drift across different merchant categories.
9. Include fallbacks and recalibration with observed post-action outcomes.

## Verification and definition of done
- Backtest report contains baseline, errors, sample size, date splits and per-store breakdown.
- Sparse data cannot produce unjustified precise forecasts.
- All forecasts are labeled projected and traceable to source period.
- Financial decision rules do not call LLM to fill missing numbers.

## Guardrails and anti-patterns
- Don't train across stores without explicit permitted scope and privacy review.
- Never present fitted training accuracy as deployed accuracy.
- No random split when time ordering matters.

## Example invocation
`/forecasting-and-ml Build demand forecast baselines and trial risk scenarios.`

## Reporting contract
For each feature report **files changed, schema/API changes, commands actually executed, tests passed/failed, security/finance implications, remaining blockers and next incremental step**. Do not claim outcomes that were not measured. All changes must integrate with existing repository modules rather than generating a disconnected sample app.
