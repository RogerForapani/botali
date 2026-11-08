#!/usr/bin/env bash
set -euo pipefail

# Restore only the tables needed to compare a retention rehearsal's before and
# after snapshots. This does not replace a full Supabase recovery test.
if [[ $# -ne 2 ]]; then
  echo "Uso: $0 BACKUP_ANTES BACKUP_DEPOIS" >&2
  exit 2
fi

before_bundle="$(realpath "$1")"
after_bundle="$(realpath "$2")"
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
python3 "${script_dir}/verify_local_bundle.py" "$before_bundle" >/dev/null
python3 "${script_dir}/verify_local_bundle.py" "$after_bundle" >/dev/null

postgres_bin="$(pg_config --bindir)"
test_dir="$(mktemp -d /tmp/botali-retention-restore-XXXXXX)"
"${postgres_bin}/initdb" -D "${test_dir}/db" -A trust -U postgres --no-instructions >/dev/null
"${postgres_bin}/pg_ctl" -D "${test_dir}/db" -o "-k ${test_dir} -c listen_addresses=''" -l "${test_dir}/postgres.log" start >/dev/null
trap '"${postgres_bin}/pg_ctl" -D "${test_dir}/db" stop -m immediate >/dev/null; rm -rf -- "$test_dir"' EXIT

restore_tables() {
  local db="$1" bundle="$2" schema table
  createdb -h "$test_dir" -U postgres "$db"
  psql -X -q -v ON_ERROR_STOP=1 -h "$test_dir" -U postgres -d "$db" <<'SQL'
CREATE SCHEMA extensions;
CREATE SCHEMA private;
CREATE EXTENSION postgis WITH SCHEMA extensions;
CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
SQL
  for spec in \
    public.stations \
    public.price_submissions \
    private.community_contribution_events \
    private.data_retention_runs \
    private.station_price_monthly_stats; do
    schema="${spec%%.*}"
    table="${spec#*.}"
    pg_restore --exit-on-error --no-owner --no-acl --section=pre-data \
      --schema="$schema" --table="$table" -d "$db" -h "$test_dir" -U postgres \
      "$bundle/database.dump" >/dev/null
    pg_restore --exit-on-error --no-owner --no-acl --data-only \
      --schema="$schema" --table="$table" -d "$db" -h "$test_dir" -U postgres \
      "$bundle/database.dump" >/dev/null
  done
}

restore_tables before "$before_bundle"
restore_tables after "$after_bundle"

psql -X -q -v ON_ERROR_STOP=1 -h "$test_dir" -U postgres -d before <<'SQL'
DO $$ BEGIN
  IF (SELECT count(*) FROM public.stations) <> 10006
    OR (SELECT count(*) FROM public.price_submissions) <> 80015
    OR (SELECT count(*) FROM private.community_contribution_events) <> 90028
    OR (SELECT count(*) FROM private.data_retention_runs) <> 0
    OR (SELECT count(*) FROM private.station_price_monthly_stats) <> 0 THEN
    RAISE EXCEPTION 'O snapshot anterior diverge das contagens esperadas';
  END IF;
END $$;
SQL

psql -X -q -v ON_ERROR_STOP=1 -h "$test_dir" -U postgres -d after <<'SQL'
DO $$ BEGIN
  IF (SELECT count(*) FROM public.stations) <> 10006
    OR (SELECT count(*) FROM public.price_submissions) <> 80014
    OR (SELECT count(*) FROM private.community_contribution_events) <> 90028
    OR (SELECT count(*) FROM private.data_retention_runs) <> 1
    OR (SELECT count(*) FROM private.station_price_monthly_stats) <> 1 THEN
    RAISE EXCEPTION 'O snapshot posterior diverge das contagens esperadas';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM private.data_retention_runs
    WHERE result->>'mode' = 'applied'
      AND (result->>'price_submissions_to_archive')::int = 1
      AND (result->>'station_authors_to_anonymize')::int = 1
  ) THEN
    RAISE EXCEPTION 'O resumo da retenção não foi restaurado';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM private.station_price_monthly_stats
    WHERE reports = 1
  ) THEN
    RAISE EXCEPTION 'O agregado mensal não foi restaurado';
  END IF;
END $$;
SQL

before_events="$(psql -X -At -h "$test_dir" -U postgres -d before -c \
  "SELECT md5(string_agg(user_id::text || event_type || source_id::text || awarded_at::text, ',' ORDER BY user_id, event_type, source_id)) FROM private.community_contribution_events")"
after_events="$(psql -X -At -h "$test_dir" -U postgres -d after -c \
  "SELECT md5(string_agg(user_id::text || event_type || source_id::text || awarded_at::text, ',' ORDER BY user_id, event_type, source_id)) FROM private.community_contribution_events")"
[[ "$before_events" == "$after_events" ]] || { echo 'Eventos comunitários mudaram' >&2; exit 1; }

echo 'OK: snapshots restaurados em PostgreSQL local isolado; 80.015 -> 80.014 relatos; 90.028 eventos preservados; um agregado e uma execução de retenção.'
