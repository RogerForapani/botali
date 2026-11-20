#!/usr/bin/env bash
set -euo pipefail

cluster_dir="${1:?Usage: run_security_profile_avatar_storage_local.sh AUDIT_OUTPUT_DIR}"
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
postgres_bin="$(pg_config --bindir)"

"${postgres_bin}/pg_ctl" -D "$cluster_dir/cluster" \
  -o "-k $cluster_dir -c listen_addresses=''" \
  -l "$cluster_dir/test-postgres.log" start >/dev/null
trap '"${postgres_bin}/pg_ctl" -D "$cluster_dir/cluster" stop -m immediate >/dev/null' EXIT

psql -X -v ON_ERROR_STOP=1 -h "$cluster_dir" -U postgres -d botali_migrations \
  -f "$script_dir/security_profile_avatar_storage.sql"
