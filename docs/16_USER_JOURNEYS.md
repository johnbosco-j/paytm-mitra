# 16 — Real-world journeys, scenarios, acceptance details

## Journey 1 — new single-store merchant

**Entry:** create account → verify session → choose Tamil → set store name, simple address/city and product unit conventions → create first product with buying price and selling price → view empty dashboard stating no data → enter first missed request. **Fail modes:** duplicate account, abandoned signup, expired session, missing or invalid store currency, network reconnect. **Done:** saves real rows and works after re-login.

## Journey 2 — Tamil mixed-language voice

Merchant says something like "Innaiku 8 per chilled lassi ketanga, illa nu sonnen." App records only on deliberate tap, uploads safely, transcribes, extracts `item=chilled lassi`, `quantity=8`, `unit=customer_requests`, `date=today`, reason=`out_of_stock`, size=`unknown`, displays edit/confirm. **Fail:** 8 bottles inferred incorrectly, voice has another language, transcription too uncertain, provider offline; manual typed correction persists source and reviewer. **Done:** confirmed ledger entry is independent of API vendor availability once saved.

## Journey 3 — recommendation under uncertainty

Owner logged 24 asks in week; 0 stock; configured buy ₹22 and sale ₹35. LEAP explains evidence, recognizes requests are not guaranteed conversions, proposes small 16-unit stocking trial with alternative 8/12 units if available. Expose outlay, sold-unit gross profit scenarios, leftover inventory/waste and risk. **Fail:** missing buy price → margin withheld; missing package size → ask, never assume. **Done:** all underlying numbers traceable to original records and math function tests.

## Journey 4 — owner approves and measures outcome

Owner reviews trial and approves ₹352 purchase plan. No supplier message dispatched without a second consented send step. Owner records 16 received, 14 sold at ₹35, 2 remaining. Dashboard displays revenue ₹490, COGS ₹308, gross profit ₹182, purchase cash outlay ₹352, cash difference ₹138, remaining usable inventory value ₹44. Staff member tries approval → forbidden. A repeated submit → no double booking. **Done:** timeline and audit persist.

## Journey 5 — inventory expiry

Products carry per-batch expiry and remaining qty. System warns about expiry and proposes lower-risk action; if a 2-unit spoilage is entered, stock value decreases and waste cost appears. Don't recommend unsafe consumption of expired products. **Done:** consistent stock ledger and safe customer-facing messaging.

## Journey 6 — supplier bids

Store requests quote for 16 lassi units. Two authorized supplier quotes differ in buy price, MOQs, shipping and lead days. LEAP compares total landed cost and risk; drafts purchase order without external dispatch; owner changes quantity; approval must revalidate cost. **Done:** supplier cannot view competitor quotes or merchant revenue.

## Journey 7 — settlements reconciliation

Merchant uploads authorized report. Import wizard validates headers and date/time, preserves original file hash and normalized ledger. Reconciliation matches amounts/dates/reference IDs, creates reviewable exceptions; it does not create fictional bank transfers. **Done:** duplicate import handled, mismatches explicit.

## Journey 8 — safe campaign

LEAP identifies slow afternoon footfall from actual sales history, drafts a Tamil campaign but validates margin after offer. Merchant edits message, selects contacts with recorded consent, approves external send, can cancel. **Fail:** all recipients opted out → block. **Done:** delivery statuses and cost logged, no uncontrolled mass sending.

## Journey 9 — cash planning

Merchant adds known bills, procurement and expected receipts. Platform calculates low/median/high cash scenarios and shows missing assumptions. No credit decisions or loan offers without an independently approved financial compliance process. **Done:** user can inspect which actual entries drive risk indicator.

## Journey 10 — offline shop floor

Merchant offline logs 3 typed missed requests. PWA queues locally with encryption/limited retention, shows "Pending sync" not "Saved to cloud". On reconnect, server idempotency prevents duplicates and resolves edits. **Done:** no data silently lost; conflicts are reviewable.

## Journey 11 — multiple stores

Owner has 2 stores, manager 1, staff 1. Store switcher keeps scope; exports and embeddings include store membership checks. Network requests for unknown store IDs return unauthorized/not found without leaking details. **Done:** automated tenant matrix passes.

## Journey 12 — neighborhood privacy

Several opted-in shops share anonymous aggregated requests by broad item category/week and area bucket. If contributors fall below privacy threshold, no result released. Differential privacy or other privacy mechanism evaluated before commercial use. No individual store's prices or customers exposed. **Done:** opt-in/revoke honored and group-size tests pass.

## Journey 13 — question answering grounded in records

Merchant asks in Tamil "Which requests repeated the most this week?" Agent retrieves confirmed requests only, shows counts with supporting IDs; cannot claim sales details from payment-only record. **Fail:** prompt injection in note tries to send supplier order; model tool permissions block. **Done:** grounding and audit.

## Journey 14 — optional spatial inventory

3D/2D switch visualizes SKU shelf status based on real inventory and missed demand. Three.js view loads on demand; 2D accessible view offers all same information. No GPU required for ordinary users. **Done:** mobile does not suffer huge initial bundle size.
