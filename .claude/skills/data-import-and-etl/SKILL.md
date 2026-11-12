---
name: data-import-and-etl
description: "Use when implementing CSV, POS exports, payment report import, schema mapping, cleaning and data quality pipelines."
---

# Data Import And Etl — LEAP AI skill

## When this skill applies
Ensure real merchant data enters LEAP safely, reversibly and with high-quality provenance.

## Read first
- `docs/04_DATA_MODEL_AND_EVENTS.md`; `docs/05_API_CONTRACTS_AND_INTEGRATIONS.md`; `docs/09_TESTING_AND_ACCEPTANCE.md`.

## Implementation procedure
1. Define supported import categories and canonical schemas for products, inventory, sales, expenses, payment and settlement rows.
2. Build upload wizard that shows type/source, column mapping, localized date/amount parsing and user preview before commit.
3. Parse with Polars/Python and safe size/row limits; validate currency, locale, duplicates, missing required fields and IDs.
4. Preserve raw file immutable with checksum and retention; normalized rows include import batch and source row reference.
5. Provide dry-run report: importable rows, rejected, warnings, duplicate candidates, total sums and required merchant action.
6. Confirm idempotent import batch with transaction/outbox; support safe rollback or reversal, not destructive rewrite.
7. Add unit conversions for packs/volume only when mapping supplied or merchant confirms; never guess SKU from payment amount.
8. Record parser/version/mapping metadata for audit and future reimports.
9. Test malformed encodings, Excel formula injection, rupee/commas, mixed dates, timezones, duplicate source rows, huge files and partial failure.

## Verification and definition of done
- Merchant explicitly sees and confirms all imported mappings.
- Reimport of same file doesn't duplicate canonical facts.
- Imported financial totals reconcile or visible exception state appears.
- Cross-tenant imports and source downloads denied.

## Guardrails and anti-patterns
- No import data silently altered to force totals to match.
- Don't send whole merchant financial CSV to LLM as a shortcut.
- Never treat synthetic fixtures as production statements.

## Example invocation
`/data-import-and-etl Create a robust CSV/POS import wizard and normalized data pipeline.`

## Reporting contract
For each feature report **files changed, schema/API changes, commands actually executed, tests passed/failed, security/finance implications, remaining blockers and next incremental step**. Do not claim outcomes that were not measured. All changes must integrate with existing repository modules rather than generating a disconnected sample app.
