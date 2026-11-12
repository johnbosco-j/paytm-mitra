---
name: security-and-privacy
description: "Use for auth/RLS audits, threat modeling, secrets, financial authorization, privacy, consent, and secure external integrations."
---

# Security And Privacy — LEAP AI skill

## When this skill applies
Apply as a blocking review whenever handling money, customer contacts, voice, user roles, LLM tools or third-party credentials.

## Read first
- `docs/08_SECURITY_AND_COMPLIANCE.md`; `docs/09_TESTING_AND_ACCEPTANCE.md`; `docs/05_API_CONTRACTS_AND_INTEGRATIONS.md`.

## Implementation procedure
1. Map trusted identities and sensitive assets; document attack surfaces for web, API, DB, worker, object store and AI.
2. Verify JWT issuer/audience/signature, active membership and fine-grained authorization on every API route and background task.
3. Test RLS cross-store read/write, staff vs owner approval, file path access, temporary signed URLs, and revoked membership behavior.
4. Scan env use, frontend bundle, logs, CI and git for exposed secrets; document rotation.
5. Validate all external documents/transcripts as untrusted content and prevent prompt-injected tool execution.
6. Add idempotency, replay protection, verified webhooks and merchant approval for outbound effect.
7. Apply granular consent, encrypted contact storage, opt-out propagation, audio retention and deletion pipeline.
8. Check finance formulas and disclosure labels; prevent unsupported claims or misleading profit outputs.
9. Deliver a short threat model and high/medium/low risk list with tests and owner for each unresolved issue.

## Verification and definition of done
- Zero known unauthorized cross-tenant access or external writes in red-team tests.
- No credentials, raw statements or contact PII in shared analytics/logs.
- Customer revocation prevents further messaging and unauthorized model use.
- High/critical security failures block release.

## Guardrails and anti-patterns
- Do not claim legal compliance from framework choice.
- Do not use Paytm credentials not explicitly authorized.
- Never enable automatic supplier payment, lending or credit scoring.

## Example invocation
`/security-and-privacy Audit approval, tenant isolation, audio retention and all external actions.`

## Reporting contract
For each feature report **files changed, schema/API changes, commands actually executed, tests passed/failed, security/finance implications, remaining blockers and next incremental step**. Do not claim outcomes that were not measured. All changes must integrate with existing repository modules rather than generating a disconnected sample app.
