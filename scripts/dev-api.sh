#!/usr/bin/env bash
# Start the MITRA API on :8000 (uses services/api/.venv). GEMINI_API_KEY enables AI; without it MITRA runs rules-only.
set -euo pipefail
cd "$(dirname "$0")/../services/api"
[ -d .venv ] || { uv venv --python 3.12 .venv && uv pip install --python .venv/bin/python -r requirements.txt; }
.venv/bin/alembic upgrade head
exec .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port "${PORT:-8000}" --reload
