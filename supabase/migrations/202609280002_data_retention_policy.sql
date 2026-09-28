-- Politica de retencao e minimizacao de dados.
-- A rotina fica disponivel para execucao administrativa, mas nao e agendada
-- automaticamente enquanto o projeto nao tiver homologacao e backup restauravel.

create table if not exists private.station_visit_daily_totals (
  station_id uuid not null references public.stations(id) on delete cascade,
  visited_on date not null,
  visits bigint not null check (visits >= 0),
  minimum_distance_m integer,
  archived_at timestamptz not null default now(),
  primary key (station_id, visited_on)
);

create table if not exists private.station_price_monthly_stats (
  station_id uuid not null references public.stations(id) on delete cascade,
  fuel_type_id uuid not null references public.fuel_types(id),
  month date not null,
  reports bigint not null check (reports >= 0),
  price_sum numeric not null,
  minimum_price numeric(6,3) not null,
  maximum_price numeric(6,3) not null,
  last_price numeric(6,3) not null,
  last_reported_at timestamptz not null,
  archived_at timestamptz not null default now(),
  primary key (station_id, fuel_type_id, month)
);

create table if not exists private.station_confirmation_monthly_stats (
  station_id uuid not null references public.stations(id) on delete cascade,
  fuel_type_id uuid not null references public.fuel_types(id),
  month date not null,
  confirmations bigint not null check (confirmations >= 0),
  disagreements bigint not null check (disagreements >= 0),
  archived_at timestamptz not null default now(),
  primary key (station_id, fuel_type_id, month)
);

create table if not exists private.data_retention_runs (
  id bigint generated always as identity primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  result jsonb not null default '{}'::jsonb
);

revoke all on private.station_visit_daily_totals from public, anon, authenticated;
revoke all on private.station_price_monthly_stats from public, anon, authenticated;
revoke all on private.station_confirmation_monthly_stats from public, anon, authenticated;
revoke all on private.data_retention_runs from public, anon, authenticated;

-- Correcoes resolvidas permanecem como trilha sem vinculo com o autor depois
-- de 24 meses. A exclusao de conta passa a anonimizar a solicitacao.
alter table public.station_edit_requests alter column user_id drop not null;
alter table public.station_edit_requests drop constraint if exists station_edit_requests_user_id_fkey;
alter table public.station_edit_requests
  add constraint station_edit_requests_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete set null;

-- A coordenada exata serve somente para calcular a distancia e nunca e persistida.
create or replace function private.prepare_price_submission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare station_location extensions.geography(point, 4326);
begin
  new.user_id := (select auth.uid());
  select trust_score into new.user_trust_score_snapshot
  from public.profiles
  where id = new.user_id;

  if new.user_trust_score_snapshot is null then raise exception 'Profile not found'; end if;
  if exists (
    select 1 from public.price_submissions
    where user_id = new.user_id
      and station_id = new.station_id
      and fuel_type_id = new.fuel_type_id
      and created_at > now() - interval '5 minutes'
  ) then
    raise exception 'Aguarde antes de enviar outro preço para este combustível';
  end if;

  if new.submitted_location is not null then
    select location into station_location
    from public.stations
    where id = new.station_id;
    new.distance_from_station_m := round(extensions.st_distance(new.submitted_location, station_location));
  else
    new.distance_from_station_m := null;
  end if;

  new.submitted_location := null;
  return new;
end;
$$;

-- Limpa qualquer coordenada legada; a distancia aproximada ja calculada permanece.
update public.price_submissions
set submitted_location = null
where submitted_location is not null;

create or replace function private.apply_data_retention(apply_changes boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  run_id bigint;
  run_result jsonb;
  visits_count bigint;
  confirmations_count bigint;
  prices_count bigint;
  reviews_count bigint;
  reputation_count bigint;
  votes_count bigint;
  edits_count bigint;
  stations_count bigint;
  services_count bigint;
  moderation_count bigint;
  edit_moderation_count bigint;
  aggregates_count bigint;
begin
  select count(*) into visits_count
  from public.station_visits
  where visited_on < (now() at time zone 'America/Sao_Paulo')::date - 90;

  select count(*) into confirmations_count
  from public.price_confirmations
  where created_at < now() - interval '180 days';

  select count(*) into prices_count
  from public.price_submissions p
  where p.created_at < now() - interval '24 months'
    and exists (
      select 1 from public.price_submissions newer
      where newer.station_id = p.station_id
        and newer.fuel_type_id = p.fuel_type_id
        and (newer.created_at, newer.id) > (p.created_at, p.id)
    );

  select count(*) into reviews_count
  from public.station_reviews
  where comment is not null and updated_at < now() - interval '12 months';

  select count(*) into reputation_count
  from public.user_reputation_events
  where created_at < now() - interval '24 months';

  select count(*) into votes_count
  from public.station_edit_votes
  where created_at < now() - interval '24 months';

  select count(*) into edits_count
  from public.station_edit_requests
  where status <> 'pending'
    and resolved_at < now() - interval '24 months'
    and (user_id is not null or old_value <> '{}'::jsonb or new_value <> '{}'::jsonb);

  select count(*) into stations_count
  from public.stations
  where created_by is not null
    and created_at < now() - case when status = 'rejected' then interval '12 months' else interval '24 months' end;

  select count(*) into services_count
  from public.station_services
  where created_by is not null and created_at < now() - interval '24 months';

  select count(*) into moderation_count
  from public.station_moderation_actions
  where created_at < now() - interval '24 months'
    and (moderator_id is not null or reason is not null);

  select count(*) into edit_moderation_count
  from public.station_edit_moderation_actions
  where created_at < now() - interval '24 months'
    and (moderator_id is not null or reason is not null);

  select
    (select count(*) from private.station_visit_daily_totals where visited_on < current_date - interval '36 months')
    + (select count(*) from private.station_price_monthly_stats where month < date_trunc('month', current_date) - interval '36 months')
    + (select count(*) from private.station_confirmation_monthly_stats where month < date_trunc('month', current_date) - interval '36 months')
  into aggregates_count;

  run_result := jsonb_build_object(
    'mode', case when apply_changes then 'applied' else 'dry-run' end,
    'observed_at', now(),
    'station_visits_older_than_90_days', visits_count,
    'price_confirmations_older_than_180_days', confirmations_count,
    'price_submissions_to_archive', prices_count,
    'review_comments_to_remove', reviews_count,
    'reputation_events_to_remove', reputation_count,
    'edit_votes_to_remove', votes_count,
    'resolved_edits_to_anonymize', edits_count,
    'station_authors_to_anonymize', stations_count,
    'service_authors_to_anonymize', services_count,
    'station_moderation_actions_to_anonymize', moderation_count,
    'edit_moderation_actions_to_anonymize', edit_moderation_count,
    'aggregates_older_than_36_months', aggregates_count
  );

  if not apply_changes then return run_result; end if;

  insert into private.data_retention_runs default values returning id into run_id;

  with deleted as (
    delete from public.station_visits
    where visited_on < (now() at time zone 'America/Sao_Paulo')::date - 90
    returning station_id, visited_on, distance_m
  ), grouped as (
    select station_id, visited_on, count(*)::bigint as visits, min(distance_m)::integer as minimum_distance_m
    from deleted
    group by station_id, visited_on
  )
  insert into private.station_visit_daily_totals (station_id, visited_on, visits, minimum_distance_m)
  select station_id, visited_on, visits, minimum_distance_m from grouped
  on conflict (station_id, visited_on) do update
  set visits = private.station_visit_daily_totals.visits + excluded.visits,
      minimum_distance_m = least(private.station_visit_daily_totals.minimum_distance_m, excluded.minimum_distance_m),
      archived_at = now();

  with deleted as (
    delete from public.price_confirmations c
    where c.created_at < now() - interval '180 days'
    returning c.submission_id, c.agrees, c.created_at
  ), grouped as (
    select
      p.station_id,
      p.fuel_type_id,
      date_trunc('month', d.created_at)::date as month,
      count(*) filter (where d.agrees)::bigint as confirmations,
      count(*) filter (where not d.agrees)::bigint as disagreements
    from deleted d
    join public.price_submissions p on p.id = d.submission_id
    group by p.station_id, p.fuel_type_id, date_trunc('month', d.created_at)::date
  )
  insert into private.station_confirmation_monthly_stats (
    station_id, fuel_type_id, month, confirmations, disagreements
  )
  select station_id, fuel_type_id, month, confirmations, disagreements from grouped
  on conflict (station_id, fuel_type_id, month) do update
  set confirmations = private.station_confirmation_monthly_stats.confirmations + excluded.confirmations,
      disagreements = private.station_confirmation_monthly_stats.disagreements + excluded.disagreements,
      archived_at = now();

  with deleted as (
    delete from public.price_submissions p
    where p.created_at < now() - interval '24 months'
      and exists (
        select 1 from public.price_submissions newer
        where newer.station_id = p.station_id
          and newer.fuel_type_id = p.fuel_type_id
          and (newer.created_at, newer.id) > (p.created_at, p.id)
      )
    returning p.station_id, p.fuel_type_id, p.price, p.created_at
  ), grouped as (
    select
      station_id,
      fuel_type_id,
      date_trunc('month', created_at)::date as month,
      count(*)::bigint as reports,
      sum(price) as price_sum,
      min(price)::numeric(6,3) as minimum_price,
      max(price)::numeric(6,3) as maximum_price,
      (array_agg(price order by created_at desc))[1]::numeric(6,3) as last_price,
      max(created_at) as last_reported_at
    from deleted
    group by station_id, fuel_type_id, date_trunc('month', created_at)::date
  )
  insert into private.station_price_monthly_stats (
    station_id, fuel_type_id, month, reports, price_sum, minimum_price,
    maximum_price, last_price, last_reported_at
  )
  select
    station_id, fuel_type_id, month, reports, price_sum, minimum_price,
    maximum_price, last_price, last_reported_at
  from grouped
  on conflict (station_id, fuel_type_id, month) do update
  set reports = private.station_price_monthly_stats.reports + excluded.reports,
      price_sum = private.station_price_monthly_stats.price_sum + excluded.price_sum,
      minimum_price = least(private.station_price_monthly_stats.minimum_price, excluded.minimum_price),
      maximum_price = greatest(private.station_price_monthly_stats.maximum_price, excluded.maximum_price),
      last_price = case
        when excluded.last_reported_at > private.station_price_monthly_stats.last_reported_at then excluded.last_price
        else private.station_price_monthly_stats.last_price
      end,
      last_reported_at = greatest(private.station_price_monthly_stats.last_reported_at, excluded.last_reported_at),
      archived_at = now();

  update public.station_reviews
  set comment = null
  where comment is not null and updated_at < now() - interval '12 months';

  delete from public.user_reputation_events where created_at < now() - interval '24 months';
  delete from public.station_edit_votes where created_at < now() - interval '24 months';

  update public.station_edit_requests
  set user_id = null, old_value = '{}'::jsonb, new_value = '{}'::jsonb
  where status <> 'pending' and resolved_at < now() - interval '24 months';

  update public.stations
  set created_by = null
  where created_by is not null
    and created_at < now() - case when status = 'rejected' then interval '12 months' else interval '24 months' end;

  update public.station_services
  set created_by = null
  where created_by is not null and created_at < now() - interval '24 months';

  update public.station_moderation_actions
  set moderator_id = null, reason = null
  where created_at < now() - interval '24 months';

  update public.station_edit_moderation_actions
  set moderator_id = null, reason = null
  where created_at < now() - interval '24 months';

  delete from private.station_visit_daily_totals
  where visited_on < current_date - interval '36 months';
  delete from private.station_price_monthly_stats
  where month < date_trunc('month', current_date) - interval '36 months';
  delete from private.station_confirmation_monthly_stats
  where month < date_trunc('month', current_date) - interval '36 months';
  delete from private.data_retention_runs
  where started_at < now() - interval '12 months';

  update private.data_retention_runs
  set finished_at = now(), result = run_result
  where id = run_id;

  return run_result;
end;
$$;

revoke execute on function private.apply_data_retention(boolean) from public, anon, authenticated;
