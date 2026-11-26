#!/usr/bin/env bash
set -euo pipefail
umask 077

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ca_certificate="${HOME}/.postgresql/supabase-prod-ca.crt"
connection="host=db.phsvoeljsaksglqrpstm.supabase.co port=5432 dbname=postgres user=postgres sslmode=verify-full sslrootcert=${ca_certificate} connect_timeout=20"

IFS= read -r -s PGPASSWORD
PGPASSWORD="${PGPASSWORD%$'\r'}"
export PGPASSWORD
trap 'unset PGPASSWORD' EXIT

psql -X -q -A -t -v ON_ERROR_STOP=1 --dbname="${connection}" \
  --file="${script_dir}/remove_all_homologation_test_stations_20261111.sql"
