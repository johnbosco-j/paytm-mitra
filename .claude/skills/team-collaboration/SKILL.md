---
name: team-collaboration
description: "Use when coordinating Johnbosco, Jeffrey and Joe, reviewing branches, delegating files or preparing technical handoff."
---

# Team Collaboration — LEAP AI skill

## When this skill applies
Keep the 3-person team shipping independently without conflicting schema edits or unreviewed major changes.

## Read first
- `docs/10_ROADMAP_AND_TEAM.md`; `docs/01_MASTER_IMPLEMENTATION_PLAN.md`; `docs/09_TESTING_AND_ACCEPTANCE.md`.

## Implementation procedure
1. Publish a short ownership map, API contract snapshot and branch responsibilities.
2. Prioritize dependency DAG; agree model/data changes before concurrent frontend/backend work.
3. Use small PRs with screens/tests, migration notes and changed-API notice; code review by someone other than author where possible.
4. Use code review checks for cross-tenant, Decimal finance, approval, provider credentials, AI evidence and localization.
5. Keep status updates honest: done/blocked/next and exact test output; don't assert unperformed tasks.
6. If working with multiple Claude Code agents, use separate git worktrees and a single integration owner for migrations.
7. Run integration and smoke tests after each merge; keep regressions higher priority than new UI flourishes.
8. Prepare presentation notes that match actual deployed state, not speculative feature checklist.

## Verification and definition of done
- No schema conflict or unreviewed entitlement change at merge.
- Clear one-person owner for each blocking issue.
- E2E gate always passes on shared integration branch.
- No fabricated implementation progress in hackathon pitch.

## Guardrails and anti-patterns
- Don't scatter the team into unrelated modules before core loop is complete.
- No blanket success message without actual evidence.
- Never share secret env files through commits or screenshots.

## Example invocation
`/team-collaboration Create a coordinated next-24-hour LEAP AI work breakdown.`

## Reporting contract
For each feature report **files changed, schema/API changes, commands actually executed, tests passed/failed, security/finance implications, remaining blockers and next incremental step**. Do not claim outcomes that were not measured. All changes must integrate with existing repository modules rather than generating a disconnected sample app.
