#!/usr/bin/env bash
set -euo pipefail
umask 077

# Import a verified snapshot only into a newly created, empty Supabase project.
# Keep the Data API, OAuth providers and outbound notifications disabled.
target_ref="${1:?Uso: restore_isolated_drill.sh PROJECT_REF PREP_DIR BUNDLE_DIR}"
prep="${2:?Falta a pasta de preparacao}"
bundle="${3:?Falta o pacote verificado}"
[[ "$target_ref" =~ ^[a-z]{20}$ && "$target_ref" != phsvoeljsaksglqrpstm ]] || {
  echo 'Identificador de projeto de teste invalido' >&2; exit 1;
}
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
certificate="${HOME}/.postgresql/supabase-prod-ca.crt"
[[ -r "$certificate" ]] || { echo 'Certificado TLS ausente' >&2; exit 1; }
python3 "$script_dir/verify_local_bundle.py" "$bundle" >/dev/null
(cd "$prep" && sha256sum -c PREP_SHA256SUMS >/dev/null)

printf 'Senha do banco temporario (nao sera exibida): '
IFS= read -r -s PGPASSWORD
PGPASSWORD="${PGPASSWORD%$'\r'}"
printf '\n'
[[ -n "$PGPASSWORD" ]] || { echo 'Senha vazia' >&2; exit 1; }
export PGPASSWORD
trap 'unset PGPASSWORD' EXIT

connection="host=db.${target_ref}.supabase.co port=5432 dbname=postgres user=postgres sslmode=verify-full sslrootcert=${certificate} connect_timeout=20"
psql -X -q -A -t -v ON_ERROR_STOP=1 --dbname="$connection" -c 'select current_database()' | grep -qx postgres

# Stop before any setup if the destination already has app or user data.
psql -X -q -v ON_ERROR_STOP=1 --dbname="$connection" <<'SQL'
do $empty$
begin
  if to_regclass('public.stations') is not null
     or to_regclass('supabase_migrations.schema_migrations') is not null
     or (select count(*) from auth.users) <> 0
     or (select count(*) from storage.buckets) <> 0
     or (select count(*) from storage.objects) <> 0 then
    raise exception 'Projeto de teste nao esta vazio';
  end if;
end $empty$;
SQL

psql -X -q -v ON_ERROR_STOP=1 --single-transaction --dbname="$connection" <<'SQL'
create schema if not exists private;
create schema if not exists supabase_migrations;
create extension if not exists postgis with schema extensions;
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema extensions;
SQL
psql -X -q -v ON_ERROR_STOP=1 --dbname="$connection" \
  --file="$prep/postgres-default-privileges.sql" \
  --file="$prep/preflight.sql" >/dev/null

started="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
start_epoch="$(date +%s)"
printf 'Importando snapshot no projeto isolado...\n'
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

# Supabase defaults can add privileges not present in the source snapshot.
psql -X -q -v ON_ERROR_STOP=1 --dbname="$connection" \
  -c 'revoke truncate, references, trigger, maintain on all tables in schema public from anon, authenticated' >/dev/null
canonical_acl="$(psql -X -q -A -t -v ON_ERROR_STOP=1 --dbname="$connection" \
  -c "select md5(string_agg(relname||'='||array_to_string(array(select x::text from unnest(relacl) x order by x::text),','),'|' order by relname)) from pg_class where relnamespace='public'::regnamespace and relkind='r'")"
[[ "$canonical_acl" == 'c92b62e3e07672e840da5b35db96c67c' ]] || {
  echo 'Permissoes das tabelas divergem do backup; mantenha a Data API desligada' >&2; exit 2;
}
psql -X -q -A -t -v ON_ERROR_STOP=1 --single-transaction \
  --dbname="$connection" --file="$script_dir/verify_restored_database.sql" \
  > "$prep/target-verification.json"
python3 - "$bundle/source-verification.json" "$prep/target-verification.json" <<'PY'
import json
import sys

source = json.load(open(sys.argv[1], encoding='utf-8'))
target = json.load(open(sys.argv[2], encoding='utf-8'))
source['table_privileges'].pop('acl_hash')
target['table_privileges'].pop('acl_hash')
differences = {
    key: {'source': source.get(key), 'target': target.get(key)}
    for key in source.keys() | target.keys()
    if key != 'checked_at' and source.get(key) != target.get(key)
}
if differences:
    print('Inventario divergente: ' + ', '.join(sorted(differences)), file=sys.stderr)
    raise SystemExit(2)
print('Inventario restaurado confere com a origem.')
PY
end_epoch="$(date +%s)"
printf '{"target_ref":"%s","started_utc":"%s","database_restore_seconds":%s,"database_verified":true}\n' \
  "$target_ref" "$started" "$((end_epoch-start_epoch))" \
  > "$prep/remote-drill-result.json"
printf 'Banco de teste restaurado e conferido em %s s. Storage e aplicativo ainda precisam de ensaio.\n' "$((end_epoch-start_epoch))"
