#!/usr/bin/env bash
# Proves the Spark access model against the real database and the real app.
#
# Builds, starts the production server on a port of its own, and drives it over
# HTTP with genuine Supabase identities. Nothing is stubbed: the schema is
# production's, the proxy is the one that ships, and the invitations are rows.
#
# Everything it creates is removed afterwards. The SHINE seed is left alone.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PORT="${SPARK_TEST_PORT:-3100}"
export SPARK_BASE_URL="http://127.0.0.1:$PORT"
LOG="$(mktemp -t spark-auth-server)"

if [ ! -f "$ROOT/.env.local" ]; then
  echo "Missing .env.local." >&2
  exit 1
fi

SERVER_PID=""
cleanup() {
  if [ -n "$SERVER_PID" ]; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  rm -f "$LOG"
}
trap cleanup EXIT

if lsof -ti ":$PORT" >/dev/null 2>&1; then
  echo "Port $PORT is already in use. Set SPARK_TEST_PORT and try again." >&2
  exit 1
fi

echo "Building..."
npm run build >/dev/null 2>&1 || { echo "build failed"; npm run build; exit 1; }

echo "Starting the production server on $PORT..."
npx next start -p "$PORT" >"$LOG" 2>&1 &
SERVER_PID=$!

for _ in $(seq 1 60); do
  if curl -sf -o /dev/null "$SPARK_BASE_URL/spark"; then break; fi
  sleep 0.5
done

if ! curl -sf -o /dev/null "$SPARK_BASE_URL/spark"; then
  echo "The server never came up:" >&2
  cat "$LOG" >&2
  exit 1
fi
echo "  ready"
echo

node --env-file-if-exists=.env.local --test tests/e2e/spark-access.test.ts
STATUS=$?

echo
echo "Server log, for anything the assertions did not catch:"
grep -iE "error|unhandled|warn" "$LOG" | grep -v "punycode" | head -10 || echo "  nothing"

exit $STATUS
