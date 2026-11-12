---
name: sprint-orchestration
description: "Use when coordinating the three-person hackathon sprint, planning milestones, or sequencing tasks across Claude Code sessions."
---

# Sprint Orchestration — LEAP AI skill

## When this skill applies
Apply when features depend on each other, schedules are compressed, or multiple branches/agents will edit the repository.

## Read first
- `docs/01_MASTER_IMPLEMENTATION_PLAN.md`; `docs/10_ROADMAP_AND_TEAM.md`; `docs/13_CLAUDE_PROMPTS.md`.

## Implementation procedure
1. Inspect git status, tests, migration history and implemented pages rather than assuming an empty repo.
2. Create dependency-order milestones: M0 foundation → M1 catalog → M2 requests → M3 economics → M4 approval/outcome → M5 polish.
3. Split work by boundary: Johnbosco API/AI, Jeffrey web/UX, Joe schema/test/data, and list required cross-review.
4. Freeze schema+OpenAPI contracts before assigning independent worktrees; avoid multiple simultaneous migration editors.
5. Track `todo/in_progress/review/verified/blocked` with exact test evidence and blockers.
6. Define 2–4 hour integration checkpoints for a hackathon timeline; defer P2/P3 if M4 incomplete.
7. Produce a prioritized handoff statement with next single highest-leverage task and changed files.

## Verification and definition of done
- No more critical branches than the team can continuously integrate.
- Every milestone has measurable acceptance proof and a rollback path.
- Red P0 defects block feature expansion.
- End-of-day working deployed E2E route is tested.

## Guardrails and anti-patterns
- No claimed background work, unverified checkmarks or fabricated team contributions.
- No merge without migration, auth and financial tests on affected modules.

## Example invocation
`/sprint-orchestration Coordinate our remaining LEAP AI tasks through November 15.`

## Reporting contract
For each feature report **files changed, schema/API changes, commands actually executed, tests passed/failed, security/finance implications, remaining blockers and next incremental step**. Do not claim outcomes that were not measured. All changes must integrate with existing repository modules rather than generating a disconnected sample app.
