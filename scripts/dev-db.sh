#!/usr/bin/env bash
# Optional: run a project-local PostgreSQL 17 on :5433 (data in services/api/.pgdata, gitignored).
# Then start the API with: MITRA_DATABASE_URL=postgresql+psycopg://mitra@127.0.0.1:5433/mitra ./scripts/dev-api.sh
# Requires: brew install postgresql@17
set -euo pipefail
PG=/opt/homebrew/opt/postgresql@17/bin
DATA="$(cd "$(dirname "$0")/../services/api" && pwd)/.pgdata"
export LC_ALL=en_US.UTF-8  # Postgres refuses to start on macOS with an unset locale ("postmaster became multithreaded")
if [ ! -d "$DATA" ]; then
  "$PG/initdb" -D "$DATA" -U mitra --auth=trust --encoding=UTF8 >/dev/null
  echo "listen_addresses = '127.0.0.1'" >> "$DATA/postgresql.conf"
fi
"$PG/pg_ctl" -D "$DATA" status >/dev/null 2>&1 || "$PG/pg_ctl" -D "$DATA" -o "-p 5433 -k /tmp" -l "$DATA/server.log" start
for db in mitra mitra_test; do "$PG/psql" -h 127.0.0.1 -p 5433 -U mitra -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$db'" | grep -q 1 || "$PG/createdb" -h 127.0.0.1 -p 5433 -U mitra "$db"; done
echo "PostgreSQL ready: postgresql+psycopg://mitra@127.0.0.1:5433/mitra (tests: .../mitra_test)"
