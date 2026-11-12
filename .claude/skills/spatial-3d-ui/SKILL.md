---
name: spatial-3d-ui
description: "Use when creating Blender assets, Three.js/React Three Fiber charts or an optional Unity store digital twin."
---

# Spatial 3D Ui — LEAP AI skill

## When this skill applies
Create a meaningful spatial visualization of stockouts/demand that is optional, fast and connected to authenticated real data.

## Read first
- `docs/07_DESIGN_SYSTEM_AND_UX.md`; `docs/03_SYSTEM_ARCHITECTURE.md`; `docs/15_RISK_AND_DECISIONS.md`.

## Implementation procedure
1. Confirm complete P0 web/app flow is already working; implement spatial display behind default-off feature flag.
2. Define business question the 3D view answers: which shelf/SKU is missing frequently requested products, expiry exposure or stock level.
3. Model simple store/shelf geometry in Blender; export compressed glTF/GLB with low polygon counts and atlas textures.
4. Load Three.js/R3F via lazy client component, preserving SSR boundaries and reducing initial dashboard bundle.
5. Bind colored shelf markers to real authenticated inventory and missed-request APIs with proper source/last-updated labels.
6. Add accessible 2D list/table alternative containing identical information and keyboard navigation.
7. Use camera controls, interactive tooltips and minimal subtle animation; respect reduced motion and low-power devices.
8. If Unity added, treat it as separate read-only kiosk using authenticated limited API; never as finance/stock authority.
9. Measure asset download, GPU/CPU cost and 360px phone performance; fallback when WebGL unavailable.

## Verification and definition of done
- 3D scene loads only when selected; no impact on onboarding P0 performance.
- Data changes in API update visualization after refetch.
- Accessible 2D view exists for all users.
- Offline/WebGL failure states work.

## Guardrails and anti-patterns
- Avoid pointless spinning 3D logos and lavish shaders that delay app.
- No hardcoded 'heatmap' values disguised as live merchant data.
- Never move accounting logic into Unity or shader code.

## Example invocation
`/spatial-3d-ui Build an optional 3D shelf-demand radar with 2D fallback.`

## Reporting contract
For each feature report **files changed, schema/API changes, commands actually executed, tests passed/failed, security/finance implications, remaining blockers and next incremental step**. Do not claim outcomes that were not measured. All changes must integrate with existing repository modules rather than generating a disconnected sample app.
