#!/usr/bin/env bash
# Start MITRA-Lite (offline model) on 127.0.0.1:8090. Needs services/ml/models (see services/ml/README.md).
set -euo pipefail
cd "$(dirname "$0")/../services/ml"
exec .venv/bin/uvicorn server:app --host 127.0.0.1 --port "${PORT:-8090}"
