# MITRA live demo: 4 minutes, click by click

**Before you go on stage:** run `services/api/.venv/bin/python services/api/seed_demo.py` (resets the SAMPLE store to 16 lassi asks). Sign in as the owner in one browser window and as staff in a private window. Phone hotspot ready. Keep `pitch/Paytm_MITRA_Pitch.pptx` open as the fallback.

## Soundbox opening (60 seconds, do this first)

| Say | Do |
|---|---|
| "Every Paytm merchant has a Soundbox. It tells him what he sold. We added one button." | Open **Soundbox**. Point at the AI button. |
| "He presses it once. From now on the Soundbox also hears what customers ask for and don't get." | Press **AI**, tick the notice, **Turn on**. Say across the counter: *"Anna, mango lassi irukka?" "Illa-mma, namma kadaila illa."* (Noisy hall: press the **Tamil** SAMPLE button instead.) |
| "No typing, no tap. It logged the ask, and it's telling him what to do." | The log shows Heard → Logged → the Soundbox speaks: *"14 people asked this week. Try stocking 10 first."* |
| "And it's still a Soundbox." | **Pre-orders** → new pre-order, method Paytm link → show the QR. A teammate scans it and taps Pay. The Soundbox announces the payment (sandbox). |

Then continue with the flow below from Opportunities.

| Time | Say | Do |
|---|---|---|
| 0:00 | "Every QR in India knows what sold. None of them knows what *didn't*." | Open http://localhost:3000 and scroll the **3D story** slowly: the ask, the "illa", the blind QR, the 24 asks piling up. (15 s) |
| 0:15 | "Naren runs a kirana in Velachery. A customer asks for mango lassi. He says *illa*. No payment, so no record." | Owner window → **Today**. Point at "16 asks for Mango Lassi". |
| 0:35 | "He taps once and talks the way he talks." | **Missed demand** → tap mic → say: *"Innaiku ettu per mango lassi ketanga, illa nu sonnen. Rendu peru rose milk kettanga."* Tap again. |
| 0:55 | "Gemini understood Tanglish. Nothing is saved until he confirms. He can fix anything." | Show transcript, the English gloss and the "matches catalog" badge → **Confirm & save**. |
| 1:15 | "Now 24 asks in 7 days. MITRA does *not* say buy 24. Asks aren't sales." | **Opportunities** → Mango Lassi (score ~99). Read the reasons: "two-thirds of weekly asks" → 16. |
| 1:40 | "Money is computed by tested code, not the AI. ₹352 goes in. 8 to 16 sell, gross profit ₹104 to ₹208. If 8 sell, cash is still ₹72 short until the leftover sells." | Drag the slider to 10, then back to 16. Point at the "Cash vs outlay" column. |
| 2:00 | "Rose milk? No cost price, so MITRA refuses to guess a profit." | Expand Rose Milk → "Add cost & price". (Optional: enter 18 / 30 → it becomes "Ready".) |
| 2:15 | "Staff can propose, but can't spend the owner's money." | Owner: **Propose 16-unit trial**. Switch to the **staff** window → **Trials** → Approve → toast shows `403 OWNER_APPROVAL_REQUIRED`. |
| 2:40 | "The owner approves. MITRA drafts the supplier message in Tamil, and he sends it himself." | Owner window → **Approve** → **Draft in Tamil** → show **Open in WhatsApp** (don't send). |
| 3:00 | "A week later he records what happened." | **Record stock received** (16 @ ₹22) → Sold **14**, wasted 0 → **Record results**. |
| 3:15 | "₹182 gross profit. ₹138 cash vs outlay, with 2 bottles still worth ₹44. Predicted 12, actually 14. Every trial teaches the next one." | Confetti fires (14 of 16 sold). Point at the result card and Predicted vs actual. |
| 3:30 | "Next time someone asks for rose milk, he doesn't say illa. He takes a pre-order." | **Pre-orders** → item Rose Milk, qty 2, name, phone (tick consent), **UPI QR** → the QR appears; the phone shows masked. |
| 3:40 | "Add what *did* sell, and MITRA plans ahead: next week's sales, a 27% chance cash runs short around 5 December, and three regulars who stopped coming." | **Insights**: point at the forecast's backtest badge, the cash-runway band, then the at-risk regulars. |
| 3:50 | "And it works without internet, on our own model and offline Whisper." | **Store & settings → AI mode → Offline only** → type a note on Missed demand → badge reads `mitra-lite`. (Pre-warm `scripts/dev-ml.sh` before going on stage: the first call loads the model.) |
| 3:58 | "The Soundbox tells you what sold. MITRA tells you what you missed." | Close slide. |

Before the demo: set the shop UPI ID in Settings to **your own** UPI ID (never a placeholder), start `scripts/dev-ml.sh` for offline mode, and re-run the seed.

## Fallbacks (rehearse each once)

- **AI busy (503)**: MITRA fails over across models automatically. If all are busy, the review card shows "read with simple rules". Say: *"Even when the AI is down, the ledger and the money maths keep working."* That is a strength; show it.
- **Mic blocked / noisy hall**: type the same sentence in the box → **Read it**.
- **Wi-Fi down**: run everything on the laptop (it is local); only the AI calls need internet. Typed capture + rules still work offline from the AI.
- **Something breaks**: re-run the seed (5 seconds) and restart from Opportunities.

## Likely judge questions

- *Why not just use payment data?* Payments only see completed sales. Unmet demand is invisible there, and it is the leading indicator for what to stock.
- *Isn't the AI hallucinating numbers?* The AI never computes money. `economics.py` uses Decimal and is pinned by golden tests; the AI only reads language and explains numbers it is given.
- *How does Paytm make money?* Free capture builds the ledger. MITRA Pro (₹149/mo, a hypothesis), a supplier-network lead fee, and trial-backed working capital through regulated partners, only with consent.
- *Scale?* Stateless API, store-scoped data, one lightweight AI call per voice note. Distribution through the existing merchant app and Soundbox.
- *Accuracy?* Not measured yet, and we won't claim a number. Every extraction is reviewed by the merchant before saving, and the eval set is next on the roadmap.
