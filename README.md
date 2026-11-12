# Paytm MITRA

**M**issed-demand **I**ntelligence for **T**rade, **R**estock & **A**ction. *Hears the sales your QR never sees.*

Paytm Build for India AI Hackathon, Chennai, 15 Nov 2026 · **Track 1: Merchant Growth AI** · Team: Johnbosco J, Jeffrey Figo J, Joe Naren A

> Hackathon prototype. Not an official Paytm product, partnership or integration. No Paytm data is accessed.

When a customer asks *"mango lassi irukka?"* and the shop says *"illa"*, no payment happens, so no system records the lost sale. MITRA captures those missed requests by voice (Tamil, Tanglish or English). It turns them into small, owner-approved, profit-checked stocking trials and measures what actually sold. The engine is the team's **LEAP loop**: **L**isten → **E**valuate → **A**pprove → **P**rove.

## What's in the box

| Piece | What it is |
|---|---|
| **3D story launch page** (`/`) | Scroll-driven React Three Fiber scene of a Chennai street at dusk: Murugan Stores, a customer, “illa”, the blind QR, asks piling up, MITRA listening in Tamil, holographic trial maths, owner approval, an auto-rickshaw delivery (modelled in Blender: `assets/blender/build_auto_rickshaw.py`) and the proven profit. GSAP ScrollTrigger + Lenis, procedural textures, no downloaded assets. `?shot=N&clean=1` pins a chapter for captures. |
| **Merchant app** (`/app`) | Paytm-for-Business-style UI (navy + Paytm blue, icon tiles, raised centre **Speak** button on mobile): Today, Missed demand, Opportunities, Trials, **Pre-orders**, Catalog, Ask MITRA, Activity, Store & settings. Tamil/English. |
| **Pre-orders** | Turn a missed ask into a reserved sale: Paytm Payment Link (staging, official `paytmchecksum` signing, enabled when you add your MID/key), UPI QR from the shop's UPI ID, or pay later. Customer phone encrypted (Fernet), masked in lists, owner-only audited reveal, consent required. |
| **MITRA-Lite** (`services/ml`) | Our own LoRA fine-tune of Qwen2.5-1.5B on Apple MLX for Tamil/Tanglish/English extraction. Runs offline; **Settings → AI mode → Offline only**. See `services/ml/README.md`. |
| **MITRA MCP server** | `services/api/mitra_mcp.py`: read-only MCP tools (`missed_demand`, `opportunities`, `trial_results`, `ask_mitra`) so AI assistants or agents can use a store's insights through the same authenticated, tenant-scoped API. Paytm's own MCP server repo wasn't publicly available, so MITRA exposes its own. |
| **Animated pitch deck** | `pitch/Paytm_MITRA_Pitch.pptx`: 12 slides covering the 7 required sections, cinematic frames from the 3D story, Morph transitions and auto-playing entrance animations (`pitch/build_deck.js` + `pitch/animate.py`). |

## What works today (all real, persisted, tested)

| Step | What happens | Where |
|---|---|---|
| Listen | Mic → 16 kHz WAV in the browser → Gemini transcribes Tamil/Tanglish and extracts `item, ask count, reason` as schema-bound JSON → merchant reviews/edits → saved. Typed text and a no-AI form also work. | `apps/web/app/app/demand`, `services/api/app/ai.py` |
| Evaluate | Confirmed asks (7-day window) + catalog cost/price → explained score (`score-v1`) and trial size (24 asks → **16 units**, capped by shelf life, stock and budget). No cost price means no profit shown. | `services/api/app/opportunities.py`, `economics.py` |
| Approve | Owner-only approval (staff gets **HTTP 403**). AI drafts a Tamil supplier WhatsApp; MITRA **never sends** it. | `POST /api/trials/{id}/approve`, `/supplier-message` |
| Prove | Record stock received and units sold/wasted → revenue, COGS, gross profit, cash vs outlay, leftover value, predicted vs actual. Stock ledger updated. | `POST /api/trials/{id}/receive`, `/outcome` |
| Ask MITRA | Tamil/English Q&A grounded only on the store's own records. Read-only. | `POST /api/ask` |
| Trust | httpOnly JWT + bcrypt, store-scoped roles, tenant isolation, append-only audit log, idempotency keys, correlation IDs, login lockout + rate limits, origin guard, security headers, "sign out everywhere", encrypted PII, Alembic-managed schema. | `services/api/app/security.py`, `hardening.py`, `crypto.py`, `migrations/` |

Golden finance case (blueprint docs/04 §5), enforced by tests and visible in the UI: 16 bought at ₹22, 14 sold at ₹35 gives revenue ₹490, COGS ₹308, **gross profit ₹182**, cash vs outlay ₹138 (not profit), leftover ₹44.

## Run it locally

Prereqs: Python 3.12 via `uv`, Node 20+. Optional: `GEMINI_API_KEY` in your environment (without it MITRA runs in clearly labeled rules-only mode).

```bash
./scripts/dev-api.sh
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
cd apps/web && npx tsc --noEmit && npx eslint . && npx next build
```

Current status: **25/25 backend tests pass**, ruff clean, TypeScript strict and ESLint clean, and the production build passes.

## Layout

```
apps/web/            Next.js 16 · React 19 · Tailwind 4 merchant app (mobile-first, EN/TA)
services/api/        FastAPI · SQLAlchemy 2 · Pydantic v2 · Decimal economics · Gemini adapter
pitch/               Paytm_MITRA_Pitch.pptx (7 required sections) + build_deck.js
docs/00_WINNING_STRATEGY.md   event rules, judging levers, name, demo plan
docs/DEMO_SCRIPT.md           4-minute live demo, click by click, with fallbacks
docs/01–17                    original LEAP blueprint (spec, architecture, risks)
```

## Configuration (`MITRA_*` env vars)

`MITRA_DATABASE_URL` (default SQLite `mitra.db`; any SQLAlchemy URL, e.g. PostgreSQL), `MITRA_JWT_SECRET` (**set in any shared deployment**), `MITRA_COOKIE_SECURE=true` behind HTTPS, `MITRA_GEMINI_MODELS` (failover order), `MITRA_AI_PROVIDER=none` to force rules-only, `MITRA_API_ORIGIN` for the web proxy. The Paytm connector flag stays `false` until approved access exists.

## Known gaps (honest list)

- PostgreSQL is supported through `MITRA_DATABASE_URL` + Alembic but was verified here on SQLite only (no Docker daemon on the dev machine). Postgres row-level security is not added yet.
- Offline voice needs a local Whisper model (not bundled); offline typed capture works with MITRA-Lite.
- Paytm Payment Links need your staging MID/key in `services/api/.env`; the Paytm MCP server repo was not publicly available.
- Not yet built: offline PWA queue, Sarvam STT adapter, CSV settlement import, expiry radar.
- The AI score and the 2/3 trial fraction are product heuristics, not measured models.
- Gemini capacity spikes (HTTP 503) happen. MITRA fails over across models, then falls back to a rule-based reader with a warning. Typed capture always works.
