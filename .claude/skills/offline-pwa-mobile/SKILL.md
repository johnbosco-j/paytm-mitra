---
name: offline-pwa-mobile
description: "Use when implementing offline-first shop-floor capture, service workers, local sync, or native Kotlin/Swift integration planning."
---

# Offline Pwa Mobile — LEAP AI skill

## When this skill applies
Make the most valuable LEAP actions function reliably on low-end mobile networks without false save confirmations.

## Read first
- `docs/07_DESIGN_SYSTEM_AND_UX.md`; `docs/03_SYSTEM_ARCHITECTURE.md`; `docs/08_SECURITY_AND_COMPLIANCE.md`.

## Implementation procedure
1. Select PWA first; keep browser interactions light with minimal JS and cached app shell only where safe.
2. Implement offline pending queue for typed missed requests with client-generated idempotency IDs; audio queued only with storage/privacy safeguards.
3. UI states explicitly distinguish `Saved on device`, `Syncing`, `Saved to store`, `Conflict`, `Failed`.
4. On reconnect, verify session/membership and merge each queued record idempotently; show conflicts when edits diverge.
5. Protect offline sensitive information via encryption/platform storage features and retention policies; do not cache payment statements by default.
6. Offer a retry/discard/export recovery affordance; never claim a request reached cloud when it didn't.
7. Maintain low-bandwidth visuals; defer heavy charts/3D and use upload resumability where provider supports.
8. Test forced offline mid-submit, session revoked, duplicate replay, multiple devices, low disk and unsupported service workers.
9. Native Kotlin Compose/SwiftUI clients later reuse OpenAPI API and server source-of-truth; no duplicated finance logic.

## Verification and definition of done
- Request survives temporary offline condition and syncs exactly once.
- Session revoke blocks queued privileged operations on reconnect.
- Device exposes clear privacy/storage and deletion controls.
- Full P0 path remains possible via browser text input.

## Guardrails and anti-patterns
- Never store admin tokens or raw full financial exports in persistent web cache.
- Don't call a locally queued record 'cloud saved'.
- No separate native backend or conflicting monetary rules.

## Example invocation
`/offline-pwa-mobile Build a reliable offline missed-request queue in the Next.js PWA.`

## Reporting contract
For each feature report **files changed, schema/API changes, commands actually executed, tests passed/failed, security/finance implications, remaining blockers and next incremental step**. Do not claim outcomes that were not measured. All changes must integrate with existing repository modules rather than generating a disconnected sample app.
