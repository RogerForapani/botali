#!/usr/bin/env bash
set -euo pipefail

# Teste local isolado da migração, sem acesso ao Supabase nem à rede.
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
postgres_bin="$(pg_config --bindir)"
test_dir="$(mktemp -d /tmp/botali-progression-XXXXXX)"
"${postgres_bin}/initdb" -D "${test_dir}/db" -A trust -U postgres --no-instructions >/dev/null
"${postgres_bin}/pg_ctl" -D "${test_dir}/db" -o "-k ${test_dir} -c listen_addresses=''" -l "${test_dir}/postgres.log" start >/dev/null
trap '"${postgres_bin}/pg_ctl" -D "${test_dir}/db" stop -m immediate >/dev/null' EXIT

psql -X -q -v ON_ERROR_STOP=1 -h "${test_dir}" -U postgres -d postgres <<'SQL'
create role anon;
create role authenticated;
create schema private;
create schema auth;
create function auth.uid() returns uuid language sql stable as
  $$select nullif(current_setting('app.test_uid', true), '')::uuid$$;
create table public.profiles (
  id uuid primary key, display_name text, avatar_url text,
  profile_is_public boolean, trust_score integer
);
create table public.price_submissions (
  id uuid primary key, user_id uuid, created_at timestamptz not null
);
create table public.price_confirmations (
  submission_id uuid, user_id uuid, agrees boolean, created_at timestamptz not null
);
create table public.stations (
  id uuid primary key, created_by uuid, status text, created_at timestamptz not null
);
create table public.station_edit_requests (
  id uuid primary key, user_id uuid, status text,
  created_at timestamptz not null, resolved_at timestamptz
);
create table public.community_badges (
  id text, title text, description text, icon_name text,
  accent_color text, sort_order integer
);
create table public.user_community_badges (
  user_id uuid, badge_id text, awarded_at timestamptz
);
insert into public.profiles values
  ('11111111-1111-1111-1111-111111111111', 'Autor', null, false, 50),
  ('22222222-2222-2222-2222-222222222222', 'Confirmador', null, false, 50);
insert into public.price_submissions values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', now());
insert into public.price_confirmations values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', true, now());
insert into public.stations values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'verified', now());
insert into public.station_edit_requests values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'approved', now(), now());
SQL

psql -X -q -v ON_ERROR_STOP=1 -h "${test_dir}" -U postgres -d postgres \
  -f "${script_dir}/../migrations/202610290001_preserve_community_contributions.sql"
psql -X -q -v ON_ERROR_STOP=1 -h "${test_dir}" -U postgres -d postgres \
  -f "${script_dir}/../migrations/202610290001_preserve_community_contributions.sql"

psql -X -q -v ON_ERROR_STOP=1 -h "${test_dir}" -U postgres -d postgres <<'SQL'
set app.test_uid = '11111111-1111-1111-1111-111111111111';
do $$
declare points bigint;
begin
  select contribution_points into points from public.my_community_profile();
  if points <> 25 then raise exception 'Pontuação inicial: %, esperado 25', points; end if;
  if (select count(*) from private.community_contribution_events) <> 5 then
    raise exception 'Backfill duplicou ou perdeu eventos';
  end if;
end;
$$;
delete from public.price_confirmations;
delete from public.price_submissions;
delete from public.stations;
delete from public.station_edit_requests;
do $$
declare points bigint;
begin
  select contribution_points into points from public.my_community_profile();
  if points <> 25 then raise exception 'Pontuação caiu após remover dados antigos: %', points; end if;
end;
$$;
insert into public.price_submissions values
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', now());
do $$
begin
  if (select count(*) from private.community_contribution_events where event_type = 'price_report') <> 2 then
    raise exception 'Gatilho não registrou novo preço';
  end if;
end;
$$;
SQL

printf 'OK: migração repetível; pontos preservados após remoção dos registros; novo evento registrado\n'
