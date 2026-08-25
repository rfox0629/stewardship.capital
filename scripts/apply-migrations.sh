#!/usr/bin/env bash
# Applies the Spark migrations to the configured database, once each.
#
#   ./scripts/apply-migrations.sh          apply anything outstanding
#   ./scripts/apply-migrations.sh --dry    list what would run
#
# Tracked in supabase_migrations.schema_migrations, the same table the Supabase
# CLI uses, so this stays in step with the dashboard and with future CLI runs.
#
# Tracking is not decoration here: the tenancy migration creates policies, and
# `create policy` has no `if not exists`, so a blind re-run would fail halfway.
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/spark-db.sh"

DRY=false
[ "${1:-}" = "--dry" ] && DRY=true

echo "Connecting..."
server="$(spark_psql -tAc "select current_database()||' on '||split_part(version(),' ',2)")"
echo "  $server"
echo

spark_psql -q -c "
  create schema if not exists supabase_migrations;
  create table if not exists supabase_migrations.schema_migrations (
    version text primary key,
    name text,
    statements text[],
    inserted_at timestamptz default now()
  );" >/dev/null

applied_any=false
for file in "$(dirname "${BASH_SOURCE[0]}")"/../supabase/migrations/[0-9]*.sql; do
  base="$(basename "$file")"
  version="${base%%_*}"
  name="${base#*_}"; name="${name%.sql}"

  already="$(spark_psql -tAc "select 1 from supabase_migrations.schema_migrations where version='$version'")"
  if [ "$already" = "1" ]; then
    printf "  skip     %s (already applied)\n" "$base"
    continue
  fi

  if $DRY; then
    printf "  would run %s\n" "$base"
    continue
  fi

  printf "  applying %s ... " "$base"
  spark_psql -q -f "$file"
  spark_psql -q -c "insert into supabase_migrations.schema_migrations (version, name)
                    values ('$version', '$name') on conflict (version) do nothing" >/dev/null
  echo "ok"
  applied_any=true
done

echo
if $DRY; then
  echo "Dry run only. Nothing was applied."
elif $applied_any; then
  echo "Done. Verify with ./scripts/verify-production.sh"
else
  echo "Nothing outstanding."
fi
