# Paytm MITRA

**M**issed-demand **I**ntelligence for **T**rade, **R**estock & **A**ction. *Hears the sales your QR never sees.*

Paytm Build for India AI Hackathon, Chennai, 15 Nov 2026 · **Track 1: Merchant Growth AI** · Team: Johnbosco J, Jeffrey Figo J, Joe Naren A · **Made by RivenDevs**

> Hackathon prototype. Not an official Paytm product, partnership or integration. No Paytm data is accessed.

When a customer asks *"mango lassi irukka?"* and the shop says *"illa"*, no payment happens, so no system records the lost sale. MITRA captures those missed requests by voice or text in **any of India's 22 scheduled languages**, English, or code-mix (Tanglish, Hinglish, Tenglish, Manglish, Kanglish). It turns them into small, owner-approved, profit-checked stocking trials and measures what actually sold. The engine is the team's **LEAP loop**: **L**isten → **E**valuate → **A**pprove → **P**rove.

## What's in the box

| Piece | What it is |
|---|---|
| **3D story launch page** (`/`) | Scroll-driven React Three Fiber scene of a Chennai street at dusk: Naren Stores, a customer, “illa”, the blind QR, asks piling up, MITRA listening in Tamil, holographic trial maths, owner approval, an auto-rickshaw delivery and the proven profit. Naren, Priya (the customer) and passers-by are the team's Character Creator models in their own western clothes, posed with their own skeletons (palms down on the counter, an asking gesture) in `assets/blender/build_people_v2.py`; Priya and her husband walk as a couple with real skeletal walk cycles baked in Blender (`build_walkers.py`: thighs swing, knees flex in swing, planted feet stay on the ground, arms counter-swing; clip speed matched to ground speed so feet don't skate): they stroll up, she asks, they walk on to the big café after "illa", and return for her pre-order. **Naren Stores itself is the team's downloaded coffee-bar model**, cut just in front of its counter so it opens onto the street like a kirana (`build_store.py`): real counter, ceiling and back wall, with the café's menus re-skinned as Tamil/English price, filter-coffee and UPI boards (`store_boards/make_boards.cjs`), and a plaster gable facade with the Tamil signboard, awning and shutter built in three.js. The supplier's mini-truck (team asset, rebranded "Sri Lakshmi Dairy") drives in for the delivery (`build_truck.py`); the same café, dressed dark, is "City Café & Mart" down the road, where the lost sale goes (`build_cafe.py`). On phones the cameras pull back so every chapter stays framed. Apple system typography (SF Pro) for the story; the hero line in keynote-style SF Pro Display Bold with tight tracking and an animated cyan gradient (Google Sans Flex on non-Apple devices). Renders at device pixel ratio 2 with anisotropic filtering; deck frames are captured at 3840×2160. Optional sound: street ambience plus Tamil/English voice lines. GSAP ScrollTrigger + Lenis. `?shot=N&clean=1` pins a chapter for captures. |
| **Merchant app** (`/app`) | Paytm-for-Business-style UI (navy + Paytm blue, icon tiles, raised centre **Speak** button on mobile): Today (time-of-day Tamil/English greeting), Missed demand, Opportunities, Trials, **Pre-orders**, **Insights**, **Sales**, **Shelf scanner**, Catalog, Ask MITRA (with spoken answers), Activity, Store & settings. Confetti when a trial sells through or a pre-order is paid. Installable PWA. Google Sans / SF Pro typography. |
| **Pre-orders** | Turn a missed ask into a reserved sale: Paytm Payment Link (staging, official `paytmchecksum` signing, enabled when you add your MID/key), UPI QR from the shop's UPI ID, or pay later. Customer phone encrypted (Fernet), masked in lists, owner-only audited reveal, consent required. |
| **Insights** | From sales (typed on a keypad or imported from a Paytm statement CSV, deduped, payer UPI IDs salted-hashed): a 7-day sales forecast backtested against a naive baseline, a 30-day cash runway from 2,000 Monte Carlo runs over margin and dues, repeat customers drifting away, upcoming festivals, and an explained business-health score (not a credit score). `services/api/app/insights.py`, `growth.py`. |
| **Shelf scanner** | Photo of a shelf → Gemini vision lists empty/low products as drafts; the owner decides what goes into the demand ledger. |
| **MITRA-Lite** (`services/ml`) | Our own LoRA fine-tune of Qwen2.5-1.5B on Apple MLX (v2: 1,500 more steps on brand-rich notes; strict item F1 0.45 → 0.56 on hand-written notes, ask counts 100% exact) for Tamil/Tanglish/English extraction, plus Whisper large-v3-turbo for offline speech. Voice → text → structured asks with no internet; **Settings → AI mode → Offline only**. Code guards strip sizes and items the speaker never said. See `services/ml/README.md`. |
| **MITRA MCP server** | `services/api/mitra_mcp.py`: read-only MCP tools (`missed_demand`, `opportunities`, `trial_results`, `ask_mitra`) so AI assistants or agents can use a store's insights through the same authenticated, tenant-scoped API. Paytm's own MCP server repo wasn't publicly available, so MITRA exposes its own. |
| **Animated pitch deck** | `pitch/Paytm_MITRA_Pitch.pptx`: 13 slides covering the 7 required sections, cinematic frames from the 3D story, Morph transitions and auto-playing entrance animations. Frames and the insight numbers are captured from the running app (`scripts/capture_frames.cjs` → `pitch/assets/insights_snapshot.json`), then `pitch/build_deck.js` + `pitch/animate.py`. |

## What works today (all real, persisted, tested)

| Step | What happens | Where |
|---|---|---|
| Listen | Mic → 16 kHz WAV in the browser → Gemini transcribes any of the 22 scheduled languages (or code-mix) and extracts `item, ask count, reason` as schema-bound JSON → merchant reviews/edits → saved. A "Speaking in" picker sets the hint; the detected language is shown and stored. Typed text and a no-AI form also work. | `apps/web/app/app/demand`, `services/api/app/ai.py`, `langs.py` |
| Evaluate | Confirmed asks (7-day window) + catalog cost/price → explained score (`score-v1`) and trial size (24 asks → **16 units**, capped by shelf life, stock and budget). No cost price means no profit shown. | `services/api/app/opportunities.py`, `economics.py` |
| Approve | Owner-only approval (staff gets **HTTP 403**). AI drafts a Tamil supplier WhatsApp; MITRA **never sends** it. | `POST /api/trials/{id}/approve`, `/supplier-message` |
| Prove | Record stock received and units sold/wasted → revenue, COGS, gross profit, cash vs outlay, leftover value, predicted vs actual. Stock ledger updated. | `POST /api/trials/{id}/receive`, `/outcome` |
| Ask MITRA | Tamil/English Q&A grounded only on the store's own records. Read-only. | `POST /api/ask` |
| Trust | httpOnly JWT + bcrypt, store-scoped roles, tenant isolation, append-only audit log, idempotency keys, correlation IDs, login lockout + rate limits, origin guard, security headers, "sign out everywhere", encrypted PII, Alembic-managed schema. | `services/api/app/security.py`, `hardening.py`, `crypto.py`, `migrations/` |

Golden finance case (blueprint docs/04 §5), enforced by tests and visible in the UI: 16 bought at ₹22, 14 sold at ₹35 gives revenue ₹490, COGS ₹308, **gross profit ₹182**, cash vs outlay ₹138 (not profit), leftover ₹44.

## Languages

All 22 languages of the Eighth Schedule (Assamese, Bengali, Bodo, Dogri, Gujarati, Hindi, Kannada, Kashmiri, Konkani, Maithili, Malayalam, Manipuri, Marathi, Nepali, Odia, Punjabi, Sanskrit, Santali, Sindhi, Tamil, Telugu, Urdu), English and five code-mixes. The registry and script-based detector are adapted from the team's Nijam.AI project (`services/api/app/langs.py`, `GET /api/languages`). What works where, honestly:

| | Cloud (Gemini) | Offline speech (Whisper turbo) | Offline extraction (MITRA-Lite) |
|---|---|---|---|
| Tamil, English, Tanglish | ✓ | ✓ | ✓ (trained) |
| Hindi, Bengali, Telugu, Kannada, Malayalam, Marathi, Gujarati, Punjabi, Assamese, Urdu, Nepali, Sanskrit, Sindhi | ✓ | ✓ | flagged: "check every item" |
| Bodo, Dogri, Kashmiri, Konkani, Maithili, Manipuri, Odia, Santali | ✓ | ✗ (Whisper lacks them; typed notes work offline) | flagged |

App labels are Tamil and English; MITRA listens in all of the above.

## Run it locally

Prereqs: Python 3.12 via `uv`, Node 20+. Optional: `GEMINI_API_KEY` in your environment (without it MITRA runs in clearly labeled rules-only mode).

```bash
./scripts/dev-api.sh
```

To use PostgreSQL instead of the default SQLite (optional, needs `brew install postgresql@17`):

```bash
./scripts/dev-db.sh
```

```bash
MITRA_DATABASE_URL=postgresql+psycopg://mitra@127.0.0.1:5433/mitra ./scripts/dev-api.sh
```

```bash
./scripts/dev-ml.sh
```

```bash
./scripts/dev-web.sh
```

```bash
cd services/api && .venv/bin/python seed_demo.py
```

Open http://localhost:3000. The seed creates a store labeled **SAMPLE** with an owner and a staff login; credentials are at the top of `services/api/seed_demo.py` (local testing only). Re-run the seed any time to reset the demo.

## Checks

```bash
cd services/api && .venv/bin/python -m pytest -q && .venv/bin/ruff check app tests
```

```bash
cd services/api && MITRA_TEST_DATABASE_URL=postgresql+psycopg://mitra@127.0.0.1:5433/mitra_test .venv/bin/python -m pytest -q
```

```bash
cd apps/web && npx tsc --noEmit && npx eslint . && npx next build
```

Current status: **38/38 backend tests pass on both SQLite and PostgreSQL 17**, Alembic migrations apply cleanly on both, ruff clean, TypeScript strict and ESLint clean.

## Layout

```
apps/web/            Next.js 16 · React 19 · Tailwind 4 merchant app (mobile-first, EN/TA)
services/api/        FastAPI · SQLAlchemy 2 · Pydantic v2 · Alembic · Decimal economics · insights · Gemini adapter · MCP server
services/ml/         MITRA-Lite (MLX LoRA on Qwen2.5-1.5B) + offline Whisper server, training + eval scripts
assets/blender/      headless Blender scripts for the rickshaw and the human models
pitch/               Paytm_MITRA_Pitch.pptx (7 required sections) + build_deck.js
docs/00_WINNING_STRATEGY.md   event rules, judging levers, name, demo plan
docs/DEMO_SCRIPT.md           4-minute live demo, click by click, with fallbacks
docs/01–17                    original LEAP blueprint (spec, architecture, risks)
```

## Configuration (`MITRA_*` env vars)

`MITRA_DATABASE_URL` (default SQLite `mitra.db`; any SQLAlchemy URL, e.g. PostgreSQL), `MITRA_JWT_SECRET` (**set in any shared deployment**), `MITRA_COOKIE_SECURE=true` behind HTTPS, `MITRA_GEMINI_MODELS` (failover order), `MITRA_AI_PROVIDER=none` to force rules-only, `MITRA_API_ORIGIN` for the web proxy. The Paytm connector flag stays `false` until approved access exists.

## Known gaps (honest list)

- Postgres row-level security is not added yet (tenant isolation is enforced in the API layer and tested).
- Offline voice needs the Whisper model downloaded into `services/ml/models/` (1.5 GB, not in git); the first offline voice note after a cold start takes ~50 s while models load, then a few seconds.
- Paytm Payment Links: signing and requests follow Paytm's staging spec, but Paytm's dashboard reports "We hit a snag creating your staging MID", so the MID is not active yet and the API answers "Merchant Id invalid". Pre-orders fall back to UPI QR / pay later until Paytm finishes creating it (Retry in the dashboard, or Paytm support). The Paytm MCP server repo was not publicly available.
- Paytm statement import accepts common CSV column names; it has not been tested against every Paytm export format.
- The people, truck and café GLBs are built from models the team downloaded (CGTrader-style free licences); check each licence allows redistribution before making the repo public. Raw sources stay out of git (`assets/blender/vendor/`).
- People are static poses baked from their rigs; walking is a glide with a step bob, not skeletal animation.
- Unity and Unreal were not used (they need account sign-in and 10–40 GB installs); all 3D is Blender → glTF → three.js.
- Not yet built: offline PWA queue, Sarvam STT adapter, expiry radar.
- The AI score and the 2/3 trial fraction are product heuristics, not measured models.
- Gemini capacity spikes (HTTP 503) happen. MITRA fails over across models, then falls back to a rule-based reader with a warning. Typed capture always works.
