---
name: release-audit
description: "Use before submission, deployment, pilot onboarding or claiming any LEAP AI capability works."
---

# Release Audit — LEAP AI skill

## When this skill applies
Perform a hard go/no-go review linking slide claims to functioning tested production or staging behavior.

## Read first
- `docs/09_TESTING_AND_ACCEPTANCE.md`; `docs/17_10_SLIDE_PITCH_ALIGNMENT.md`; `docs/11_RELEASE_RUNBOOK.md`.

## Implementation procedure
1. Build implementation inventory from actual code, navigation, routes, migrations, jobs and feature flags.
2. For every pitch feature label `working`, `permission-gated`, `partially implemented`, `planned` or `unverified`.
3. Run clean install and clean database migration in a safe test environment; record commands and outcome.
4. Run core Playwright flow from signup to trial result; verify Tamil input, cross-tenant denial, financial goldens and approval audit.
5. Review missing provider keys, quota, legal permissions and fallback states for Paytm/Sarvam/LLM/supplier.
6. Test staging domain/HTTPS, mobile, offline fallback, error boundaries, data recovery and backup.
7. Check visual pitch story against actual output, distinguish sample/real data and review public statistics sources.
8. Produce signed-off risk report and exact P0 blockers; don't rubber-stamp incomplete work.

## Verification and definition of done
- Go decision grounded in passing executable tests and human walkthrough.
- No live feature promised unless verified in current deployed revision.
- All missing permissions transparently disclosed.
- Release can be rolled back or optional modules disabled.

## Guardrails and anti-patterns
- Never fudge a test report or claim automatic Paytm integration.
- Don't deploy high-risk financial features with missing controls.
- Do not include production customer PII in hackathon recordings.

## Example invocation
`/release-audit Audit the entire LEAP AI product before the Chennai event.`

## Reporting contract
For each feature report **files changed, schema/API changes, commands actually executed, tests passed/failed, security/finance implications, remaining blockers and next incremental step**. Do not claim outcomes that were not measured. All changes must integrate with existing repository modules rather than generating a disconnected sample app.
