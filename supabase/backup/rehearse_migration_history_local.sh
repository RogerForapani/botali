#!/usr/bin/env bash
set -euo pipefail
umask 077

# Restore the application snapshot in a disposable, socket-only PostgreSQL and
# repair only its migration ledger. This does not emulate Supabase services.
bundle="${1:?Uso: rehearse_migration_history_local.sh PACOTE PASTA_NOVA}"
out_dir="${2:?Uso: rehearse_migration_history_local.sh PACOTE PASTA_NOVA}"
[[ ! -e "$out_dir" ]] || { echo 'A pasta de resultado já existe' >&2; exit 1; }
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
python3 "$script_dir/verify_local_bundle.py" "$bundle" >/dev/null
install -d -m 700 "$out_dir"
out_dir="$(realpath "$out_dir")"
postgres_bin="$(pg_config --bindir)"
"${postgres_bin}/initdb" -D "$out_dir/cluster" -A trust -U postgres --no-instructions > "$out_dir/initdb.log"
"${postgres_bin}/pg_ctl" -D "$out_dir/cluster" -o "-k $out_dir -c listen_addresses=''" \
  -l "$out_dir/postgres.log" start > "$out_dir/start.log"
trap '"${postgres_bin}/pg_ctl" -D "$out_dir/cluster" stop -m immediate >/dev/null' EXIT
createdb -h "$out_dir" -U postgres botali_rehearsal
db=( -X -q -v ON_ERROR_STOP=1 -h "$out_dir" -U postgres -d botali_rehearsal )

psql "${db[@]}" <<'SQL'
create role anon noinherit;
create role authenticated noinherit;
create role service_role noinherit;
create schema auth;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
create function auth.uid() returns uuid language sql stable as $$select null::uuid$$;
create schema storage;
create table storage.buckets (id text primary key, name text not null, public boolean not null default false);
create table storage.objects (id uuid primary key, bucket_id text, name text);
create function storage.foldername(path text) returns text[] language sql immutable
  as $$select string_to_array(path, '/')$$;
create function storage.extension(path text) returns text language sql immutable
  as $$select split_part(path, '.', 2)$$;
create schema vault;
create table vault.secrets (id uuid primary key default gen_random_uuid(), name text unique, secret text);
create view vault.decrypted_secrets as select id, name, secret as decrypted_secret from vault.secrets;
create function vault.create_secret(secret text, name text) returns uuid language plpgsql as $$
declare new_id uuid;
begin
  insert into vault.secrets(name, secret) values (name, secret) returning id into new_id;
  return new_id;
end $$;
create schema net;
create function net.http_post(url text, headers jsonb, body jsonb, timeout_milliseconds integer)
  returns bigint language sql as $$select 0::bigint$$;
create schema private;
create schema extensions;
create extension postgis with schema extensions;
create extension pgcrypto with schema extensions;
create schema supabase_migrations;
SQL

dump="$bundle/database.dump"
pg_restore --exit-on-error --no-owner --no-acl --section=pre-data \
  --schema=public --schema=private -h "$out_dir" -U postgres -d botali_rehearsal "$dump" \
  > "$out_dir/app-pre-data.log" 2>&1
pg_restore --exit-on-error --no-owner --no-acl --data-only \
  --schema=public --schema=private -h "$out_dir" -U postgres -d botali_rehearsal "$dump" \
  > "$out_dir/app-data.log" 2>&1
psql "${db[@]}" -c 'insert into auth.users(id) select id from public.profiles' >/dev/null
pg_restore --exit-on-error --no-owner --no-acl --section=post-data \
  --schema=public --schema=private -h "$out_dir" -U postgres -d botali_rehearsal "$dump" \
  > "$out_dir/app-post-data.log" 2>&1

pg_restore --list "$dump" | grep -E ' (TABLE|TABLE DATA|CONSTRAINT) supabase_migrations schema_migrations ' \
  > "$out_dir/migration-history.list"
[[ "$(wc -l < "$out_dir/migration-history.list")" == 3 ]] || {
  echo 'Inventário do histórico inesperado' >&2; exit 2;
}
pg_restore --exit-on-error --no-owner --no-acl --use-list="$out_dir/migration-history.list" \
  -h "$out_dir" -U postgres -d botali_rehearsal "$dump" > "$out_dir/history-import.log" 2>&1
psql "${db[@]}" -A -t -c 'select string_agg(version, '"'"','"'"' order by version) from supabase_migrations.schema_migrations' \
  > "$out_dir/history-before.txt"
[[ "$(cat "$out_dir/history-before.txt")" == '202610070001,202610070002,202610070003' ]] || {
  echo 'Histórico inicial diferente das três versões auditadas' >&2; exit 2;
}
before="$(psql "${db[@]}" -A -t -c "select (select count(*) from public.stations), (select count(*) from public.price_submissions), (select count(*) from private.community_contribution_events)")"
python3 "$script_dir/prepare_migration_history_repair.py" > "$out_dir/repair-history.sql"
psql "${db[@]}" --file="$out_dir/repair-history.sql" > "$out_dir/repair-result.txt"
after="$(psql "${db[@]}" -A -t -c "select (select count(*) from public.stations), (select count(*) from public.price_submissions), (select count(*) from private.community_contribution_events)")"
[[ "$before" == "$after" ]] || { echo 'Dados do aplicativo mudaram durante o reparo' >&2; exit 2; }
[[ "$(psql "${db[@]}" -A -t -c 'select count(*) from supabase_migrations.schema_migrations')" == 28 ]] || {
  echo 'Histórico reparado não contém 28 versões' >&2; exit 2;
}
expected_versions="$(find "$script_dir/../migrations" -maxdepth 1 -name '*.sql' -printf '%f\n' | cut -d_ -f1 | sort | paste -sd, -)"
actual_versions="$(psql "${db[@]}" -A -t -c "select string_agg(version, ',' order by version) from supabase_migrations.schema_migrations")"
[[ "$actual_versions" == "$expected_versions" ]] || {
  echo 'Histórico reparado não coincide com os arquivos do repositório' >&2; exit 2;
}
printf 'Ensaio local passou: 3 para 28 versões; contagens do aplicativo preservadas (%s).\n' "$after"
