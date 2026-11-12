---
name: merchant-onboarding
description: "Use when implementing the first real merchant journey: signup, stores, roles, locale, catalog and business settings."
---

# Merchant Onboarding — LEAP AI skill

## When this skill applies
Make a real shopkeeper able to begin without fake data, while keeping setup brief and subsequent features usable.

## Read first
- `docs/02_PRODUCT_REQUIREMENTS.md`; `docs/16_USER_JOURNEYS.md`; `docs/05_API_CONTRACTS_AND_INTEGRATIONS.md`.

## Implementation procedure
1. Design welcome -> sign-in -> store name/timezone/currency -> choose Tamil/English -> add first catalog product -> dashboard.
2. Implement real Supabase Auth session and FastAPI verification; handle duplicate and expired invitation states.
3. Create store+owner membership atomically; allow roles owner/manager/staff/read_only with described restrictions.
4. Product create includes explicit units, cost and selling price; incomplete values retained with appropriate warnings but no calculated profit.
5. Show first-task checklist: add catalog, log missed demand, review opportunity.
6. Offer CSV import only through dry-run preview/confirmation; no silent fake setup entries.
7. Provide ability to edit/correct store and product, revoke staff, sign out and come back to data.
8. Create end-to-end tests for first-time and returning merchant, mobile and locale fallback.

## Verification and definition of done
- Real store records persist after reload and new session.
- Two stores cannot read each other's catalog.
- Required forms have accessible states and actionable errors.
- No automatic insertion of unlabeled synthetic merchant data.

## Guardrails and anti-patterns
- Avoid a lengthy KYC-like onboarding for non-payment analytics features.
- Never imply account setup gives automatic Paytm API authorization.
- No forced microphone permission in onboarding.

## Example invocation
`/merchant-onboarding Build actual merchant onboarding and first product creation.`

## Reporting contract
For each feature report **files changed, schema/API changes, commands actually executed, tests passed/failed, security/finance implications, remaining blockers and next incremental step**. Do not claim outcomes that were not measured. All changes must integrate with existing repository modules rather than generating a disconnected sample app.
