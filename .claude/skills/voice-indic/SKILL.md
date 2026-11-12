---
name: voice-indic
description: "Use when building Tamil/English speech input, transcription, code-switching, microphone UX and speech provider adapters."
---

# Voice Indic — LEAP AI skill

## When this skill applies
Capture accurate low-friction local-language merchant statements with explicit user review and resilient fallback.

## Read first
- `docs/06_AI_AGENTS_AND_EVALUATION.md`; `docs/07_DESIGN_SYSTEM_AND_UX.md`; official Sarvam docs in `14_SOURCE_REGISTER.md`.

## Implementation procedure
1. Implement browser audio recording triggered by explicit tap; show live status, pause/cancel, permission denial, duration and upload progress.
2. Validate MIME/magic bytes, duration, maximum file size, store-scoped signed upload, audio retention and cleanup.
3. Implement an isolated provider interface; use currently documented Sarvam speech model and `ta-IN` language code for Tamil when applicable.
4. Queue long jobs; store `queued/running/needs_review/completed/failed` and retry metadata, expose status endpoint.
5. Preserve raw transcript and language; handle Tanglish and Tamil-English code-switching without false forced translation.
6. Send transcript to constrained extractor; return nullable item/quantity/unit, highlight uncertain fields.
7. Allow merchant to edit before confirmation. Capture corrected labels for later evals without exposing sensitive contents.
8. Implement typed Tamil/manual request fallback when no keys, mic access or provider availability.
9. Create varied noisy/transliterated Tamil fixtures and per-language error dashboard.

## Verification and definition of done
- Real Tamil audio goes through the permitted provider when key is configured.
- Model unavailable/ambiguous: manual entry remains usable; no fake transcript appears.
- Audio is never public, never auto-recorded and can be deleted per policy.
- Browser/AI tests verify correction and no hallucinated size/unit.

## Guardrails and anti-patterns
- Don't assume Sarvam delivers a calibrated confidence field unless current API proves it.
- No raw audio/transcripts in public analytics.
- Avoid hardcoded speech responses for live merchant mode.

## Example invocation
`/voice-indic Create the real Tamil speech-to-demand capture pipeline.`

## Reporting contract
For each feature report **files changed, schema/API changes, commands actually executed, tests passed/failed, security/finance implications, remaining blockers and next incremental step**. Do not claim outcomes that were not measured. All changes must integrate with existing repository modules rather than generating a disconnected sample app.
