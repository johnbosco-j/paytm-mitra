---
name: provider-integrations
description: "Use when integrating Paytm, Sarvam, Claude API, email, POS or supplier systems and managing credentials/webhooks."
---

# Provider Integrations — LEAP AI skill

## When this skill applies
Build swappable typed adapters with permission checks, rate limits, signature validation and transparent provider failures.

## Read first
- `docs/05_API_CONTRACTS_AND_INTEGRATIONS.md`; `docs/08_SECURITY_AND_COMPLIANCE.md`; `docs/14_SOURCE_REGISTER.md`.

## Implementation procedure
1. Confirm provider official docs, API version, authorized credentials and supported merchant capabilities; record decision and access scope.
2. Define internal typed adapter interface rather than leaking provider JSON into business domains.
3. Implement `test_connection`, normalized request/response, timeouts, retries with exponential backoff, rate limit and breaker.
4. For webhooks, verify signatures with documented algorithm, timestamps/replay, allowlisted event types and idempotency.
5. Store keys only in secret manager/server env, with rotation and restricted per-environment access.
6. Separate live vs sandbox/test; alert on unauthorized attempts and schema drift.
7. Document graceful fallback where provider not configured; feature flag unavailable capabilities rather than displaying fake success.
8. Unit test adapter against recorded redacted fixtures; integration test official sandbox when permission exists.
9. Expose status/last sync and user-visible disconnect/revoke controls when appropriate.

## Verification and definition of done
- No dependency requires invented credentials.
- Provider failure never mutates canonical financial records incorrectly.
- Current official SDK/docs referenced and version pinned.
- Paytm data is accessed only under valid merchant authorization.

## Guardrails and anti-patterns
- Don't scrape private apps or use undocumented endpoints.
- Never hardcode provider secrets or disable webhook verification.
- Do not claim Paytm partnership or arbitrary merchant data access.

## Example invocation
`/provider-integrations Create the provider adapter layer with feature-flagged Paytm access.`

## Reporting contract
For each feature report **files changed, schema/API changes, commands actually executed, tests passed/failed, security/finance implications, remaining blockers and next incremental step**. Do not claim outcomes that were not measured. All changes must integrate with existing repository modules rather than generating a disconnected sample app.
