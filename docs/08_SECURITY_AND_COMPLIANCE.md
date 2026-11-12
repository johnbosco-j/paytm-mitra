# 08 — Security, privacy, operational guardrails

> Security is a release gate, not a stretch feature. This document describes technical safeguards, not a legal opinion. Consult current applicable Indian privacy/payment law and qualified counsel before commercial launch.

## 1. Threat model

**Protected assets:** merchant transactions and costs, merchant identity, staff roles, customer contact/consent, supplier quotes, voice files, payment statements, AI provider credentials, business actions and approval logs.

**Attackers:** unauthenticated visitor, account-stealing staff, rogue API client switching store IDs, malicious CSV/receipt, supplier message with prompt injection, leaked webhook secret, user clicking repeated submit, LLM tool escalation, accidental log/analytics exposure.

**Critical failures:** cross-store data read; unapproved supplier message/purchase; misleading rupee forecast; data scraped outside allowed API; involuntary customer outreach; deleted user's audio remaining publicly accessible; reconciliation incorrectly crediting cash.

## 2. Authentication and authorization

- Supabase Auth or equivalent verified identity provider; always validate JWT signature, issuer, audience, expiry, and store membership in FastAPI.
- Roles: `owner`, `manager`, `staff`, `read_only`; roles are enforced per action by server and RLS.
- Staff may record demand and stock movements but not set marketing consent, change billing, export private data or authorize spending by default.
- Invite/revocation is auditable; expired memberships rejected even with previously cached UI.
- Extra verification/MFA for high-risk actions when feasible; explicit confirmation with amount and destination.
- Owner/member names and exact merchant locations are not needed in analytics events.

## 3. Tenant isolation strategy

- Store ID derived from verified membership; never use client-provided store ID as sole permission proof.
- RLS on all exposed tenant tables; avoid bypassing RLS using a global service-role connection for normal user requests.
- Storage object policies prevent one store reading another's files.
- Background workers receive scoped tenant identity and check job ownership before processing.
- Cross-tenant E2E and API tests intentionally swap IDs; no error metadata reveals other store details.
- Aggregations for neighborhood intelligence are opt-in with a minimum contributor threshold and purpose restriction; prevent repeated narrow queries reconstructing a store.

## 4. API hardening and input safety

- Pydantic and Zod schema validation; positive ranges, max lengths, file quotas, MIME and magic-byte validation.
- Prepared queries/ORM parameterization; no raw unbounded AI-generated SQL.
- CSV formula injection: escape leading `= + - @` in exported cells; import values treated as plain text and validated.
- SSRF: do not fetch arbitrary user-provided URLs; if absolutely necessary use allowlist and network egress restrictions.
- Browser: strict CSP, output escaping, CSRF mitigations, secure cookies, no credentials in public bundle, input sanitization.
- Rate limit by actor+tenant+endpoint, especially STT, LLM, imports, invitations and approvals.
- Webhook verification using provider-documented signature algorithm and replay protection; never implement guessed signing logic.

## 5. Financial integrity

- All money amounts are Decimal or paise; no floating point for ledger calculations.
- Distinguish purchase cash outlay, sales revenue, COGS, gross profit, cash difference, fees, taxes, markdown and unsold stock value.
- Never treat demand requests as completed purchases or customer conversion.
- Reconciliation works from immutable input records; corrections are separate auditable adjustments.
- Stock movements use DB transaction, constraint, optimistic lock or row lock; idempotency tokens prevent double booking.
- Owner approval is checked **again** at execution, not only when a UI button first appears.
- Block external purchase/discount/messages when action authorization expired, changed amount, changed supplier or revoked consent.

## 6. AI and voice privacy

- Audio collection is explicit, recording status visible; allow text-only functionality.
- Document data retention options and default minimal lifespan; delete object+transcript+derived embeddings on approved erasure request where legally permitted.
- Minimize data submitted to third-party model providers; vendor and region choice need contract review.
- Prompt injection defense: untrusted transcript/import/receipt is data, never higher-priority instructions.
- Tool execution allowlist and typed arguments; no arbitrary shell, SQL, HTTP or payment operations from LLM.
- Model provider fallback must not bypass consent/approval requirements.

## 7. Customer outreach and consent

- No unsanctioned marketing messages, scraped contacts, mass WhatsApp sending or "lookalike" profiling based on raw payment IDs.
- Contacts may be stored only when appropriate lawfully obtained and consent/preferences are represented; scope and retention documented.
- Per-contact opt-out always respected and immediately applied; show exact sender identity and message preview before approval.
- Use an approved communications provider, obey provider rate/content policies and applicable regulations; record delivery evidence and unsubscribe preferences.

## 8. Legal and operational review questions

Before production launch, verify current Indian Digital Personal Data Protection Act, relevant rules/notifications and effective dates; applicable CERT-In directions, RBI/payment aggregator rules if payment operations are involved, telecom/marketing consent rules, and vendor contracts. The app is initially **operational analytics software**, not a payment processor, lender, regulated advisor or merchant bank. Consult qualified professionals rather than assuming hackathon rules cover production compliance.

## 9. Security test plan

- Integration test: unauthorized merchant cannot view another store's catalog, voice, reports, events, invoices or embeddings.
- Race test: double-click approval only creates one action.
- Permission test: staff cannot approve expensive purchase or see customer contact export.
- Prompt injection suite: malicious text in invoices fails to trigger supplier send or secrets exfiltration.
- Signed upload tests: wrong MIME, over-limit file, expired URL and path traversal denied.
- CSV/Excel formula injection and malicious rows tested.
- Dependency/security scanning in CI, patched critical vulnerabilities before release.
- Live staging penetration checks using OWASP ASVS-inspired checklist.

## 10. Secrets and production operations

- `.env.example` with placeholders, `.gitignore` all actual `.env` and credential files.
- Separate staging and production accounts; least-privilege provider keys and per-service rotation.
- Logs redact names, phone numbers, access tokens, statement rows, raw audio text unless user opted into controlled diagnostics.
- Backups encrypted, restore test scheduled, time-limited access to incident evidence.
- Response process: revoke/rotate, isolate, preserve audit, fix, notify affected parties as legally required.
