---
name: observability
description: "Use when adding production logs, metrics, traces, Sentry, LLM-cost dashboards and incident observability."
---

# Observability — LEAP AI skill

## When this skill applies
Make a real SaaS operationally debuggable without recording merchant secrets or personally identifying transaction contents.

## Read first
- `docs/11_RELEASE_RUNBOOK.md`; `docs/12_METRICS_AND_EXPERIMENTS.md`; `docs/08_SECURITY_AND_COMPLIANCE.md`.

## Implementation procedure
1. Define structured JSON log envelope: timestamp, severity, service, trace_id, correlation_id, route/domain action, safe tenant identifier, duration, status.
2. Propagate trace/correlation IDs from Next.js through FastAPI, worker jobs, model/voice adapters and DB.
3. Instrument API p50/p95 latency, error rates, stock ledger conflicts, queue age/retries, STT/LLM latency and cost-per-confirmed-request.
4. Configure Sentry errors with PII scrubbing; OpenTelemetry spans around store actions and jobs, with sampling controls.
5. Create alert routing for external sends without approval, cross-tenant denial spikes, secret leakage, payment reconciliation variance and runaway model costs.
6. Add per-feature and per-tenant cost ceilings for third-party models/voice and notification services.
7. Build incident correlation dashboard and documented triage, rollback and provider disable process.
8. Test injected provider timeouts and synthetic exceptions for useful traces; verify redaction before shipping.

## Verification and definition of done
- Every failed business request has correlation ID and sanitised explainable logs.
- No raw voice, contact or financial statement content in telemetry.
- Model spend is observable by feature and budget.
- Logs distinguish proposal, approval and actual external side effect.

## Guardrails and anti-patterns
- No logs of full authorization headers or provider secrets.
- Don't instrument raw transcript as a telemetry property.
- Never claim uptime/SLA without real measurements.

## Example invocation
`/observability Instrument core APIs, background jobs and model costs safely.`

## Reporting contract
For each feature report **files changed, schema/API changes, commands actually executed, tests passed/failed, security/finance implications, remaining blockers and next incremental step**. Do not claim outcomes that were not measured. All changes must integrate with existing repository modules rather than generating a disconnected sample app.
