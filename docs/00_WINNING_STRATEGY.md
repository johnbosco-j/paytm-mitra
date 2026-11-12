# 00 — Winning strategy: Paytm MITRA (built on the LEAP loop)

_Researched 12 Nov 2026 from the devSemble event page, the team blueprint (docs 01–17) and public Paytm news. Re-check the event page on 13–15 Nov; the host manages the stage manually._

## 1. What the event actually judges (from the devSemble page)

| Fact | Detail | What we do about it |
|---|---|---|
| Registration closes | **13 Nov 2026** | **Register the whole team on devSemble today.** Nothing else matters if this is missed. |
| Event | Offline, Chennai, **15 Nov 2026**, single day | Ship a working app before arriving; use event day for polish + rehearsal. |
| Only published stage | **Stage 1: Submit your Pitch** (a PPT upload form) | The deck is the first filter. It must follow the 7 required sections exactly. |
| Required PPT sections | Title · Problem Statement · Proposed Solution · Technology/Tech Stack · USP · Impact & Benefits · Business Model | `pitch/Paytm_MITRA_Pitch.pptx` uses those exact headings in that order, plus one live-demo slide. |
| Tracks | 1 Merchant Growth AI · 2 AI-Powered Financial Journeys · 3 Autonomous AI Teammates | **Track 1.** The approval-gated actions (supplier message drafts) also show the Track 3 "teammate that does the job" quality. |
| Track 1 brief | "Build the AI business partner for every Paytm merchant… think beyond payments… trusted business copilot for millions of merchants." | Our core signal is the opposite of a payment: **demand that never became a payment.** |
| Why Paytm hosts it | Hiring opportunities, prizes | Judges are Paytm product/engineering people. Show real engineering (tests, tenant isolation, deterministic money maths), not slides. |

## 2. The competitive reality judges will know

- Paytm already launched an **AI Soundbox** (Oct 2025). It answers merchants' questions about sales and collections in 11 languages. A "chat with your payments" project repeats their own product, so it will lose.
- Paytm's AGM said its merchant sales work, including loan collection, now runs on AI agents. Generic "AI agent for merchants" is not new to them.
- **Gap we own:** every payment rail (QR, Soundbox, POS) only sees *completed* sales. When a customer asks "Mango lassi irukka?" and the owner says "illa", no event exists anywhere. That lost sale is invisible to Paytm and to the merchant.

## 3. The name

**Paytm MITRA** = **M**issed-demand **I**ntelligence for **T**rade, **R**estock & **A**ction.

- *Mitra* means friend/partner across Indian languages (Tamil *Mithran*), which matches the Track 1 brief ("AI business partner").
- It works as a Paytm product line: "Paytm MITRA", "Ask MITRA on your Soundbox", "MITRA for Pharmacies".
- The engine keeps the team's original **LEAP** name as the loop: **L**isten → **E**valuate → **A**pprove → **P**rove.
- Tagline: **"MITRA hears the sales your QR never sees."**
- Honesty line on every surface: *Hackathon prototype. Not an official Paytm product or integration.*

Alternatives considered: *Saathi* (Paytm already uses "Health Saathi"), *Vriddhi* (growth; strong meaning but hard acronym), *Uday*.

## 4. The winning demo (4 minutes, one continuous flow, all live)

1. **Hook (15 s):** "Every QR in India knows what sold. None of them knows what *didn't*."
2. **Listen (45 s):** Owner taps the mic and speaks Tanglish: *"Innaiku 8 per mango lassi ketanga, illa nu sonnen."* Gemini transcribes and extracts `mango lassi · 8 asks · not stocked`, and the owner confirms. Typed fallback is always available.
3. **Evaluate (60 s):** The Opportunities page ranks items by confirmed asks, repeat days and margin. Lassi shows 24 asks in 7 days, ₹22 cost and ₹35 price. MITRA proposes a **cautious 16-unit trial, not 24**, and explains why. The scenario slider shows outlay ₹352 and the sold-units range. It refuses to show profit for an item with no cost price.
4. **Approve (30 s):** A staff login tries to approve and gets **403**. The owner approves. MITRA drafts a Tamil WhatsApp to the supplier, and the owner taps send (MITRA never auto-sends).
5. **Prove (45 s):** Record 16 received, 14 sold, 0 wasted. The result card shows revenue ₹490, COGS ₹308, **gross profit ₹182**, cash difference ₹138 and leftover stock ₹44, with predicted vs actual side by side.
6. **Ask MITRA (30 s):** "இந்த வாரம் அதிகம் கேட்கப்பட்டது எது?" ("What was asked for most this week?") gets a grounded Tamil answer that cites the ledger.
7. **Close (15 s):** the Paytm fit: Soundbox voice capture, QR sales as the outcome signal, and supplier/working-capital financing on top.

## 5. Scoring levers judges reward, and how we hit each

| Lever | Proof in our build |
|---|---|
| Real problem, Indian context | Tamil/Tanglish voice, kirana economics, INR Indian grouping |
| It actually works | Live app, real DB, real Gemini calls, persisted across reloads |
| AI used where it matters | Speech + multilingual extraction + grounded explanation. **Money maths is deterministic Decimal, not LLM.** |
| Trust / safety | Owner-only approvals, tenant isolation tests, audit log, no auto-sends, honest "insufficient data" states |
| Scale to millions | Stateless API, store-scoped data, Soundbox and Paytm for Business app as the distribution channels |
| Business model for Paytm | Free capture tier → ₹99–199/mo MITRA Pro (hypothesis) → supplier marketplace take rate → working-capital lending signals with partner NBFCs (needs consent and compliance) |
| Paytm fit | Plugs into the Soundbox voice channel and the merchant app; QR sales close the loop on trials |

## 6. What we must never claim

Official Paytm integration or partnership, measured merchant ROI, pilot traction, accuracy percentages we did not measure, or "first in the world". Market stats (NPCI UPI volume, Paytm merchant base) are context only. See `docs/14_SOURCE_REGISTER.md`.

## 7. Team split for the remaining days

- **Johnbosco:** API, AI adapters, economics, deployment, pitch delivery.
- **Jeffrey:** UI polish, mobile layout, Tamil copy, demo choreography.
- **Joe:** seed scenario, QA script (`docs/DEMO_SCRIPT.md`), negative tests, slide numbers check.
- **13 Nov:** register; run the app locally on 2 laptops; record a backup demo video.
- **14 Nov:** deploy (optional), rehearse 3×, freeze code at 9 pm.
- **15 Nov:** hotspot backup, typed-input fallback, offline video ready.
