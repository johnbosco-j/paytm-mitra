---
name: merchant-demand-intelligence
description: "Use when capturing, normalizing, clustering or ranking customer requests that did not result in a sale."
---

# Merchant Demand Intelligence — LEAP AI skill

## When this skill applies
Implement LEAP AI’s strongest differentiator: a permissioned, auditable unmet-demand dataset that is not inferred from payment data alone.

## Read first
- `docs/02_PRODUCT_REQUIREMENTS.md`; `docs/04_DATA_MODEL_AND_EVENTS.md`; `docs/06_AI_AGENTS_AND_EVALUATION.md`.

## Implementation procedure
1. Specify missed-request state transitions `draft -> extracted -> needs_review -> confirmed -> corrected/voided`.
2. Store original merchant statement, time, language, count, unit, reason, source and provenance; no customer identity required.
3. Build input adapters for manual text, audio extraction and optionally optical extraction; all converge on typed `request_item` format.
4. Propose alias matching and product links using deterministic text first; ambiguous alternatives require merchant review.
5. Implement duplicate hints based on actor/day/item/source but preserve genuine separate requests.
6. Aggregate only confirmed merchant assertions into recency, frequency, repeated days and stock-gap features.
7. Rank opportunities conservatively; scores must be explainable and versioned, sparse data triggers abstention.
8. Expose evidence links, correction workflow and no-data prompts in Demand Radar.
9. Instrument correction rate and confirm-to-action conversion without sensitive raw text in telemetry.

## Verification and definition of done
- Confirmed request survives reload and appears in actual opportunity scoring.
- A request count is never treated as guaranteed unit sales.
- Product ambiguity displays review UI; invalid quantity never persisted as authoritative.
- Cross-tenant request leakage and malicious text tests pass.

## Guardrails and anti-patterns
- Do not infer lost customer purchases from UPI payments alone.
- Avoid fabricated sentiment scores or unsupported exact demand forecasts.
- Never silently overwrite raw transcript/source text.

## Example invocation
`/merchant-demand-intelligence Implement durable, explainable and merchant-confirmed missed-demand intelligence.`

## Reporting contract
For each feature report **files changed, schema/API changes, commands actually executed, tests passed/failed, security/finance implications, remaining blockers and next incremental step**. Do not claim outcomes that were not measured. All changes must integrate with existing repository modules rather than generating a disconnected sample app.
