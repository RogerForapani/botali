#!/usr/bin/env bash
set -euo pipefail
umask 077

# Restore the downloaded offsite snapshot in a disposable, socket-only
# PostgreSQL. Supabase Auth and Storage services are not emulated here.
bundle="${1:?Uso: restore_offsite_bundle_local.sh PACOTE PASTA_NOVA}"
out_dir="${2:?Uso: restore_offsite_bundle_local.sh PACOTE PASTA_NOVA}"
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
expected_versions="$(find "$script_dir/../migrations" -maxdepth 1 -name '*.sql' -printf '%f\n' | cut -d_ -f1 | sort | paste -sd, -)"
actual_versions="$(psql "${db[@]}" -A -t -c "select string_agg(version, ',' order by version) from supabase_migrations.schema_migrations")"
[[ "$actual_versions" == "$expected_versions" ]] || {
  echo 'Histórico restaurado não coincide com os arquivos do repositório' >&2; exit 2;
}
psql "${db[@]}" -A -t > "$out_dir/local-verification.json" <<'SQL'
select json_build_object(
  'profiles', (select count(*) from public.profiles),
  'stations', (select count(*) from public.stations),
  'price_submissions', (select count(*) from public.price_submissions),
  'contribution_events', (select count(*) from private.community_contribution_events),
  'public_tables_with_rls', (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r' and c.relrowsecurity),
  'history_count', (select count(*) from supabase_migrations.schema_migrations),
  'latest_migration', (select max(version) from supabase_migrations.schema_migrations),
  'stations_near_bh', (select count(*) from public.stations s where extensions.st_dwithin(
    s.location, extensions.st_setsrid(extensions.st_makepoint(-43.94, -19.92), 4326)::extensions.geography, 100000))
);
SQL
python3 - "$bundle/source-verification.json" "$out_dir/local-verification.json" <<'PY'
import json
import sys
source = json.load(open(sys.argv[1], encoding='utf-8'))
restored = json.load(open(sys.argv[2], encoding='utf-8'))
for name in ('profiles', 'stations', 'price_submissions'):
    if restored[name] != source['counts'][name]:
        raise SystemExit(f'Contagem restaurada divergente: {name}')
if (restored['history_count'] != 28 or restored['latest_migration'] != source['latest_migration']
        or restored['public_tables_with_rls'] != source['public_tables_with_rls']
        or restored['contribution_events'] < 1 or restored['stations_near_bh'] < 1):
    raise SystemExit('Histórico, RLS, contribuições ou busca geográfica divergem')
print('Restauro local passou: ' + str(restored['stations']) + ' postos, '
      + str(restored['price_submissions']) + ' preços, '
      + str(restored['contribution_events']) + ' eventos, 28 migrações e PostGIS operacional.')
PY
