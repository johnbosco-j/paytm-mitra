---
name: inventory-and-expiry
description: "Use when implementing products, stock movement ledger, lot expiry, stockout alerts and corrective inventory operations."
---

# Inventory And Expiry — LEAP AI skill

## When this skill applies
Give merchants reliable true stock state with batch/lot provenance, adjustments and waste-aware action decisions.

## Read first
- `docs/04_DATA_MODEL_AND_EVENTS.md`; `docs/02_PRODUCT_REQUIREMENTS.md`; `docs/09_TESTING_AND_ACCEPTANCE.md`.

## Implementation procedure
1. Define product units and allowed conversions; validate buying/selling price and supplier identity.
2. Model stock movements append-only: receipt, sale, adjustment, return, loss, expiry, transfer; derive on-hand from ledger.
3. Store lots and expiry dates where relevant; distinguish sellable, reserved and expired stock.
4. Introduce FEFO-aware suggestions for expiring goods; never suggest unsafe sale of expired items.
5. Implement stockout warning from repeated demand and on-hand inventory, with last sync/source timestamp.
6. Use transaction locks and idempotency to prevent double count or negative inventory without explicit documented override.
7. Provide merchant correction form with reason and audit, not direct balance replacement.
8. Build inventory pages with product creation, adjustment, lots, movement history, filters and mobile scan entry.
9. Test sales/returns/spoilage, unit conversion, concurrent adjustments and cross-tenant access.

## Verification and definition of done
- Derived stock agrees with ledger every time; migrations don't mutate old movement history.
- Expiry write-offs affect stock asset and accounting once.
- Duplicate mutation cannot double decrement.
- Merchant can trace stock to receipt/sale/adjustment source.

## Guardrails and anti-patterns
- Never treat QR transaction amount as exact SKU inventory movement without POS line item data.
- No direct overwrites of quantity totals.
- No expired food promotion contrary to safety.

## Example invocation
`/inventory-and-expiry Build ledger-based inventory and per-batch expiry radar.`

## Reporting contract
For each feature report **files changed, schema/API changes, commands actually executed, tests passed/failed, security/finance implications, remaining blockers and next incremental step**. Do not claim outcomes that were not measured. All changes must integrate with existing repository modules rather than generating a disconnected sample app.
