---
name: supplier-procurement
description: "Use when implementing store suppliers, quote comparison, purchase order drafts, fulfillment tracking and procurement decisions."
---

# Supplier Procurement — LEAP AI skill

## When this skill applies
Enable merchants to source profitable stock through approved, evidence-backed workflows without autonomously purchasing.

## Read first
- `docs/02_PRODUCT_REQUIREMENTS.md`; `docs/04_DATA_MODEL_AND_EVENTS.md`; `docs/08_SECURITY_AND_COMPLIANCE.md`.

## Implementation procedure
1. Define supplier entity (store-scoped), product catalog match, MOQs, lead time, shipping, tax and quote validity.
2. Create quote submission/import model with source references and history; do not treat LLM-extracted amounts as verified without review.
3. Build deterministic landed-cost comparison: unit price × quantity + shipping + tax/fees + inventory carrying risk; normalize pack sizes.
4. Rank suppliers by total landed cost, delivery confidence and constraints, exposing caveats and choice rationale.
5. Draft reorder with supplier, quantity, budget, quoted price, expiry date and risk; compute outlay via Decimal.
6. Enforce owner approval and independent external-send confirmation with explicit destination and idempotency.
7. Add status trail: draft, approved, sent, acknowledged, received, cancelled, disputed.
8. On receiving goods, link to stock movement and inventory lots; reconcile short shipment/returns.
9. Test changing quote between proposal/approval, supplier scope and stale minimum quantity.

## Verification and definition of done
- Merchant can compare two real stored quotes and approve a draft.
- No network send or monetary commitment before explicit approval.
- Receiving goods correctly updates inventory only once.
- Different stores never see each other's supplier terms.

## Guardrails and anti-patterns
- Do not scrape supplier pricing or fabricate quotes.
- No automatic bank transfer or purchase checkout via an LLM.
- Don't compare pack sizes without unit conversion.

## Example invocation
`/supplier-procurement Build supplier comparison and merchant-approved purchase drafts.`

## Reporting contract
For each feature report **files changed, schema/API changes, commands actually executed, tests passed/failed, security/finance implications, remaining blockers and next incremental step**. Do not claim outcomes that were not measured. All changes must integrate with existing repository modules rather than generating a disconnected sample app.
