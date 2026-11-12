---
name: testing-and-quality
description: "Use when creating unit, integration, Playwright, accessibility, AI evals, security tests or release-quality checks."
---

# Testing And Quality — LEAP AI skill

## When this skill applies
Enforce that every released LEAP AI capability is real, finance-correct, tenant-safe and reliable in a browser.

## Read first
- `docs/09_TESTING_AND_ACCEPTANCE.md`; `docs/16_USER_JOURNEYS.md`; `docs/08_SECURITY_AND_COMPLIANCE.md`.

## Implementation procedure
1. Establish repository test commands, CI matrix and actual fixtures before new features expand.
2. Write pure Python unit tests for finance, units and ranking; property-based tests for arithmetic edge cases.
3. Write API integration tests with real test Postgres and migrations for 401/403/422/409, role checks and idempotency.
4. Write browser Playwright flow covering merchant onboarding → demand → approval → actual result, with fresh test records.
5. Capture 360/768/1440 screenshots and verify accessibility via axe + keyboard tests.
6. Add AI fixtures for noisy Tamil, Tanglish, missing units, malicious instructions and provider failure.
7. Add tenant isolation matrix, stock double-write and source import replay tests.
8. Run checks; report commands, exact failure/passing counts, artifacts and follow-up blockers.
9. Keep deterministic fixtures; synthetic data must never be mislabeled as real production merchant results.

## Verification and definition of done
- Core P0 browser E2E passes with real API, DB and user-created records.
- No known critical auth/finance/data loss defects.
- All failed tests are surfaced, not silently skipped.
- Accessibility and mobile tasks genuinely usable.

## Guardrails and anti-patterns
- Do not claim 'tests passed' if not executed.
- Never mock away all DB behavior in critical integration tests.
- Don't automatically update expected values to match incorrect implementation.

## Example invocation
`/testing-and-quality Create and execute tests for the complete merchant approval loop.`

## Reporting contract
For each feature report **files changed, schema/API changes, commands actually executed, tests passed/failed, security/finance implications, remaining blockers and next incremental step**. Do not claim outcomes that were not measured. All changes must integrate with existing repository modules rather than generating a disconnected sample app.
