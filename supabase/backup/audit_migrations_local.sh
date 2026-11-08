#!/usr/bin/env bash
set -euo pipefail
umask 077

# Replays the repository's SQL history in a disposable, socket-only PostgreSQL.
# Managed Supabase schemas are minimal local stubs, not a Supabase replacement.
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_dir="$(cd -- "${script_dir}/../.." && pwd)"
out_dir="${1:?Uso: audit_migrations_local.sh PASTA_NOVA_DE_RESULTADO}"
[[ ! -e "$out_dir" ]] || { echo 'A pasta de resultado já existe' >&2; exit 1; }
install -d -m 700 "$out_dir"
out_dir="$(realpath "$out_dir")"
postgres_bin="$(pg_config --bindir)"
"${postgres_bin}/initdb" -D "$out_dir/cluster" -A trust -U postgres --no-instructions > "$out_dir/initdb.log"
"${postgres_bin}/pg_ctl" -D "$out_dir/cluster" -o "-k $out_dir -c listen_addresses=''" \
  -l "$out_dir/postgres.log" start > "$out_dir/start.log"
trap '"${postgres_bin}/pg_ctl" -D "$out_dir/cluster" stop -m immediate >/dev/null' EXIT
createdb -h "$out_dir" -U postgres botali_migrations

psql -X -q -v ON_ERROR_STOP=1 -h "$out_dir" -U postgres -d botali_migrations <<'SQL'
create role anon noinherit;
create role authenticated noinherit;
create role service_role noinherit;
create schema auth;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
create function auth.uid() returns uuid language sql stable as $$select null::uuid$$;
create schema storage;
create table storage.buckets (
  id text primary key, name text not null, public boolean not null default false,
  file_size_limit bigint, allowed_mime_types text[]
);
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
create schema extensions;
create extension postgis with schema extensions;
create extension pgcrypto with schema extensions;
SQL

: > "$out_dir/results.tsv"
for migration in "$repo_dir"/supabase/migrations/*.sql; do
  name="$(basename "$migration")"
  input="$migration"
  if [[ "$name" == 202610070003_price_alert_dispatch_request.sql ]]; then
    # pg_net is Supabase-managed and unavailable in this local cluster. Its
    # only effect here is replaced by the no-op net.http_post stub above.
    sed '/^create extension if not exists pg_net with schema extensions;$/d' \
      "$migration" > "$out_dir/pg_net_migration_local.sql"
    input="$out_dir/pg_net_migration_local.sql"
  fi
  if psql -X -q -v ON_ERROR_STOP=1 --single-transaction -h "$out_dir" \
    -U postgres -d botali_migrations -f "$input" \
    > "$out_dir/migration-output.log" 2> "$out_dir/migration-error.log"; then
    printf '%s\tOK\n' "$name" >> "$out_dir/results.tsv"
  else
    printf '%s\tFAILED\n' "$name" >> "$out_dir/results.tsv"
    echo "Migração local falhou: $name; ver $out_dir/migration-error.log" >&2
    exit 2
  fi
done

pg_dump -s -n public -n private --no-owner --no-acl -h "$out_dir" \
  -U postgres -d botali_migrations -f "$out_dir/candidate-schema.sql"
pg_dump -Fc -s -n public -n private --no-owner --no-acl -h "$out_dir" \
  -U postgres -d botali_migrations -f "$out_dir/candidate-schema.dump"
pg_restore --list "$out_dir/candidate-schema.dump" > "$out_dir/candidate-objects.txt"
printf 'Sequência local aplicada: %s migrações\n' "$(wc -l < "$out_dir/results.tsv")"
printf 'Resultado: %s\n' "$out_dir"
