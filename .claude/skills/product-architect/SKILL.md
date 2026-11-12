---
name: product-architect
description: "Use when planning LEAP AI features, choosing architecture, splitting scope, or reconciling the pitch with a real product."
---

# Product Architect — LEAP AI skill

## When this skill applies
Use for the initial build or decisions with cross-domain consequences. Make the merchant workflow, not a framework checklist, the center of every decision.

## Read first
- `CLAUDE.md`; `docs/01_MASTER_IMPLEMENTATION_PLAN.md`; `docs/02_PRODUCT_REQUIREMENTS.md`; `docs/03_SYSTEM_ARCHITECTURE.md`; `docs/15_RISK_AND_DECISIONS.md`.

## Implementation procedure
1. Translate a request into the merchant job, event trigger, inputs, outputs, measurable outcome and failure state.
2. Select P0/P1/P2/P3 using merchant urgency, dependencies, security, code complexity and time-to-value; draw DAG.
3. Name the owning Python domain (identity, demand, inventory, decisions, workflows, finance, campaign, integrations).
4. Specify what is source truth, what is imported, what is AI-proposed and what requires merchant confirmation.
5. Sketch event/API/data contracts, role boundaries, optional provider approvals, and model cost/risk.
6. Write a narrow vertical slice and a minimal ADR; assess alternative approaches, their costs, maintenance and rollback.
7. Assign responsibilities to Johnbosco/Jeffrey/Joe and define verifiable acceptance gates.
8. Reconcile labels in any external presentation: proposed, working, gated, or measured.

## Verification and definition of done
- Demonstrate the entire user journey in a sequence diagram or typed task graph.
- All external actions carry an approval requirement; data boundaries and tenant access are explicit.
- No contradictory claim relative to real repo state or existing Paytm merchant AI.
- Feature can be verified with one real user story and automated tests.

## Guardrails and anti-patterns
- Don't turn LEAP into 40 visually disconnected screens.
- Don't choose Kafka/Kubernetes/Unity/crypto because they sound sophisticated.
- Never invent API access, traction or business outcomes.

## Example invocation
`/product-architect Plan the next merchant feature as an end-to-end verified slice.`

## Reporting contract
For each feature report **files changed, schema/API changes, commands actually executed, tests passed/failed, security/finance implications, remaining blockers and next incremental step**. Do not claim outcomes that were not measured. All changes must integrate with existing repository modules rather than generating a disconnected sample app.
