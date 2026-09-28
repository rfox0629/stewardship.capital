#!/usr/bin/env bash
# Proves the shared request limiter (public.take_request_slot) against a real
# PostgreSQL: the counting, the permissions, and that concurrent callers, the
# way separate server instances call it, never get more than the limit.
#
#   ./scripts/verify-throttle.sh
#
# Throwaway cluster, like verify-rls.sh. Nothing touches a real database.
set -euo pipefail

export LC_ALL=C LANG=C
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/spark-throttle-XXXXXX")"
PORT="${SPARK_THROTTLE_PORT:-55434}"

cleanup() {
  pg_ctl -D "$WORK/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

command -v initdb >/dev/null || { echo "PostgreSQL is required (brew install postgresql@17)"; exit 1; }

initdb -U postgres -A trust --locale=C "$WORK/data" >/dev/null
pg_ctl -D "$WORK/data" -o "-p $PORT -k $WORK -c listen_addresses=''" -l "$WORK/log" -w start >/dev/null

psql() { command psql -h "$WORK" -p "$PORT" -U postgres -v ON_ERROR_STOP=1 "$@"; }

psql -q -d postgres -c "create database spark" >/dev/null
psql -q -d spark -f "$ROOT/tests/rls/00-supabase-stub.sql" >/dev/null
psql -q -d spark -f "$ROOT/supabase/migrations/20260926100000_request_throttle.sql" >/dev/null

output=$(psql -q -d spark -X -A -t -f "$ROOT/tests/throttle/assertions.sql" 2>&1 | sed 's/^psql:[^:]*:[0-9]*: NOTICE:  //')

# Twenty callers at once, each its own connection, against a limit of five.
key=$(printf 'd%.0s' $(seq 1 64))
for _ in $(seq 1 20); do
  psql -d spark -X -A -t -c "set role service_role; select public.take_request_slot('t:race', '$key', 5, 900);" &
done > "$WORK/race" 2>&1
wait
granted=$(grep -c '^t$' "$WORK/race" || true)
if [ "$granted" = "5" ]; then
  output="$output"$'\n'"PASS | twenty concurrent callers, limit five: five granted"
else
  output="$output"$'\n'"FAIL | twenty concurrent callers, limit five: $granted granted"
fi

echo "$output"
if echo "$output" | grep -q "FAIL"; then
  echo
  echo "Throttle assertions failed."
  exit 1
fi
