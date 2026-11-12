---
name: admin-governance
description: "Use when implementing store role management, audit reporting, privacy requests, feature entitlements and support controls."
---

# Admin Governance — LEAP AI skill

## When this skill applies
Build accountability for store owners without providing staff or platform operators inappropriate access to sensitive data.

## Read first
- `docs/08_SECURITY_AND_COMPLIANCE.md`; `docs/04_DATA_MODEL_AND_EVENTS.md`; `docs/11_RELEASE_RUNBOOK.md`.

## Implementation procedure
1. Expose store owner controls for staff invite/revoke, locale, data source connections, expense visibility and provider consent.
2. Define permission matrix per role and action, including export, approval, supplier messaging, financial details and deletion.
3. Add audit event browser with actor/action/timestamp/safe diff; protect from update/delete in normal app flow.
4. Implement connection status, revoke, last sync and source access review; workers must stop using revoked tokens.
5. Provide data export and privacy deletion request workflow with legal retention limitations documented.
6. Implement platform support with least privilege; privileged impersonation/data access requires time-bound audited approval if allowed at all.
7. Feature flags/entitlements cannot be set using untrusted frontend props; enforce on API.
8. Test revoked sessions, forged store roles, delete cascading, audit retention and support overreach.

## Verification and definition of done
- Owner can see and control who accesses their store and sources.
- Staff's permission edits and sensitive exports are prevented.
- All privileged actions leave durable audit evidence.
- Revocation propagates to queues/provider access.

## Guardrails and anti-patterns
- No unlogged global admin bypasses.
- Don't treat user-modifiable JWT metadata as role authority.
- Avoid storing unnecessary personal data for "insights".

## Example invocation
`/admin-governance Implement store governance, audit and data control center.`

## Reporting contract
For each feature report **files changed, schema/API changes, commands actually executed, tests passed/failed, security/finance implications, remaining blockers and next incremental step**. Do not claim outcomes that were not measured. All changes must integrate with existing repository modules rather than generating a disconnected sample app.
