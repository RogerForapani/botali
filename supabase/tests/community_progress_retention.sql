-- Execute somente em um PostgreSQL local descartavel: psql -v ON_ERROR_STOP=1 -f este_arquivo.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
end $$;
create schema auth;
create schema private;
create schema extensions;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create table public.profiles (
  id uuid primary key, display_name text, avatar_url text,
  profile_is_public boolean not null default false, trust_score integer not null default 100
);
create table public.price_submissions (
  id uuid primary key, user_id uuid not null references public.profiles(id), created_at timestamptz not null default now()
);
create table public.price_confirmations (
  submission_id uuid not null references public.price_submissions(id) on delete cascade,
  user_id uuid not null references public.profiles(id), agrees boolean not null,
  created_at timestamptz not null default now(), primary key (submission_id, user_id)
);
create table public.stations (
  id uuid primary key, created_by uuid references public.profiles(id),
  status text not null, created_at timestamptz not null default now()
);
create table public.station_edit_requests (
  id uuid primary key, user_id uuid references public.profiles(id),
  status text not null, created_at timestamptz not null default now(), resolved_at timestamptz
);
create table public.community_badges (
  id text primary key, title text, description text, icon_name text,
  accent_color text, sort_order integer
);
create table public.user_community_badges (
  user_id uuid references public.profiles(id), badge_id text references public.community_badges(id),
  awarded_at timestamptz not null default now()
);
insert into public.community_badges values
  ('first-validated-price', 'Preços confirmados', 'Três preços', 'check', '#22C55E', 1),
  ('community-checker', 'Confirmações', 'Vinte confirmações', 'check', '#22C55E', 2),
  ('station-scout', 'Postos', 'Dois postos', 'check', '#22C55E', 3),
  ('trusted-editor', 'Correções', 'Três correções', 'check', '#22C55E', 4);

insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-000000000001', 'A'),
  ('00000000-0000-0000-0000-000000000002', 'B');
insert into public.price_submissions (id, user_id) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002');
insert into public.price_confirmations (submission_id, user_id, agrees) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', true),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', true),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', true),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', false);
insert into public.stations (id, created_by, status) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'verified');
insert into public.station_edit_requests (id, user_id, status) values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'approved');

\ir ../migrations/202610270001_preserve_community_progress.sql

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
do $$ begin
  if (select contribution_points from public.my_community_profile()) <> 36 then
    raise exception 'Backfill perdeu pontuacao';
  end if;
  if (select jsonb_array_length(badges) from public.my_community_profile()) <> 1 then
    raise exception 'Badge de tres relatos validados ausente';
  end if;
end $$;

-- Simula a limpeza: confirmações e relatos saem; autores antigos são anonimizados.
delete from public.price_confirmations;
delete from public.price_submissions;
update public.stations set created_by = null;
update public.station_edit_requests set user_id = null;
do $$ begin
  if (select contribution_points from public.my_community_profile()) <> 36 then
    raise exception 'Retencao reduziu pontos conquistados';
  end if;
  if (select jsonb_array_length(badges) from public.my_community_profile()) <> 1 then
    raise exception 'Retencao removeu badge conquistado';
  end if;
end $$;

-- Novas contribuições continuam sendo contabilizadas sem duplicar validações.
insert into public.price_submissions (id, user_id) values
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001');
insert into public.price_confirmations (submission_id, user_id, agrees) values
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002', true);
update public.price_confirmations set agrees = true
where submission_id = '10000000-0000-0000-0000-000000000005';
do $$ begin
  if (select contribution_points from public.my_community_profile()) <> 41 then
    raise exception 'Novo preco validado nao somou cinco pontos';
  end if;
end $$;

delete from public.price_submissions;
delete from public.profiles where id = '00000000-0000-0000-0000-000000000001';
do $$ begin
  if exists (select 1 from private.community_contribution_events
    where user_id = '00000000-0000-0000-0000-000000000001') then
    raise exception 'Exclusao da conta preservou eventos pessoais';
  end if;
end $$;
