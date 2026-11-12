---
name: ai-orchestration
description: "Use when creating LangGraph merchant agents, bounded tool use, human approval interrupts and action workflow checkpoints."
---

# Ai Orchestration — LEAP AI skill

## When this skill applies
Implement AI teammates as constrained workflows that propose and explain actions but never autonomously change merchant finances.

## Read first
- `docs/06_AI_AGENTS_AND_EVALUATION.md`; `docs/08_SECURITY_AND_COMPLIANCE.md`; LangGraph interrupts official docs.

## Implementation procedure
1. Choose one bounded workflow such as read-only insights, replenishment draft, campaign draft or reconciliation explanation.
2. Model state graph and define each node's deterministic input/output, error handling, tool allowlist and max steps.
3. Read tools must enforce store membership and return minimal fields with source IDs; mutations only via deterministic domain services.
4. Use durable LangGraph checkpointing with stable thread ID; pause at `interrupt` before any risky external action.
5. On resume, verify same authenticated merchant, current role, consent and versions of price/supplier/quantity.
6. Produce merchant-visible explanation and diff of proposed vs approved state; if anything changed, require reapproval.
7. Add rate/cost/time budget, backoff, provider failover and trace logging with redaction.
8. Test crash/restart, replay, denied approval, expired consent and prompt-injected document scenarios.

## Verification and definition of done
- Human can approve/edit/reject; all choices persisted to audit.
- Unapproved external writes are impossible at API and graph layers.
- Agent returns grounded evidence and financial output from deterministic functions.
- Restarted workflow cannot double-send or double-book.

## Guardrails and anti-patterns
- No unrestricted SQL, arbitrary HTTP, shell execution or secret access exposed as model tools.
- Never take raw untrusted text as authorization.
- Don't overuse agents where a normal Python function suffices.

## Example invocation
`/ai-orchestration Build the bounded replenishment agent with merchant approval interrupt.`

## Reporting contract
For each feature report **files changed, schema/API changes, commands actually executed, tests passed/failed, security/finance implications, remaining blockers and next incremental step**. Do not claim outcomes that were not measured. All changes must integrate with existing repository modules rather than generating a disconnected sample app.
