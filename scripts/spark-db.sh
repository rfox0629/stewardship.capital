#!/usr/bin/env bash
# Shared connection handling for the Spark database scripts.
#
# Reads SPARK_DATABASE_URL from .env.local, which is gitignored. The URL is
# never printed: it carries the database password, and a script that echoes
# its own connection string will eventually paste it into a log.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ ! -f "$ROOT/.env.local" ]; then
  echo "Missing .env.local. Create it and set SPARK_DATABASE_URL." >&2
  exit 1
fi

# Only pull the keys we need, so nothing else in the file is exported.
SPARK_DATABASE_URL="$(grep -E '^SPARK_DATABASE_URL=' "$ROOT/.env.local" | head -1 | cut -d= -f2-)"

if [ -z "${SPARK_DATABASE_URL:-}" ]; then
  echo "SPARK_DATABASE_URL is blank in .env.local." >&2
  echo "Supabase dashboard -> Project Settings -> Database -> Connection string -> URI" >&2
  echo "Use the session pooler on 5432 or the direct connection, not 6543." >&2
  exit 1
fi

export SPARK_DATABASE_URL

# psql wrapper. Quiet, stops on first error, never echoes the URL.
spark_psql() {
  psql "$SPARK_DATABASE_URL" -v ON_ERROR_STOP=1 "$@"
}
