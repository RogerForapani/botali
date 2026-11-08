#!/usr/bin/env bash
set -euo pipefail
umask 077

# This runner is intentionally locked to the empty 31 October restore project.
target_ref="faidmhgkeltkgvyvackg"
backup_root="${HOME}/botali-backups"
bundle="${backup_root}/20261031-014648-homologacao-cE7l8h"
prep="${backup_root}/20261031-restore-prep-v5"
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
certificate="${HOME}/.postgresql/supabase-prod-ca.crt"

[[ -r "$certificate" ]] || { echo 'Certificado TLS ausente' >&2; exit 1; }
python3 "${script_dir}/verify_local_bundle.py" "$bundle" >/dev/null
(cd "$prep" && sha256sum -c PREP_SHA256SUMS >/dev/null)
[[ "$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["counts"]["price_submissions"])' "$bundle/source-verification.json")" == 80014 ]] || {
  echo 'Inventário da origem inesperado' >&2; exit 1;
}

printf 'Digite a senha do banco temporário (não será exibida): '
IFS= read -r -s PGPASSWORD
PGPASSWORD="${PGPASSWORD%$'\r'}"
printf '\n'
export PGPASSWORD
trap 'unset PGPASSWORD' EXIT

connection="host=db.${target_ref}.supabase.co port=5432 dbname=postgres user=postgres sslmode=verify-full sslrootcert=${certificate} connect_timeout=20"
psql -X -q -A -t -v ON_ERROR_STOP=1 --dbname="$connection" \
  -c 'select current_database()' | grep -qx postgres
psql -X -q -v ON_ERROR_STOP=1 --dbname="$connection" --file="$prep/preflight.sql" >/dev/null

printf 'Importando snapshot em uma transação...\n'
psql -X -q -v ON_ERROR_STOP=1 --single-transaction --dbname="$connection" \
  --file="$prep/app-pre-data.sql" \
  --file="$prep/migration-schema.sql" \
  --file="$prep/auth-instances.sql" \
  --file="$prep/auth-users.sql" \
  --file="$prep/auth-identities.sql" \
  --file="$prep/app-data-isolated.sql" \
  --file="$prep/storage-metadata.sql" \
  --file="$prep/migration-history.sql" \
  --file="$prep/app-post-data.sql" \
  --file="$prep/managed-custom.sql" \
  --file="$prep/postcheck.sql" \
  > "$prep/restore-output.log" 2> "$prep/restore-error.log"

# The source tables explicitly omit Supabase's default Dxtm privileges for
# client roles. pg_dump does not emit revokes of inherited default privileges.
psql -X -q -v ON_ERROR_STOP=1 --dbname="$connection" \
  -c 'revoke truncate, references, trigger, maintain on all tables in schema public from anon, authenticated' >/dev/null
canonical_acl="$(psql -X -q -A -t -v ON_ERROR_STOP=1 --dbname="$connection" \
  -c "select md5(string_agg(relname||'='||array_to_string(array(select x::text from unnest(relacl) x order by x::text),','),'|' order by relname)) from pg_class where relnamespace='public'::regnamespace and relkind='r'")"
[[ "$canonical_acl" == 'c92b62e3e07672e840da5b35db96c67c' ]] || {
  echo 'Permissões das tabelas divergem do backup' >&2; exit 2;
}

psql -X -q -A -t -v ON_ERROR_STOP=1 --single-transaction \
  --dbname="$connection" --file="$script_dir/verify_restored_database.sql" \
  > "$prep/target-verification.json"
python3 - "$bundle/source-verification.json" "$prep/target-verification.json" <<'PY'
import json
import sys
source = json.load(open(sys.argv[1], encoding='utf-8'))
target = json.load(open(sys.argv[2], encoding='utf-8'))
# relacl::text preserves array insertion order, which differs between the
# source and restore even when every grant is equivalent. The canonical ACL
# check above verifies all entries after sorting them.
source['table_privileges'].pop('acl_hash')
target['table_privileges'].pop('acl_hash')
differences = {
    key: {'source': source.get(key), 'target': target.get(key)}
    for key in source.keys() | target.keys()
    if key != 'checked_at' and source.get(key) != target.get(key)
}
if differences:
    print('Inventário restaurado requer conciliação: ' + ', '.join(sorted(differences)), file=sys.stderr)
    raise SystemExit(2)
print('Inventário restaurado confere com a origem, exceto pelo horário da verificação.')
PY
printf 'Banco restaurado no projeto isolado %s. Falta conferir o binário do Storage.\n' "$target_ref"
