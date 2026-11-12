# 07 — Visual system, information architecture, and product experience

## 1. Design north star

LEAP is **the command center for a real neighborhood merchant**. Make it premium, lucid, approachable and operationally precise—not a carnival of glowing cards, generic gradient blobs, or fake analytics. Delight comes from useful interactions, speed, clarity and a focused visual metaphor: `invisible demand → detected signal → profitable action`.

## 2. Visual direction

**Design name:** Signal / Velocity / Confidence.

Suggested tokens (teams may refine after creating visual references):
- Canvas navy: `#081326`, dark surface: `#111F38`, raised surface: `#192A46`.
- Signal cyan: `#38D6E6`; success teal: `#21C8A2`; caution amber: `#F5B75C`; risk coral: `#EF6E71`.
- Light editorial surfaces: `#F5F8FC` / white for dense tabular screens.
- Primary text on dark: `#F0F7FF`; supporting muted: `#A6B7CB`.
- Data viz use distinguishable shapes/labels, not hue alone.
- Fonts: Inter/Geist for UI; fallback with well-tested Tamil rendering (e.g. Noto Sans Tamil). Do not distribute proprietary fonts; verify licenses.
- 8px spacing scale, 12–20px card radius, consistent shadows; no excessive rounded pills everywhere.
- Animations: 120–240ms interactions, respects prefers-reduced-motion, avoid expensive 3D when battery/network constrained.

## 3. Main navigation (permission/feature-aware)

1. **Overview:** insights needing action, cash-impact summary, recent verified activity.
2. **Demand Radar:** create voice/text request, confirm transcripts, cluster and filter.
3. **Opportunities:** prioritized evidence-backed proposals, scenario controls and risk breakdown.
4. **Actions & Trials:** approval inbox, trial progress, result journal, retrospective.
5. **Inventory:** catalog, stock levels, lots and expiring inventory.
6. **Suppliers:** quote comparison, delivery estimates and approved purchase drafts.
7. **Customers & Growth:** consented campaigns, draft promotions and retention.
8. **Money:** authorized statements, cash runway and settlement exceptions.
9. **Activity:** audit ledger, who approved what, failed tasks and sync status.
10. **Settings:** stores/roles, language, consents, integrations, export and deletion.

Hide future navigation items until real workflows are implemented. P0 uses first four plus catalog/settings.

## 4. The hero screens

### Dashboard
- Editorial header greeting and store switcher with authenticated identity.
- Prominent "What needs attention today" one-column action queue (not giant numbers without meaning).
- Signal cards: unserved requests this week, stockouts, pending trials, result summary; all with last-updated and source labels.
- One meaningful narrative: "Customers asked 14 times for chilled drinks. Your inventory shows none. Here's a cautious trial." Avoid false certainty.
- Activity chart with primary measure, source, timeframe selector; empty states explain exactly what's missing.

### Demand Radar
- Large mic button, transcript preview, language indicator and accessibility fallback.
- List grouped by item family and time; each item shows raw request count, days repeated, confirmed ratio.
- "Verify" screen highlights uncertain quantity/unit; merchant can correct everything before save.
- One-tap add by typing, barcode lookup or photo where relevant.

### Opportunity detail
- Hero opportunity and score **with explanation**, not opaque 94/100 prestige score.
- Evidence trail: 24 confirmed asks over 7 days, relevant SKUs and inventory/cost sources.
- Scenario slider: proposed 8/12/16 units; outlay, potential units sold, expiry exposure; accessible numeric input alternative.
- Separate profit math: revenue, COGS, cash after stocking, residual stock and potential spoilage.
- Approval dialog summarizes purchase cost and action destination, makes no external order without second confirmation.

### Trial timeline
- States: Proposed → Approved → Procured → Active → Evaluating → Completed.
- Event log timestamps; who recorded an expense/sale; actual sales and stock remaining.
- "What we predicted vs what happened" with evidence, not awards or hallucinated success.

## 5. UX for low literacy / local commerce

- Tamil first-class locale; allow bilingual item entry; translated copy doesn't override original item aliases.
- Short, conversational labels and big actionable controls; screen reader exposes item names/units.
- Currency INR with Indian grouping (₹1,25,000); locale-aware date/time Asia/Kolkata.
- Show local units: piece, packet, bottle, litre, kg; require conversion before arithmetic.
- Error copy explains a fix: "Enter purchase price to estimate margin" rather than "Invalid input".
- Low-bandwidth route uses HTML/forms first and smaller chart payloads; voice is optional.

## 6. Design implementation guidance

- Next.js App Router server/client boundaries; shadcn/ui only as components, customize deeply.
- Tailwind tokens centrally managed; light/dark theming but prioritize legibility.
- Use Motion only for intentional screen transitions, notifications and task completion; never animate finance values in ways that mislead.
- Responsive breakpoints: 360px, 768px, 1024px, 1440px; verify actual screenshots at each.
- Charts (ECharts/Recharts) have table fallback, tooltips with units and data provenance.
- Icons via Lucide, consistent stroke and meaningful accessible labels.
- Never create text as images when it should be selectable/localizable.

## 7. Optional spatial showroom / 3D

Blender assets should be exported as optimized glTF/GLB, baked textures, few draw calls. R3F should load lazily only on a dedicated spatial page, 2D fallback required. Useful examples: a realistic shelf heat map for frequently requested out-of-stock products, expiring stock hotspot, reorder simulation. Unity can serve a stand-alone interactive environment built on read-only LEAP APIs; it must not become a blocker for tenant CRUD or finance.

## 8. Motion story for high-impact judges' walkthrough

Sequence: merchant records Tamil voice request → editable extraction arrives → radar detects repeat asks → opportunity explanation shows money and risk → merchant authorizes a small trial → dashboard later shows observed sales. It should feel like one application, not multiple unrelated screens. Never fake a "live" response in a way that appears to be a production provider call.

## 9. Component inventory

`AppShell`, `MerchantSwitcher`, `LocaleSwitcher`, `VoiceCaptureSheet`, `TranscriptReviewForm`, `DemandLedgerTable`, `RequestSourceBadge`, `OpportunityCard`, `EvidencePanel`, `ScenarioCalculator`, `UnitEconomicsBreakdown`, `ApprovalSheet`, `TrialTimeline`, `StockMovementDialog`, `ProductForm`, `ImportMappingWizard`, `SupplierComparisonGrid`, `CampaignApprovalDialog`, `SettlementExceptionTable`, `ConsentManager`, `OfflineSyncBanner`, `AuditActivityLog`, `NoDataGuidance`, `ErrorBoundary`, `LoadingSkeleton`.

## 10. Visual QA checklist

- No clipped typography with translated Tamil; no horizontal overflow on 360px phone.
- Contrast at least WCAG AA for key text and controls; keyboard visible focus; escape dialog and correct focus restoration.
- All tables have a mobile card/list pattern; charts readable at 320–360px with summary text.
- Audio recording has status / permission / cancellation; never record silently.
- Status colors also have labels; animations respect reduced-motion.
- Every empty state gives a next action and explicit description of missing data.
- Every working CTA leads to a real state transition; do not ship a 'Download' that does nothing.
