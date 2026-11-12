---
name: neighborhood-privacy
description: "Use when proposing cross-merchant demand signals or building privacy-preserving aggregated local inventory insights."
---

# Neighborhood Privacy — LEAP AI skill

## When this skill applies
Allow optional anonymous aggregate neighborhood signals without revealing individual merchant or customer data.

## Read first
- `docs/08_SECURITY_AND_COMPLIANCE.md`; `docs/04_DATA_MODEL_AND_EVENTS.md`; `docs/15_RISK_AND_DECISIONS.md`.

## Implementation procedure
1. Obtain opt-in purpose-scoped consent from each contributing merchant; default off and permit revocation.
2. Aggregate only verified high-level product category, coarse area bucket and multi-day/week interval, never individual customers, exact price or transaction rows.
3. Set minimum distinct-store contributor threshold, minimum total counts, and query coarsening to avoid singling out one shop.
4. Evaluate differential privacy/noise and query-budget defenses if publishing repeated aggregates; document limitation and potential disclosure risks.
5. Recompute aggregates after consent revocation according to the defined retention/deletion process.
6. Keep per-store data in tenant-safe DB; aggregation worker uses narrow scoped privileges with audit.
7. Display aggregate coverage/sample size and caveats; suppress sparse cells entirely.
8. Test repeated differencing queries, small cells, revoked store, sparse location and malicious store IDs.

## Verification and definition of done
- No individual store can be reverse-engineered from published neighborhood result under tested constraints.
- Consent is auditable and revocable.
- No external/public dataset published absent reviewed security design.
- Aggregates are labeled noisy/partial if techniques introduce error.

## Guardrails and anti-patterns
- Never publish precise competitor prices or sales.
- Avoid claiming formal differential privacy if not implemented/tested.
- No opt-out loophole via cached aggregate results.

## Example invocation
`/neighborhood-privacy Design opt-in local demand pooling with explicit release safeguards.`

## Reporting contract
For each feature report **files changed, schema/API changes, commands actually executed, tests passed/failed, security/finance implications, remaining blockers and next incremental step**. Do not claim outcomes that were not measured. All changes must integrate with existing repository modules rather than generating a disconnected sample app.
