---
name: mobile-native
description: "Use when building optional real Android Kotlin/Jetpack Compose and iOS Swift/SwiftUI clients sharing LEAP APIs."
---

# Mobile Native — LEAP AI skill

## When this skill applies
Implement native mobile clients only when the web P0 journey and API contract are stable and there is measurable UX value.

## Read first
- `docs/03_SYSTEM_ARCHITECTURE.md`; `docs/07_DESIGN_SYSTEM_AND_UX.md`; `docs/05_API_CONTRACTS_AND_INTEGRATIONS.md`.

## Implementation procedure
1. Review PWA limitations such as background sync, microphone reliability, offline storage and merchant hardware integration.
2. Use Kotlin + Jetpack Compose for Android or Swift/SwiftUI for iOS; both authenticate using secure supported OAuth/auth flow.
3. Generate/maintain API models from OpenAPI; do not duplicate business finance and permissions logic.
4. Keep sensitive tokens in platform secure storage and use TLS; never accept unverified self-signed production certs.
5. Design offline request queue with shared idempotency semantics, explicit sync UI, signed audio uploads and deletion controls.
6. Implement permission prompts/context for mic/camera, native accessibility and Tamil rendering.
7. Add automated app/unit tests, API integration tests and device-level smoke on entry-level Android if possible.
8. Gate platform-specific push/notifications on user consent and documented providers; no mass customer messaging.

## Verification and definition of done
- Native UI performs same real backend journey without inconsistent financial results.
- Roles and tenant restrictions server enforced even with modified client.
- Offline sync doesn't double-create requests or ledger entries.
- Both screen reader and low-end device performance considered.

## Guardrails and anti-patterns
- Don't let native app become separate system-of-record.
- Never expose service-role key in APK/IPA.
- Don't block the hackathon web release on native development.

## Example invocation
`/mobile-native Plan and begin a real Android Compose companion app after P0 web is stable.`

## Reporting contract
For each feature report **files changed, schema/API changes, commands actually executed, tests passed/failed, security/finance implications, remaining blockers and next incremental step**. Do not claim outcomes that were not measured. All changes must integrate with existing repository modules rather than generating a disconnected sample app.
