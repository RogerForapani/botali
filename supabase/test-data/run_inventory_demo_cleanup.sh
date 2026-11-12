#!/usr/bin/env bash
set -euo pipefail
umask 077

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
case "${1:-inventory}" in
  inventory) query_file="inventory_demo_cleanup.sql" ;;
  verify) query_file="verify_demo_cleanup.sql" ;;
  anp_match) query_file="existing_stations_for_anp_match.sql" ;;
  icobe) query_file="inventory_two_icobe_test_stations.sql" ;;
  anp_catalog) query_file="anp_catalog_readonly.sql" ;;
  anp_verify) query_file="../imports/verify_anp_mg_first_wave_20261112.sql" ;;
  *) printf 'Unknown read-only query\n' >&2; exit 2 ;;
esac
ca_certificate="${HOME}/.postgresql/supabase-prod-ca.crt"
connection="host=db.phsvoeljsaksglqrpstm.supabase.co port=5432 dbname=postgres user=postgres sslmode=verify-full sslrootcert=${ca_certificate} connect_timeout=20"

IFS= read -r -s PGPASSWORD
PGPASSWORD="${PGPASSWORD%$'\r'}"
export PGPASSWORD
trap 'unset PGPASSWORD' EXIT

psql -X -q -A -t -v ON_ERROR_STOP=1 --dbname="${connection}" \
  --file="${script_dir}/${query_file}"
