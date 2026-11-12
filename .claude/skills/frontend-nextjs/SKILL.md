---
name: frontend-nextjs
description: "Use when implementing or changing LEAP AI Next.js App Router pages, typed React components, forms, data fetching, and state handling."
---

# Frontend Nextjs — LEAP AI skill

## When this skill applies
Build a working premium merchant web app using **Next.js + TypeScript**, connecting real secured APIs and practical failure states.

## Read first
- `docs/07_DESIGN_SYSTEM_AND_UX.md`; `docs/05_API_CONTRACTS_AND_INTEGRATIONS.md`; `docs/09_TESTING_AND_ACCEPTANCE.md`.

## Implementation procedure
1. Inspect `apps/web`, router and shared component conventions. Use strict TS, App Router, Server Components by default and Client Components only where interactivity requires them.
2. Use a generated typed OpenAPI client; authenticate server requests and never trust URL store ID without backend authorization.
3. Build task-oriented routes for dashboard, demand, opportunities, trials, inventory, settings.
4. Compose accessible shadcn/ui primitives into distinctive, domain-specific components; do not ship unstyled boilerplate.
5. Forms use React Hook Form + Zod or equivalent with both client/server validation; include validation hints, dirty state, disabled/save behavior.
6. All views implement loading, no-data, partial-data, error, unauthorized, stale-data and pending-job states.
7. Prefer server fetching for initial data and controlled client caching for live interactions. Treat Server Actions as public API calls for auth.
8. Make mobile bottom actions, keyboard focus, Tamil wrapping and ₹ formatting part of implementation.
9. Add visual regression/browser tests for 360, 768 and 1440 widths and attach actual screenshots to review.

## Verification and definition of done
- `pnpm lint`, TS typecheck and web tests pass where configured.
- Playwright confirms new user can complete the actual API-backed task.
- No dead CTA, fake dashboard metric, secret leaked to client or inaccessible dialog.
- Resuming a session reflects persisted DB state, not local-only placeholder.

## Guardrails and anti-patterns
- Never fetch with hardcoded bearer tokens or expose database service keys.
- Don't add animation/3D to block an essential merchant form.
- No dangerous optimistic stock/finance writes without server confirmation.

## Example invocation
`/frontend-nextjs Implement the authenticated Demand Radar UI backed by the real API.`

## Reporting contract
For each feature report **files changed, schema/API changes, commands actually executed, tests passed/failed, security/finance implications, remaining blockers and next incremental step**. Do not claim outcomes that were not measured. All changes must integrate with existing repository modules rather than generating a disconnected sample app.
