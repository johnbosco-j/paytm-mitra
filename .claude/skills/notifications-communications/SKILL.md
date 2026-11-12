---
name: notifications-communications
description: "Use when adding merchant alert inbox, email/SMS communication, reminders or sending approved campaign drafts."
---

# Notifications Communications — LEAP AI skill

## When this skill applies
Deliver actionable alerts without spamming merchants or contacting customers without consent.

## Read first
- `docs/05_API_CONTRACTS_AND_INTEGRATIONS.md`; `docs/08_SECURITY_AND_COMPLIANCE.md`; `docs/07_DESIGN_SYSTEM_AND_UX.md`.

## Implementation procedure
1. Define event-driven types: low stock, expiry, approval pending, failed import, completed trial and supplier quote expiring.
2. Create in-app notification center with severity, source context, preference, read state and actionable link.
3. Deduplicate equivalent alerts per product/time window; limit frequency and suppress stale results.
4. Email via approved provider (e.g., Resend) with verified sender/domain, unsubscribe/preferences where relevant.
5. Customer marketing notifications require separate recipient consent and merchant approval; never inherit generic app email permission.
6. Render Tamil/English message templates with variables validated and privacy-safe details; do not embed secrets.
7. Queue external sends idempotently, retry transient failures and record provider status, cost and error.
8. Test opted-out, bounced, rate-limited, duplicate and delayed notifications; fallback to in-app alert.

## Verification and definition of done
- Every alert links to real source evidence and an authorized screen.
- Preference and opt-out enforcement tested at send time.
- Duplicate events do not send repeated messages.
- No secrets or raw financial exports in email content.

## Guardrails and anti-patterns
- Don't present a notification as delivered just because queued.
- No default bulk customer messaging or spam campaigns.
- Don't use merchant event activity for undisclosed surveillance.

## Example invocation
`/notifications-communications Build event-driven low-stock and pending-approval notifications.`

## Reporting contract
For each feature report **files changed, schema/API changes, commands actually executed, tests passed/failed, security/finance implications, remaining blockers and next incremental step**. Do not claim outcomes that were not measured. All changes must integrate with existing repository modules rather than generating a disconnected sample app.
