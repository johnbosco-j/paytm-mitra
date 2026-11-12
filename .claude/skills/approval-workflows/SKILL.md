---
name: approval-workflows
description: "Use when implementing merchant approval, rejection, edits, audit, trial state machines and reversible external actions."
---

# Approval Workflows — LEAP AI skill

## When this skill applies
Build the critical trust boundary between AI recommendations and real-world merchant operations.

## Read first
- `docs/04_DATA_MODEL_AND_EVENTS.md`; `docs/05_API_CONTRACTS_AND_INTEGRATIONS.md`; `docs/08_SECURITY_AND_COMPLIANCE.md`.

## Implementation procedure
1. Define state machine and permissible transitions for proposals, approvals and trials; prohibit implicit actions on read.
2. Capture proposer, approver, role, timestamp, original/approved quantities, cost snapshot, supplier/contact target and justification.
3. Owner/manager sees itemized approval modal with cash amount, uncertainty and side-effect destination.
4. Server rechecks active role, consent, current prices and idempotency on every transition and execution.
5. Use DB transaction/outbox for state changes and unique event id; retries never duplicate stock/invoice/send.
6. Require a distinct send/purchase confirmation before any external action; approval for a draft is not blanket authorization.
7. Support edit, reject, cancel, expiration, stale proposal, supplier change and audit navigation.
8. Connect approved trial with actual purchase, sales, returns and result event, not only UI status.
9. Test unauthorized staff, expired approvals, replay, changed amounts and worker crash/recovery.

## Verification and definition of done
- All approval transitions auditable and visible to authorized owner.
- No supplier message or campaign without explicit permission.
- Double-click/duplicate POST creates exactly one effect.
- Users can distinguish approved draft vs actually executed external action.

## Guardrails and anti-patterns
- Don't accept model output as a signature or approval.
- Don't use local client state as approval source-of-truth.
- Avoid hidden irreversible effects on optimistic UI update.

## Example invocation
`/approval-workflows Implement durable approval and trial outcome state machines.`

## Reporting contract
For each feature report **files changed, schema/API changes, commands actually executed, tests passed/failed, security/finance implications, remaining blockers and next incremental step**. Do not claim outcomes that were not measured. All changes must integrate with existing repository modules rather than generating a disconnected sample app.
