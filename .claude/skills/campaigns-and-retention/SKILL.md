---
name: campaigns-and-retention
description: "Use when building margin-safe promotions, campaign content, loyalty and consented customer re-engagement."
---

# Campaigns And Retention — LEAP AI skill

## When this skill applies
Turn observed merchant needs into sustainable, approved growth actions rather than unsanctioned messaging.

## Read first
- `docs/02_PRODUCT_REQUIREMENTS.md`; `docs/08_SECURITY_AND_COMPLIANCE.md`; `docs/12_METRICS_AND_EXPERIMENTS.md`.

## Implementation procedure
1. Require a concrete merchant goal, item cost, selling price, promotion type, timeframe, budget and audience.
2. Use deterministic price-floor/margin-floor calculations before LLM text generation; reject loss-making offers unless policy permits explicit override.
3. Draft Tamil/English messages with truthful terms; never imply fabricated discounts or guaranteed success.
4. Store recipient contact only with a documented lawful basis and opt-in where required; record purpose, consent timestamp, revoke and expiry.
5. Validate provider approved channel (Resend/email or allowed SMS/WhatsApp) and recipient opt-out before every send.
6. Merchant sees exact copy, count of recipients and estimated communication cost; requires approval then explicit send.
7. Record delivery status, opens only where lawful/technically available, redemption and true attributable incremental margin caveats.
8. Provide cancellation, history, unsubscribe and audit; test no-contact/invalid-consent cases.

## Verification and definition of done
- Campaign cannot send to opted-out contacts or without approval.
- Pricing math uses verified costs and discount amounts, no LLM float output.
- Every published claim and offer has verifiable merchant input.
- Results distinguish actual redemptions from attributed/estimated uplift.

## Guardrails and anti-patterns
- Never scrape Paytm transaction identifiers to infer personal phone numbers.
- Do not offer unsolicited bulk campaigns or hidden automated sending.
- Avoid misleading urgency, false scarcity or fictional ROI.

## Example invocation
`/campaigns-and-retention Create a margin-safe Tamil campaign workflow with merchant approval.`

## Reporting contract
For each feature report **files changed, schema/API changes, commands actually executed, tests passed/failed, security/finance implications, remaining blockers and next incremental step**. Do not claim outcomes that were not measured. All changes must integrate with existing repository modules rather than generating a disconnected sample app.
