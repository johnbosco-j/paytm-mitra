# 15 — Risk register, decisions, feature cuts and budgeting

## Risks and response plan

| Risk | Severity | Early signal | Prevention and fallback |
|---|---|---|---|
| Deadline / host submission ambiguity | High | Different page dates | Confirm form in account/organizer; preserve final deck and working build |
| Paytm APIs not available | High | No approved merchant credentials | Authorized CSV/manual inputs, feature-flag connector |
| Tamil STT poor in noise | High | high correction rate | Editable transcripts, manual Tamil entry, provider eval dataset |
| Ambiguous units/costs | Critical | unmatched products, null cost | clarification flow and no profit claim |
| Privacy or cross-tenant data breach | Critical | RLS denial test fails | stop release, fix and retest all tenant paths |
| Unauthorized agent action | Critical | action without valid approval | non-executable agents + bounded tools + audited approval |
| Inflated business metrics | High | demo shows fictional ROI | label sample data; distinguish margin, cash, estimates |
| Complex tech stack slows team | High | >24h without P0 flow | modular monolith, PWA first, optional 3D gated |
| Third-party model quota / bills | Medium | 429 or cost spikes | per-tenant budgets, backoff, text fallback, cache |
| Incomplete stock ledger | High | balances negative/double | immutable movements, DB transactions, idempotency tests |
| Import errors/duplicate statements | High | duplicate payments | mapping preview, checksum, uniqueness and report |
| Live deployment failure | High | first real device can't sign in | staging smoke, static pitch fallback, deployment rollback |
| Supplier action liability | High | draft incorrectly sent | merchant approval, explicit destination preview, no payments |
| Scope creep / UI theater | High | many tabs, no real APIs | hide incomplete features, release gate per vertical slice |

## Engineering decisions already recommended

- Modular monolith: yes. Microservices: later with evidence.
- Web first: Next.js and PWA. Kotlin/Swift after real usage validates demand.
- Database: PostgreSQL/Supabase with RLS; pgvector only if measured alias search benefit.
- Backend: FastAPI and typed contracts; async worker for voice, OCR and bulk import.
- AI: provider abstraction, strict schemas, bounded LangGraph workflow and manual approval.
- Money: Decimal/paise, separate outlay vs gross profit, historical cost snapshots.
- Paytm: only authorized connector (uploads supported before approval).
- 3D: optional lazy feature. Unity/Blender visual layer not core commerce architecture.
- Blockchain/Solidity: exclude from P0/P1, only reconsider with actual partner requirements.

## Cost drivers and controls

- **AI/voice:** transcription minutes, LLM tokens/retries; budget by store and request, measure cost-per-confirmed-signal.
- **Cloud:** database storage/egress, object audio volume, Redis worker uptime, API runtime; monitor monthly and per-store.
- **Messaging:** opted-in notifications, email/SMS fees; no bulk distribution without budget/consent.
- **3D/media:** asset sizes and GPU/battery usage; lazy load, budget performance.
- **Operations:** security scanning, backups, incident support, data deletion and monitoring.

Don't invent current cloud prices; evaluate official pricing pages at deployment time and create budget with expected active merchants, requests/day, average audio length and model usage.

## Kill switches

`FEATURE_PAYTM_SYNC`, `FEATURE_OUTBOUND_CAMPAIGNS`, `FEATURE_EXTERNAL_SUPPLIER_SEND`, `FEATURE_NEIGHBORHOOD_AGGREGATION`, `FEATURE_SPATIAL_UI`, `FEATURE_LLM_EXPLANATIONS`. They default disabled until tests, consent, approvals and provider access pass. Do not block offline/manual P0 functionality.
