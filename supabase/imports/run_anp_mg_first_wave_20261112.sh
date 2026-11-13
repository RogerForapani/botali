#!/usr/bin/env bash
set -euo pipefail
umask 077
root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
case "${1:-}" in
  migration) sql_file="${root}/supabase/migrations/202611120001_anp_station_origin.sql" ;;
  first_wave) sql_file="${root}/supabase/imports/anp_mg_first_wave_20_20261112.sql" ;;
  *) printf 'Expected migration or first_wave\n' >&2; exit 2 ;;
esac
ca_certificate="${HOME}/.postgresql/supabase-prod-ca.crt"
connection="host=db.phsvoeljsaksglqrpstm.supabase.co port=5432 dbname=postgres user=postgres sslmode=verify-full sslrootcert=${ca_certificate} connect_timeout=20"
IFS= read -r -s PGPASSWORD
PGPASSWORD="${PGPASSWORD%$'\r'}"
export PGPASSWORD
trap 'unset PGPASSWORD' EXIT
psql -X -q -A -t -v ON_ERROR_STOP=1 --dbname="${connection}" --file="${sql_file}"
