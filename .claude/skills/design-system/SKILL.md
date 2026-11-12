---
name: design-system
description: "Use when establishing LEAP AI visual identity, reusable UI components, micro-interactions, responsive layouts, and visual quality."
---

# Design System — LEAP AI skill

## When this skill applies
Create a premium but usable navy/cyan fintech design language recognizable across landing, merchant dashboard and operational tools.

## Read first
- `docs/07_DESIGN_SYSTEM_AND_UX.md`; `docs/02_PRODUCT_REQUIREMENTS.md`.

## Implementation procedure
1. Define CSS/Tailwind semantic tokens for canvas/surface/text/primary/success/warning/risk, color contrast, spacing, radius, shadows and typography.
2. Create design primitives for shell, KPI source badge, information card, table, activity timeline, approval sheet, form field and empty state.
3. Establish icon/illustration grammar for invisible demand signals, actions and learning loops; no borrowed Paytm logo suggesting affiliation.
4. Design desktop editorial and mobile task-first experiences from the same components.
5. Each screen must emphasize the next action, actual evidence and uncertainty rather than an opaque AI confidence number.
6. Use Motion sparingly for transitions/status confirmations; respect reduced motion.
7. Provide responsive screenshots at 360/768/1440 and iterate on real Tamil strings.
8. Capture component usage patterns, props and design tokens for repeated use in feature development.

## Verification and definition of done
- Legibility and contrast are tested; text never clipped in Tamil.
- Source/estimated labels remain visible in data displays.
- Empty and error states visually polished and useful.
- Critical interactions keyboard navigable, with expected focus management.

## Guardrails and anti-patterns
- Don't create 3D/animated art that masks absent functionality.
- Don't use copyrighted Paytm visual assets as LEAP branding without permission.
- Don't communicate financial gain only with green color or motion.

## Example invocation
`/design-system Design and implement the production LEAP AI app shell and components.`

## Reporting contract
For each feature report **files changed, schema/API changes, commands actually executed, tests passed/failed, security/finance implications, remaining blockers and next incremental step**. Do not claim outcomes that were not measured. All changes must integrate with existing repository modules rather than generating a disconnected sample app.
