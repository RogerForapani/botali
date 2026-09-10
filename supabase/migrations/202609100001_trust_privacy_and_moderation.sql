-- Sprint 1: consenso confiavel, privacidade e moderacao.

alter table public.stations
  add column if not exists brand_name_override text
  check (brand_name_override is null or char_length(trim(brand_name_override)) between 2 and 80);

-- Marcas sugeridas deixam de entrar automaticamente no catalogo global.
update public.stations s
set brand_name_override = b.name,
    brand_id = (select id from public.station_brands where name = 'Outra' limit 1)
from public.station_brands b
where s.brand_id = b.id
  and b.operator_name = 'Sugerida pela comunidade';

update public.station_brands
set active = false
where operator_name = 'Sugerida pela comunidade';

-- Postos pendentes ficam visiveis apenas para o autor e moderadores.
drop policy if exists stations_public_read on public.stations;
create policy stations_anon_verified_read on public.stations
for select to anon
using (status = 'verified');
create policy stations_authenticated_scoped_read on public.stations
for select to authenticated
using (
  status = 'verified'
  or created_by = (select auth.uid())
  or (select private.is_moderator())
);

-- Servicos relatados nao podem ser apresentados publicamente como confirmados.
drop policy if exists station_services_public_read on public.station_services;
create policy station_services_anon_confirmed_read on public.station_services
for select to anon
using (status = 'confirmed');
create policy station_services_authenticated_scoped_read on public.station_services
for select to authenticated
using (
  status = 'confirmed'
  or created_by = (select auth.uid())
  or (select private.is_moderator())
);

-- Dados brutos de contribuicoes deixam de ser publicos. O mapa usa a RPC
-- sanitizada community_prices_for_stations, definida abaixo.
drop policy if exists prices_public_read on public.price_submissions;
revoke select on public.price_submissions from anon, authenticated;
grant select on public.price_submissions to authenticated;
create policy prices_read_own_or_moderator on public.price_submissions
for select to authenticated
using (user_id = (select auth.uid()) or (select private.is_moderator()));

drop policy if exists price_confirmations_public_read on public.price_confirmations;
revoke select on public.price_confirmations from anon, authenticated;
revoke insert on public.price_confirmations from authenticated;
grant select on public.price_confirmations to authenticated;
create policy price_confirmations_read_own_or_moderator on public.price_confirmations
for select to authenticated
using (user_id = (select auth.uid()) or (select private.is_moderator()));

drop policy if exists profiles_public_read on public.profiles;
revoke select on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
create policy profiles_read_own_or_moderator on public.profiles
for select to authenticated
using (id = (select auth.uid()) or (select private.is_moderator()));

drop policy if exists reviews_public_read on public.station_reviews;
revoke select on public.station_reviews from anon, authenticated;
grant select on public.station_reviews to authenticated;
create policy reviews_read_own_or_moderator on public.station_reviews
for select to authenticated
using (user_id = (select auth.uid()) or (select private.is_moderator()));

drop policy if exists edit_requests_authenticated_read on public.station_edit_requests;
create policy edit_requests_read_own_or_moderator on public.station_edit_requests
for select to authenticated
using (user_id = (select auth.uid()) or (select private.is_moderator()));

drop policy if exists edit_votes_authenticated_read on public.station_edit_votes;
create policy edit_votes_read_own_or_moderator on public.station_edit_votes
for select to authenticated
using (user_id = (select auth.uid()) or (select private.is_moderator()));

-- Cadastro de posto passa obrigatoriamente pela transacao validada.
revoke insert on public.stations, public.station_fuels, public.station_services from authenticated;

create or replace function public.nearby_stations_v2(
  lat double precision,
  long double precision,
  radius_m integer default 10000
)
returns table (
  id uuid,
  name text,
  brand text,
  latitude double precision,
  longitude double precision,
  address text,
  distance_m double precision,
  status text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    s.id,
    s.name,
    coalesce(s.brand_name_override, b.name, 'Sem bandeira'),
    s.latitude,
    s.longitude,
    s.address,
    extensions.st_distance(
      s.location,
      extensions.st_point(long, lat)::extensions.geography
    ),
    s.status
  from public.stations s
  left join public.station_brands b on b.id = s.brand_id
  where s.status <> 'rejected'
    and extensions.st_dwithin(
      s.location,
      extensions.st_point(long, lat)::extensions.geography,
      least(greatest(radius_m, 100), 100000)
    )
  order by s.location operator(extensions.<->) extensions.st_point(long, lat)::extensions.geography;
$$;

revoke execute on function public.nearby_stations_v2(double precision, double precision, integer) from public;
grant execute on function public.nearby_stations_v2(double precision, double precision, integer) to anon, authenticated;

-- Um relato por usuario participa do consenso de cada posto/combustivel.
-- Confirmacoes tambem sao deduplicadas por usuario dentro do mesmo grupo de preco.
create or replace function public.community_prices_for_stations(target_station_ids uuid[])
returns table (
  station_id uuid,
  fuel_code text,
  price numeric,
  confidence integer,
  reports bigint,
  confirmations bigint,
  disagreements bigint,
  updated_at timestamptz,
  submission_id uuid
)
language sql
stable
security definer
set search_path = ''
as $$
  with visible_stations as (
    select s.id
    from public.stations s
    where s.id = any(coalesce(target_station_ids, '{}'::uuid[]))
      and (
        s.status = 'verified'
        or s.created_by = (select auth.uid())
        or (select private.is_moderator())
      )
    limit 500
  ),
  latest_reports as (
    select distinct on (p.station_id, p.fuel_type_id, p.user_id)
      p.id,
      p.station_id,
      p.fuel_type_id,
      p.user_id,
      round(p.price, 2) as normalized_price,
      least(100, p.user_trust_score_snapshot) as trust_score,
      p.created_at
    from public.price_submissions p
    join visible_stations vs on vs.id = p.station_id
    where p.created_at >= now() - interval '48 hours'
    order by p.station_id, p.fuel_type_id, p.user_id, p.created_at desc
  ),
  report_groups as (
    select
      station_id,
      fuel_type_id,
      normalized_price,
      count(*)::bigint as reports,
      sum(trust_score)::numeric as report_trust,
      max(created_at) as updated_at
    from latest_reports
    group by station_id, fuel_type_id, normalized_price
  ),
  representatives as (
    select distinct on (station_id, fuel_type_id, normalized_price)
      station_id, fuel_type_id, normalized_price, id as submission_id
    from latest_reports
    order by station_id, fuel_type_id, normalized_price, created_at desc
  ),
  latest_group_votes as (
    select distinct on (p.station_id, p.fuel_type_id, round(p.price, 2), c.user_id)
      p.station_id,
      p.fuel_type_id,
      round(p.price, 2) as normalized_price,
      c.user_id,
      c.agrees,
      c.created_at
    from public.price_confirmations c
    join public.price_submissions p on p.id = c.submission_id
    join visible_stations vs on vs.id = p.station_id
    where p.created_at >= now() - interval '48 hours'
      and not exists (
        select 1
        from latest_reports reporter
        where reporter.station_id = p.station_id
          and reporter.fuel_type_id = p.fuel_type_id
          and reporter.user_id = c.user_id
      )
    order by p.station_id, p.fuel_type_id, round(p.price, 2), c.user_id, c.created_at desc
  ),
  vote_groups as (
    select
      station_id,
      fuel_type_id,
      normalized_price,
      count(*) filter (where agrees)::bigint as confirmations,
      count(*) filter (where not agrees)::bigint as disagreements
    from latest_group_votes
    group by station_id, fuel_type_id, normalized_price
  ),
  scored as (
    select
      rg.*,
      coalesce(vg.confirmations, 0)::bigint as confirmations,
      coalesce(vg.disagreements, 0)::bigint as disagreements,
      rep.submission_id,
      rg.reports * 100
        + rg.report_trust * 0.25
        + coalesce(vg.confirmations, 0) * 30
        - coalesce(vg.disagreements, 0) * 40 as consensus_score
    from report_groups rg
    join representatives rep using (station_id, fuel_type_id, normalized_price)
    left join vote_groups vg using (station_id, fuel_type_id, normalized_price)
  ),
  ranked as (
    select scored.*,
      row_number() over (
        partition by station_id, fuel_type_id
        order by consensus_score desc, updated_at desc
      ) as position
    from scored
  )
  select
    ranked.station_id,
    ft.code,
    ranked.normalized_price,
    round(least(99, greatest(
      10,
      20
        + ln(1 + ranked.reports) * 18
        + (ranked.report_trust / greatest(ranked.reports, 1)) * 0.35
        + ranked.confirmations * 4
        - ranked.disagreements * 7
    )))::integer,
    ranked.reports,
    ranked.confirmations,
    ranked.disagreements,
    ranked.updated_at,
    ranked.submission_id
  from ranked
  join public.fuel_types ft on ft.id = ranked.fuel_type_id
  where ranked.position = 1;
$$;

revoke execute on function public.community_prices_for_stations(uuid[]) from public;
grant execute on function public.community_prices_for_stations(uuid[]) to anon, authenticated;

-- Confirmacao presencial: o autor nao confirma o proprio relato e precos antigos
-- nao recebem novos votos.
create or replace function public.confirm_price_at_station(
  submission_id uuid,
  lat double precision,
  long double precision,
  agrees boolean default true
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_station_id uuid;
  submission_user_id uuid;
  submission_fuel_type_id uuid;
  submission_created_at timestamptz;
  visit_distance integer;
  current_trust integer;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;

  select station_id, user_id, fuel_type_id, created_at
  into target_station_id, submission_user_id, submission_fuel_type_id, submission_created_at
  from public.price_submissions
  where id = submission_id;

  if target_station_id is null then raise exception 'Price submission not found'; end if;
  if submission_user_id = (select auth.uid()) then raise exception 'Você não pode confirmar o próprio relato'; end if;
  if submission_created_at < now() - interval '48 hours' then raise exception 'Este preço já está desatualizado'; end if;
  if exists (
    select 1 from public.price_submissions
    where station_id = target_station_id
      and fuel_type_id = submission_fuel_type_id
      and user_id = (select auth.uid())
      and created_at >= now() - interval '48 hours'
  ) then
    raise exception 'Seu próprio relato já conta para este combustível';
  end if;

  visit_distance := private.distance_to_station(target_station_id, lat, long);
  if visit_distance is null then raise exception 'Station not found'; end if;
  if visit_distance > 200 then raise exception 'Você precisa estar a até 200 metros do posto'; end if;

  select trust_score into current_trust
  from public.profiles
  where id = (select auth.uid());

  insert into public.price_confirmations (submission_id, user_id, agrees, trust_score_snapshot)
  values (submission_id, (select auth.uid()), agrees, coalesce(current_trust, 0))
  on conflict (submission_id, user_id) do update
    set agrees = excluded.agrees,
        trust_score_snapshot = excluded.trust_score_snapshot,
        created_at = now();

  perform private.record_station_visit(target_station_id, visit_distance);
  return visit_distance;
end;
$$;

-- O dia da visita segue o fuso do produto, nao a virada UTC do servidor.
create or replace function private.record_station_visit(target_station_id uuid, visit_distance_m integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.station_visits (station_id, user_id, visited_on, distance_m)
  values (
    target_station_id,
    (select auth.uid()),
    (now() at time zone 'America/Sao_Paulo')::date,
    visit_distance_m
  )
  on conflict (station_id, user_id, visited_on)
  do update set distance_m = least(public.station_visits.distance_m, excluded.distance_m);
end;
$$;

-- Estatisticas publicas so aparecem com pelo menos tres visitas no dia.
create or replace function public.station_visit_counts(target_station_id uuid, days integer default 30)
returns table (visit_date date, visits bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select visited_on, count(*)
  from public.station_visits
  where station_id = target_station_id
    and visited_on >= (now() at time zone 'America/Sao_Paulo')::date - least(greatest(days, 1), 90)
  group by visited_on
  having count(*) >= 3
  order by visited_on desc;
$$;

-- Auditoria das decisoes de moderacao.
create table if not exists public.station_moderation_actions (
  id uuid primary key default extensions.gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  moderator_id uuid not null references public.profiles(id),
  decision text not null check (decision in ('verified', 'rejected')),
  reason text check (reason is null or char_length(reason) <= 500),
  created_at timestamptz not null default now()
);

alter table public.station_moderation_actions enable row level security;
revoke all on public.station_moderation_actions from anon, authenticated;
grant select on public.station_moderation_actions to authenticated;
create policy moderation_actions_moderator_read on public.station_moderation_actions
for select to authenticated
using ((select private.is_moderator()));

create or replace function public.moderate_station(
  target_station_id uuid,
  decision text,
  reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_moderator()) then raise exception 'Moderator access required'; end if;
  if decision not in ('verified', 'rejected') then raise exception 'Invalid moderation decision'; end if;

  update public.stations
  set status = decision
  where id = target_station_id and status = 'pending';

  if not found then raise exception 'Pending station not found'; end if;

  update public.station_services
  set status = case when decision = 'verified' then 'confirmed' else 'rejected' end
  where station_id = target_station_id and status = 'reported';

  insert into public.station_moderation_actions (station_id, moderator_id, decision, reason)
  values (target_station_id, (select auth.uid()), decision, nullif(trim(reason), ''));
end;
$$;

revoke execute on function public.moderate_station(uuid, text, text) from public, anon;
grant execute on function public.moderate_station(uuid, text, text) to authenticated;

-- Bandeiras personalizadas ficam vinculadas ao posto, sem poluir o catalogo.
create or replace function public.create_station_suggestion(
  station_name text,
  brand_name text,
  station_address text,
  station_neighborhood text,
  station_city text,
  station_state text,
  station_postal_code text,
  lat double precision,
  long double precision,
  fuel_codes text[],
  service_codes text[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  creator_id uuid := (select auth.uid());
  selected_brand_id uuid;
  custom_brand_name text;
  new_station_id uuid;
begin
  if creator_id is null then raise exception 'Authentication required'; end if;
  if char_length(trim(station_name)) < 2 then raise exception 'Informe o nome do posto'; end if;
  if trim(station_address) = '' or trim(station_city) = '' or char_length(trim(station_state)) <> 2 then
    raise exception 'Informe endereço, cidade e UF';
  end if;
  if lat not between -90 and 90 or long not between -180 and 180 then raise exception 'Localização inválida'; end if;
  if char_length(trim(brand_name)) not between 2 and 80 then raise exception 'Informe uma bandeira válida'; end if;
  if coalesce(cardinality(fuel_codes), 0) = 0
    and not coalesce(service_codes, '{}'::text[]) && array['recarga_ac', 'recarga_dc'] then
    raise exception 'Selecione ao menos um combustível ou tipo de recarga';
  end if;

  select id into selected_brand_id
  from public.station_brands
  where lower(name) = lower(trim(brand_name)) and active
  limit 1;

  if selected_brand_id is null then
    select id into selected_brand_id from public.station_brands where name = 'Outra' limit 1;
    custom_brand_name := trim(brand_name);
  end if;

  insert into public.stations (
    name, brand_id, brand_name_override, address, neighborhood, city, state,
    postal_code, latitude, longitude, status, created_by
  ) values (
    trim(station_name), selected_brand_id, custom_brand_name, trim(station_address),
    nullif(trim(station_neighborhood), ''), trim(station_city), upper(trim(station_state)),
    nullif(trim(station_postal_code), ''), lat, long, 'pending', creator_id
  ) returning id into new_station_id;

  insert into public.station_fuels (station_id, fuel_type_id)
  select new_station_id, id
  from public.fuel_types
  where active and code = any(coalesce(fuel_codes, '{}'::text[]));

  insert into public.station_services (station_id, service_id, status, created_by)
  select new_station_id, id, 'reported', creator_id
  from public.services
  where active and code = any(coalesce(service_codes, '{}'::text[]));

  return new_station_id;
end;
$$;
