-- Mantem o ultimo preco conhecido visivel, mas separa claramente dados
-- sem atualizacao da janela confiavel de cinco dias.

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
    where p.created_at >= now() - interval '5 days'
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
    where p.created_at >= now() - interval '5 days'
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
  ),
  latest_known as (
    select distinct on (p.station_id, p.fuel_type_id)
      p.station_id,
      p.fuel_type_id,
      round(p.price, 2) as normalized_price,
      p.created_at
    from public.price_submissions p
    join visible_stations vs on vs.id = p.station_id
    where not exists (
      select 1 from latest_reports recent
      where recent.station_id = p.station_id
        and recent.fuel_type_id = p.fuel_type_id
    )
    order by p.station_id, p.fuel_type_id, p.created_at desc
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
  where ranked.position = 1

  union all

  select
    latest_known.station_id,
    ft.code,
    latest_known.normalized_price,
    10,
    1::bigint,
    0::bigint,
    0::bigint,
    latest_known.created_at,
    null::uuid
  from latest_known
  join public.fuel_types ft on ft.id = latest_known.fuel_type_id;
$$;

revoke execute on function public.community_prices_for_stations(uuid[]) from public;
grant execute on function public.community_prices_for_stations(uuid[]) to anon, authenticated;

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
  if submission_created_at < now() - interval '5 days' then raise exception 'Este preço está há mais de 5 dias sem atualização'; end if;
  if exists (
    select 1 from public.price_submissions
    where station_id = target_station_id
      and fuel_type_id = submission_fuel_type_id
      and user_id = (select auth.uid())
      and created_at >= now() - interval '5 days'
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

revoke execute on function public.confirm_price_at_station(uuid, double precision, double precision, boolean) from public, anon;
grant execute on function public.confirm_price_at_station(uuid, double precision, double precision, boolean) to authenticated;
