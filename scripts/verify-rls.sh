#!/usr/bin/env bash
# Proves the Spark row level security policies against a real Postgres.
#
#   ./scripts/verify-rls.sh
#
# Spins up a throwaway PostgreSQL cluster, stands in for the parts of Supabase
# the migrations rely on, applies every Spark migration in order, seeds two
# client tenants, and asserts what each role can actually see and change.
#
# Method note: row level security filters UPDATE and DELETE silently rather
# than raising, so "no error" is not "refused". Every assertion measures rows
# visible or rows affected.
set -euo pipefail

export LC_ALL=C LANG=C
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="${TMPDIR:-/tmp}/spark-rls-$$"
PORT="${SPARK_RLS_PORT:-55433}"

cleanup() {
  pg_ctl -D "$WORK/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

command -v initdb >/dev/null || { echo "PostgreSQL is required (brew install postgresql@17)"; exit 1; }

mkdir -p "$WORK"
initdb -U postgres -A trust --locale=C "$WORK/data" >/dev/null
pg_ctl -D "$WORK/data" -o "-p $PORT -k $WORK -c listen_addresses=''" -l "$WORK/log" -w start >/dev/null

psql() { command psql -h "$WORK" -p "$PORT" -U postgres -v ON_ERROR_STOP=1 "$@"; }

psql -q -d postgres -c "create database spark" >/dev/null
psql -q -d spark -f "$ROOT/tests/rls/00-supabase-stub.sql" >/dev/null

for migration in "$ROOT"/supabase/migrations/20260824*.sql; do
  psql -q -d spark -f "$migration" >/dev/null
  echo "  applied $(basename "$migration")"
done

psql -q -d spark -f "$ROOT/tests/rls/10-tenants.sql" >/dev/null
echo

output=$(psql -d spark -X -A -F' | ' -f "$ROOT/tests/rls/20-assertions.sql")
echo "$output"

if echo "$output" | grep -q "^FAIL"; then
  echo
  echo "Row level security assertions failed."
  exit 1
fi
