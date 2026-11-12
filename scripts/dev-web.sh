#!/usr/bin/env bash
# Start the MITRA web app on :3000 (proxies /api to :8000).
set -euo pipefail
cd "$(dirname "$0")/../apps/web"
[ -d node_modules ] || npm install
exec npm run dev -- --port "${PORT:-3000}"
