# 12 — Merchant value measurement, attribution and learning loop

## North star

**Observed incremental gross profit** from merchant-approved trials, interpreted carefully: difference between correctly attributed revenue and its direct cost of goods sold, fees, waste and additional trial costs; monitor working capital/cash outlay separately. Controlled comparison or honest before/after caveats required to claim causal impact.

## Funnel instrumentation

1. Merchant onboarded; consent accepted; catalog with known costs populated.
2. First missed request logged; voice extraction completed; merchant confirmed.
3. Repeat demand signal scored; evidence inspected; opportunity opened.
4. Trial scenario calculated; trial approved/rejected; requested inventory action recorded.
5. Purchases/sales/waste events recorded; trial completed; actual profitability reviewed.
6. Merchant repeats use voluntarily; retention measured without sensitive event payloads.

## Metric dictionary

| Metric | Numerator / denominator / caveat |
|---|---|
| Request confirmation rate | confirmed requests / submitted drafts; per-language |
| Time to capture | from tap to saved confirmation; track device/network |
| Unmet demand frequency | merchant-confirmed requests by product/time; not guaranteed sales |
| Opportunity adoption | approved proposals / reviewed proposals; label risk and costs |
| Time to action | approval date - initial repeated request date |
| Stockout days | days with demand and zero usable stock; imperfect if manual stock missing |
| Trial sell-through | sold trial quantity / received trial quantity over window |
| Trial gross margin | trial sales revenue - COGS - attributable discounts/fees if known |
| Working capital outlay | actual purchases/cash paid for trial inventory |
| Expiry loss | cost of expired/written-off units, recognized once |
| Repeat use | percentage of opted-in stores with meaningful weekly action |
| AI correction rate | edited extractions / total AI proposals |
| Approval rejection rate | rejected proposals / proposals requiring approval |
| Reliability | request/job success, errors, p95 latency, queue age |
| AI unit cost | model+speech spend per confirmed useful request, not per token alone |

## Instrumentation rules

Events contain pseudonymous store ID, feature, action result, language, timestamp, schema version, provider class and anonymized volume bucket. Never track raw customer messages, voice text, phone, account numbers or store financial details in general analytics.

## Experiment designs

- **Stage A (internal):** 10–20 cases from team-controlled test shop; not public merchant ROI evidence.
- **Stage B (merchant usability):** consented 3–5 merchant interviews, task completion, voice/error logs, observed confusion and survey feedback. Interviews are not causal profit evidence.
- **Stage C (pilot proposal):** ~30 consenting shops over ~30 days, pre-register metrics and confounders, compare with baseline; could use stepped-wedge or matched controls depending on feasibility. Count missing data and noncompliance.
- **Stage D (causal evaluation):** where feasible randomize access to recommended workflow at store/product/time level, or use careful observational adjustment; report uncertainty and selection bias.

These are plans; do not claim they occurred.

## Confidence and trust

- Label `Observed`, `Merchant-reported`, `Model-extracted awaiting confirmation`, `Estimated`, `Illustrative` visibly.
- Uncertainty interval when applicable, but no precise confidence % without calibrated model.
- Allow user to view raw source, correction history, calculation and comparison data.
- Do not use outcome metrics to imply revenue recovery when the same item would have sold anyway without trial.
