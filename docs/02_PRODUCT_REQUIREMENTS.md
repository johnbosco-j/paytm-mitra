# 02 — Product requirements and merchant capability catalogue

## 1. Core user personas

1. **Solo store owner:** speaks Tamil or English, short on time, buys from a local wholesaler, cares most about cash/stock and honest sales.
2. **Staff member:** can log missed customer asks and sales but cannot see bank integrations or approve spending.
3. **Multi-store operator:** can compare opted-in outlets and grant managers scoped permissions.
4. **Supplier representative (later):** responds to store-originated RFQs; cannot browse merchant financial records.
5. **Platform support operator:** metadata-only support by default; privileged record access requires approved, logged access.

## 2. Jobs-to-be-done

- "When a customer asks for something not stocked, I want to capture it in five seconds so I can decide whether to buy it."
- "When I restock, I need to understand if the likely incremental profit covers money tied up in inventory."
- "When I suggest a promotion, I need to know the margin after discount and fees."
- "When an item is about to expire, suggest an action without destroying profit."
- "When payment totals differ from settlement totals, show which entries are unmatched."
- "When a team member makes a decision, I need to know who approved it."
- "When I share my business data, I need control over who can see it and what is transmitted."

## 3. Feature catalogue and release tiers

Each item needs persisted data, authorization, real interactions and a testable acceptance statement. Priorities are P0/P1/P2/P3 as described in the master plan.

| ID | Capability | Priority | Merchant output | Measured acceptance |
|---|---|---|---|---|
| F01 | Authentication and store onboarding | P0 | Real account and store | Login, logout and cross-tenant isolation pass |
| F02 | Product catalog and units | P0 | Stocked items with cost/price | SKUs persist and validate INR decimals |
| F03 | Unserved demand ledger | P0 | Confirmed unmet asks | Edit, duplicate, source and audit tests |
| F04 | Tamil/English voice request | P0 | Reviewed structured request | Speech fallback + manual correction work |
| F05 | AI opportunity clustering | P0 | Evidence-linked demand themes | No cost/no evidence leads to abstention |
| F06 | Margin-aware trial proposal | P0 | Trial quantity/cost/risk | Decimal formula and trace tests pass |
| F07 | Merchant approvals | P0 | Approve/edit/reject proposal | Staff cannot approve financial actions |
| F08 | Sales and trial outcome ledger | P0 | Actual vs estimated results | Returns/waste and stock movement reconcile |
| F09 | Merchant dashboard | P0 | Daily actionable view | Derived only from authorized persisted data |
| F10 | CSV transaction import | P1 | Normalized payment records | Preview, validation, mapping and duplicates |
| F11 | Receipt/invoice OCR | P1 | Draft product/expense rows | Human review required before booking |
| F12 | Inventory stockout radar | P1 | Reorder signals | Actual stock movement reconciles |
| F13 | Expiry / batch tracker | P1 | FEFO & waste alerts | Lot expiry and adjustment tests pass |
| F14 | Supplier quote comparison | P1 | Cost/lead-time proposals | Compare landed cost, not price alone |
| F15 | Draft purchase orders | P1 | Approved procurement draft | Never auto-purchase without approval |
| F16 | Discount guardrails | P1 | Contribution-safe proposed offer | Discount cannot violate margin floor silently |
| F17 | Campaign content studio | P1 | Local-language draft promotion | Merchant reviews before publish |
| F18 | Opt-in customer retention | P2 | Contact-based follow-up | Consent + opt-out enforced per message |
| F19 | Customer feedback capture | P2 | Themes/issue queue | Exclude identifying details from analytics |
| F20 | Cash runway | P2 | Scenario projection | Unknown expenses and uncertainty explicit |
| F21 | Settlement reconciliation | P2 | Exception queue | Source files immutable, differences traceable |
| F22 | Multi-store reporting | P2 | Scoped portfolio analytics | Store roles and RLS tested |
| F23 | Busy-hour staffing signals | P2 | Shift suggestion | Avoid claims from incomplete traffic data |
| F24 | Local anonymous demand pooling | P2 | Aggregated community trend | Opt-in, k-threshold and anti-reidentification |
| F25 | AI business assistant | P2 | Grounded question answering | Cites store records and respects tenant |
| F26 | Agent workflows | P2 | Reviewable action drafts | Every external action gated/audited |
| F27 | Offline-first PWA | P2 | Pending voice/text request queue | Sync is idempotent and resolves conflicts |
| F28 | Multi-language UI | P0/P1 | Tamil/English labels and output | Locale switch, fallback and text overflow |
| F29 | Merchant reports and export | P2 | Signed CSV/PDF export | Export only authorized store records |
| F30 | Alerts and notification center | P1 | Actionable inbox | Deduplication, opt-out and alert severity |
| F31 | Supplier lead-time predictor | P2 | Confidence-banded ETA | Backtest vs actual delivery records |
| F32 | SKU demand forecasting | P2 | Conditional forecast | Backtested against naive baseline |
| F33 | Expense categorization | P2 | Reviewable cost ledger | Confidence and correction tracking |
| F34 | Fraud/anomaly indicators | P2 | Investigative alerts | Never label merchants/customers fraudsters without evidence |
| F35 | Interactive shelf insights | P3 | 3D demand/stock hotspots | 2D alternative available |
| F36 | Native mobile clients | P3 | Kotlin/Swift merchants | Same secured APIs and feature parity goals |
| F37 | QR inventory tags | P2 | Scan to adjust stock | Role restricted + audit event |
| F38 | Price comparison experiments | P2 | Controlled pricing tests | Full margin sensitivity and guardrails |
| F39 | Merchant learning assistant | P2 | Plain-language explanations | Content accurately reflects source data |
| F40 | Data governance console | P2 | Consent/revoke/export/delete | Data lifecycle validated |

## 4. Four outcome pillars

- **Recover demand:** voice-to-unserved-request, alias clusters, trial conversion.
- **Protect working capital:** reorder sizing, expiry, supplier lead time, margin floors.
- **Grow sustainable profit:** cost-aware campaigns, customer loyalty and retention, upsell experiments.
- **Run with confidence:** settlement checks, cash runway, activity approvals, accurate statements.

## 5. Detailed P0 acceptance cases

### F03 — Capture missed request
**Given** merchant has a verified store; **when** they type "5 customers requested mango lassi 200ml today"; **then** the request is persisted with count=5, normalized category and raw source, state=`confirmed`; product linking is optional; no customer PII required. A staff member can add but cannot forge owner approval.

### F04 — Voice capture
**Given** Tamil audio; **when** STT succeeds; **then** the transcript is shown for editing and extracted quantity, item and availability reason are transparent. If confidence is low, structured fields remain pending; no invisible auto-save. If provider is offline, merchant can complete manual capture.

### F06 — Opportunity economics
**Given** demand for 24 drinks in a week and buy/sell costs; **then** the system proposes, for example, a smaller 16-unit trial with reasons and correct `outlay = qty * unit_cost`, estimated total profit range and potential unsold loss. **Never treat 24 requests as 24 guaranteed sales.**

### F07 — Approval state
**Given** staff user; **when** approval requested; **then** API returns 403 and records no approval. Owner sees cost/quantity/risk and can edit before confirming.

### F08 — Outcome reconciliation
**Given** 16 units purchased, 14 sold at ₹35, procurement cost ₹22/unit, no other known cost; **then** sales=₹490, purchase cash outlay=₹352; cash difference=₹138 **before other costs**. Unsold stock quantity=2 still holds inventory value if usable; accounting gross profit from the 14 sold units is `14*(35-22)=₹182` before other costs, which is **not the same as ₹138 cash difference**. Show both separately and account for spoilage explicitly.

## 6. Product-wide acceptance quality bars

- Price and margin math use decimal precision, unit normalization and currency formatting.
- No silent mutation of imported transaction or source records.
- Every user-facing prediction differentiates observed, inferred and projected.
- Every external message requires recipient consent and merchant approval.
- A page with insufficient data says so, requests missing inputs, and remains useful.
- Every enabled navigation item leads to a meaningful working workflow; not a decorative dashboard.

## 7. Out-of-scope claims (do not invent)

- "Official Paytm app" or "Paytm has partnered with us".
- "AI detects customer preferences from Paytm transactions alone" (line items are not always present).
- "Guaranteed 20% profit uplift", "real pilot at 30 stores", or "model achieved 95% accuracy" without measured evidence.
- "Approved data access to Paytm merchants" without credentials, terms and merchant consent.
- "Autonomous purchasing" without explicit authorization and compatible supplier system.
