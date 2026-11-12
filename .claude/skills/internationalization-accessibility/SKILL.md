---
name: internationalization-accessibility
description: "Use when adding Tamil/English localization, Indian number formatting, inclusive interactions, and accessibility audits."
---

# Internationalization Accessibility — LEAP AI skill

## When this skill applies
Ensure merchants can complete the entire LEAP AI journey in Tamil or English, on a low-end phone and without a mouse.

## Read first
- `docs/07_DESIGN_SYSTEM_AND_UX.md`; `docs/09_TESTING_AND_ACCEPTANCE.md`.

## Implementation procedure
1. Define locale routing/state, translation message catalogs, fallback rules and respectful Tamil copy review.
2. Implement labels for all critical forms, error messages, unit names, status labels, money, dates, time and speech feedback.
3. Preserve original product names and voice source; localization must not modify authoritative business data.
4. Use verified Tamil font stack; test script shaping with long product variants and mixed Roman/Tamil text.
5. Apply semantic HTML, ARIA labels only when native semantics insufficient, visible focus, sensible heading order and keyboard dialogs.
6. Provide alternatives to charts and voice: tables, plain-language summaries, text entry, accessible numeric controls.
7. Test reduced motion, high contrast, zoom to 200%, 360px viewport and screen-reader labeling.
8. Add automated axe tests and a manual task checklist for every critical user flow.

## Verification and definition of done
- Tamil onboarding, capture, approval and results complete without hidden English-only controls.
- Currency formatting `en-IN`/`ta-IN` verified; units never mixed silently.
- No keyboard traps or icon-only buttons without names.
- Source text and bilingual labels remain readable on mobile.

## Guardrails and anti-patterns
- Never machine-translate raw merchant records into replacement evidence.
- Never rely exclusively on color to describe risk or approval status.
- Do not make microphone mandatory for a request.

## Example invocation
`/internationalization-accessibility Localize the Demand Radar, opportunity and trial flows for Tamil.`

## Reporting contract
For each feature report **files changed, schema/API changes, commands actually executed, tests passed/failed, security/finance implications, remaining blockers and next incremental step**. Do not claim outcomes that were not measured. All changes must integrate with existing repository modules rather than generating a disconnected sample app.
