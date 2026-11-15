# MITRA — handoff: continue from here

You are continuing work on **Paytm MITRA** (repo `johnbosco-j/paytm-mitra`, private, branch `main`). Read this file fully, then `README.md` and `CLAUDE.md`. Do the "What to build next" list in order. After each item: run the checks, commit, push. Small commits, one feature each.

## The product in one paragraph

Paytm merchants already have a Soundbox that announces payments. MITRA adds an **AI button** to that Soundbox, a paid add-on for Paytm for Business merchants. Press it and the Soundbox listens at the counter. When a customer asks for something the shop doesn't have ("Anna, mango lassi irukka?" / "Illa-mma"), MITRA logs that missed demand by itself, in any of India's 22 languages. It then tells the owner what to stock, how many, and what it will cost and earn, with money maths done by tested code. Since we have no live Paytm merchant ID, the app ships a **virtual Paytm Soundbox** and a clearly labelled **Paytm sandbox** so the whole loop works for the jury.

Loop (LEAP): **Listen** (Soundbox hears the ask) → **Evaluate** (code sizes a cautious trial) → **Approve** (owner only) → **Prove** (sold vs predicted, real profit).

Jury scoring: Innovation, Creativity, Working, Effective. "Working" matters most: every screen must do real work against the real backend.

## Rules that must not be broken

- Independent prototype. Never claim to be an official Paytm product or integration. Every sandbox surface says "sandbox / no real money".
- The LLM only reads language. Every rupee figure comes from `services/api/app/economics.py` (Decimal, golden tests).
- No raw audio and no transcript stored from Soundbox listening. Only item, count, reason. Owner must switch listening on and confirm a notice is displayed (audited).
- Never commit secrets. Keys live in `services/api/.env` (gitignored) and in Vercel env vars.
- Tests never call Sarvam (conftest sets `MITRA_AI_PROVIDER=none`; Soundbox tests monkeypatch `app.sarvam`).
- Demo persona: Joe Naren A, owner of நரேன் ஸ்டோர்ஸ் / Naren Stores, Velachery. Footer credit: "Made by RivenDevs".
- Fonts: Google Sans family or Apple system fonts only.

## What exists and works (verified)

**Backend** `services/api` (FastAPI, SQLAlchemy 2, Alembic, 42 tests passing on SQLite and PostgreSQL 17):
- Auth (httpOnly JWT cookie, bcrypt, lockout, logout-all), stores, members, roles, tenant isolation, audit log, idempotency, origin guard, security headers, Fernet-encrypted customer phones.
- LEAP: `/api/demand/extract`, `/api/demand`, `/api/opportunities` (+scenarios, explain), `/api/trials` (propose / owner-only approve / receive / outcome / supplier-message).
- Pre-orders (`/api/preorders`): UPI QR, Paytm link, pay later.
- Growth: sales + Paytm CSV import, insights (forecast with backtest, Monte Carlo cash runway, customer segments, health score), Ask MITRA, `/api/speak`.
- 22-language registry + detection: `app/langs.py`, `GET /api/languages`.
- **Sarvam AI is the primary provider** — `app/sarvam.py`:
  - `stt()` → `POST /speech-to-text`, `saaras:v3`, `mode=codemix` for Tanglish/Hinglish, max 30 s.
  - `generate()` → `POST /v1/chat/completions`, `sarvam-105b`, **`reasoning_effort: null` is required** (otherwise the model spends all tokens on hidden reasoning and returns empty content). Asks for JSON, extracts the first object, retries once.
  - `tts()` → `POST /text-to-speech`, `bulbul:v3`, speaker `kavitha`, returns base64 WAV in `audios[0]`.
  - Auth header `api-subscription-key`. Usage ledger table `ai_calls`, daily cap `MITRA_SARVAM_DAILY_CAP`.
  - Measured live: Tamil voice note → structured asks in 2.5 s; Hinglish text works.
- **Soundbox backend** — `app/soundbox.py`:
  - `POST /api/soundbox/listening` `{on, notice_displayed}` (owner only, audited).
  - `POST /api/soundbox/hear` (multipart `audio`, optional `language`) → STT → one chat call with `AMBIENT_SYSTEM` → guards → auto-logs `DemandRequest` rows with `source_type="soundbox_auto"` → returns `{heard, gloss, language, logged[], say}` where `say` is a line for the device to speak.
  - `GET /api/soundbox/feed?since=<iso>` → payments to announce.
- **Paytm sandbox** — `app/paytm.py` with `MITRA_PAYTM_ENV=sandbox`: same link body, signed with the official `paytmchecksum` library, link id `SBX…`, pay URL `/pay/<linkId>`. Public `GET/POST /api/pay/{link_id}` marks the pre-order paid and records a sale.

**Frontend** `apps/web` (Next.js 16, React 19, Tailwind 4):
- 3D story launch page `/` (React Three Fiber): Naren Stores built from a café model, walking couple with skeletal animation, truck delivery.
- Merchant app `/app/*`: Today, Missed demand (mic + 22-language picker), Opportunities, Trials, Pre-orders, Insights, Sales, Shelf scanner, Catalog, Ask MITRA, Activity, Store & team. Mobile checked at 375 px.
- New, committed, **not yet used by any page**: `lib/listener.ts` (always-on mic, cuts speech on silence, 16 kHz WAV per utterance) and `app/pay/[id]/page.tsx` (sandbox pay page).

**Other:** `pitch/` animated deck, `services/ml` offline model (laptop only, not deployed), `assets/blender` build scripts.

## What to build next (in this order)

### 1. Virtual Paytm Soundbox page — `apps/web/app/app/soundbox/page.tsx`
The centrepiece for the jury. Build it to look and behave like a real Paytm Soundbox with one extra **AI button**.
- A device drawn in CSS/SVG: dark rounded body, speaker grille, small display line, QR sticker, and a glowing **AI** button. No Paytm logo artwork; use the text "Soundbox (virtual)".
- AI button off → normal Soundbox: only announces payments.
- AI button on → first time shows a consent sheet ("A 'voice assistant in use' notice is displayed at my counter" checkbox) → `POST /api/soundbox/listening {on:true, notice_displayed:true}` → start `startListening()` from `lib/listener.ts`.
- For each segment: `POST /api/soundbox/hear` (FormData `audio`, `language`). Show a live timeline: "Heard: <gloss>", "Logged: Mango Lassi ×1 (not stocked)", "Soundbox said: <say>".
- Speak `say`: `POST /api/speak {text}` → play the WAV. Call `listener.pause(true)` while it plays so the device doesn't hear itself, then `pause(false)`.
- Poll `GET /api/soundbox/feed?since=…` every 4 s. For each payment: speak `say`, show "₹60 received (sandbox)", call `celebrate()` from `useApp()`.
- Level meter from `onLevel`, a red LIVE dot while listening, counters (asks logged today, payments announced).
- **"Play a sample customer" button** (labelled SAMPLE), for a noisy hall: fetch `/api/speak` with a short dialogue ("அண்ணா, மாம்பழ லஸ்ஸி இருக்கா? இல்லம்மா, நம்ம கடையில அது இல்ல."), then post that WAV blob to `/api/soundbox/hear`. Offer Tamil, Hindi and English samples.
- Language picker reusing `components/language-picker.tsx`.
- Pricing strip: "AI button: add-on for Paytm for Business merchants — ₹149/month (pilot hypothesis)". Mark it as a hypothesis.
- Add to nav in `components/app-shell.tsx` (key `nav_soundbox` in `lib/i18n.ts`, English "Soundbox", Tamil "சவுண்ட்பாக்ஸ்") and as the first tile on `app/app/page.tsx`. Put it in the mobile bottom bar in place of "Ideas".
- Requests that need the store header: read `localStorage.getItem("mitra.store")` and send `X-Store-Id` (see `app/app/ask/page.tsx`).

### 2. Pre-order sandbox link UI — `apps/web/app/app/preorders/page.tsx`
- When `pay_url` starts with `/pay/`, make it absolute with `new URL(pay_url, location.origin)`, show it as a **QR code** (the `UpiQr` component already renders QR) plus an "Open pay page" link, and label it "Paytm sandbox".
- Jury flow: create pre-order with method Paytm link → scan QR on a phone → tap Pay → the Soundbox page announces it.

### 3. Show Soundbox rows in the ledger
- In `app/app/demand/page.tsx`, badge rows with `source_type === "soundbox_auto"` as "heard by Soundbox" with a dismiss button (PATCH `/api/demand/{id}` `{status:"dismissed"}` already exists).

### 4. Deploy
- **Database:** create a free Postgres (Supabase or Neon). Run `alembic upgrade head` against it, then `python seed_demo.py`.
- **API on Vercel** (project root `services/api`): add `api/index.py` containing `from app.main import app`, and a `vercel.json` routing all paths to it. Env vars:
  `MITRA_DATABASE_URL` (use `postgresql+psycopg://…`), `MITRA_JWT_SECRET` (new random 48+ chars), `MITRA_COOKIE_SECURE=true`, `MITRA_DATA_KEY` (Fernet key), `MITRA_SARVAM_API_KEY`, `MITRA_PAYTM_ENV=sandbox`, `MITRA_CORS_ORIGINS=<web URL>`, `MITRA_AI_PROVIDER=sarvam`.
  Remove `mcp`, `pytest`, `ruff`, `uvicorn` from the deployed requirements if the bundle is too large.
- **Web on Vercel** (project root `apps/web`): env `MITRA_API_ORIGIN=<api URL>`. `next.config.ts` already proxies `/api/*` to it, so cookies stay first-party.
- The offline model (`services/ml`) does not deploy. Set stores to AI mode "auto".
- Shelf scanner needs a vision model (Gemini). Either set `GEMINI_API_KEY` on the API project or hide the Shelf nav item when `/api/integrations` reports no vision.
- After deploy: sign in as the demo owner on the live URL and run the full loop once.

### 5. Demo login for the jury
- `services/api/seed_demo.py` creates `demo.owner@mitra.test` (Joe Naren A) and `demo.staff@mitra.test`. Change it to read the password from env `DEMO_PASSWORD`, set that in the seed run, and give the owner the two emails plus the password privately. Do not print the password in commits or docs.

### 6. Final pass
- Update `README.md` (Sarvam, Soundbox AI button, sandbox, deploy steps) and `docs/DEMO_SCRIPT.md` (new 4-minute flow: Soundbox hears → recommendation spoken → approve → pre-order paid by QR → Soundbox announces → proof).
- Rebuild the deck (`pitch/build_deck.js` + `pitch/animate.py`) with a Soundbox slide.

## Checks to run before every commit

```bash
cd services/api && .venv/bin/python -m pytest -q && .venv/bin/ruff check app tests
```

```bash
cd apps/web && npx tsc --noEmit && npx eslint app components lib
```

## Run locally

```bash
./scripts/dev-api.sh
```

```bash
./scripts/dev-web.sh
```

Open http://localhost:3000. `services/api/.env` must contain `MITRA_SARVAM_API_KEY` and, for the sandbox, `MITRA_PAYTM_ENV=sandbox`.

## Known gaps (say these honestly if asked)

- Bulbul speaks 11 languages; the Soundbox voice lines exist in Tamil, Hindi and English only.
- Sandbox payments are simulated. With a live MID the same code path calls Paytm's staging API.
- People in the 3D story are built from downloaded models; check licences before making the repo public.
- App labels are Tamil and English; listening works in all 22 languages.
