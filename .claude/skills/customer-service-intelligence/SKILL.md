---
name: customer-service-intelligence
description: "Use when implementing merchant-side customer service notes, complaint triage, recurring questions and resolution workflow."
---

# Customer Service Intelligence — LEAP AI skill

## When this skill applies
Build privacy-minimizing service intelligence that helps stores address issues without tracking or profiling identifiable customers unnecessarily.

## Read first
- `docs/02_PRODUCT_REQUIREMENTS.md`; `docs/08_SECURITY_AND_COMPLIANCE.md`; `docs/16_USER_JOURNEYS.md`.

## Implementation procedure
1. Define anonymous feedback tickets by default: category, product, timestamp, problem type, priority, proposed resolution.
2. Permit voluntary identifiable contact only when needed and with appropriate consent; store separately and encrypted.
3. Extract sentiment/themes from merchant-entered notes as a suggested categorization, always reviewable.
4. Connect recurring availability complaints to demand ledger without double counting customer requests.
5. Provide staff queue statuses: new, reviewing, awaiting merchant, resolved; escalation only to authorized owner.
6. Draft response text in Tamil/English with factual terms; explicit merchant review before sending.
7. Track time-to-resolution, repeat issue frequency and refund expense where logged; show missing evidence.
8. Test hostile/untrusted customer text, PII avoidance, staff visibility, opt-out and reopening closed tickets.

## Verification and definition of done
- Every ticket has real record, owner, state and time trail.
- Messaging respects approval and contact consent.
- Demand counts cannot duplicate complaint/request accidentally.
- No identifiable data appears in generalized AI outputs.

## Guardrails and anti-patterns
- Don't fabricate customer history from transactions.
- No automated refunds or customer exposure to other store info.
- Don't claim classifier has proven accuracy without evaluation.

## Example invocation
`/customer-service-intelligence Add actionable and privacy-safe customer feedback queues.`

## Reporting contract
For each feature report **files changed, schema/API changes, commands actually executed, tests passed/failed, security/finance implications, remaining blockers and next incremental step**. Do not claim outcomes that were not measured. All changes must integrate with existing repository modules rather than generating a disconnected sample app.
