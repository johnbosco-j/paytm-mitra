---
name: ai-extraction
description: "Use when converting merchant text, voice transcripts, invoices or receipts into structured validated business records."
---

# Ai Extraction — LEAP AI skill

## When this skill applies
Create bounded schema-constrained AI extraction with provenance, uncertainty, human review and safe fallback.

## Read first
- `docs/06_AI_AGENTS_AND_EVALUATION.md`; `docs/04_DATA_MODEL_AND_EVENTS.md`; `docs/09_TESTING_AND_ACCEPTANCE.md`.

## Implementation procedure
1. Define small Pydantic output schema per task: request item, quantity, unit, variant, reason, date resolution, unknown fields.
2. Build explicit provider-neutral parser and model version metadata; when using Claude API, verify its current structured output capabilities.
3. Minimize transcript/document context; include source language and normalization examples; forbid unsupported defaults.
4. Validate output types, enums, max lengths, missing fields and cross-field assumptions in deterministic postprocessor.
5. Mark extraction unverified and display source aligned to editable fields before merchant confirmation.
6. Use normalized alias list only after merchant-level data access checks; never cross-pollinate tenant history.
7. Create eval fixtures for Tamil, Tanglish, numerical ambiguity, measurements, negations and adversarial prompt injection.
8. Store corrected merchant values with source provenance and model version so evaluations can be rerun.

## Verification and definition of done
- No guessed size, cost, price or stock quantity becomes confirmed truth.
- Low-confidence/ambiguous extraction returns needs_review or manual input.
- Schema evals + API validation reject malicious/unstructured outputs.
- Provider outage leaves existing persisted data intact.

## Guardrails and anti-patterns
- Don't parse LLM text with brittle regex into financial ledger writes.
- Never let untrusted transcript dictate system/tool instructions.
- Never use model's numeric rationale as a substitute for Python math.

## Example invocation
`/ai-extraction Implement reliable request extraction into typed, reviewable fields.`

## Reporting contract
For each feature report **files changed, schema/API changes, commands actually executed, tests passed/failed, security/finance implications, remaining blockers and next incremental step**. Do not claim outcomes that were not measured. All changes must integrate with existing repository modules rather than generating a disconnected sample app.
