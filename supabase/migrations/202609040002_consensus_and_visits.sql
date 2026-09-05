create table public.station_visits (
  id uuid primary key default extensions.gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  visited_on date not null default current_date,
  distance_m integer not null check (distance_m between 0 and 200),
  created_at timestamptz not null default now(),
  unique (station_id, user_id, visited_on)
);
create index station_visits_daily_idx on public.station_visits (station_id, visited_on desc);

alter table public.station_visits enable row level security;
revoke all on public.station_visits from anon, authenticated;
grant select on public.station_visits to authenticated;
create policy station_visits_read_own on public.station_visits for select to authenticated
using ((select auth.uid()) = user_id);

create or replace function private.distance_to_station(target_station_id uuid, lat double precision, long double precision)
returns integer language sql stable security definer set search_path = '' as $$
  select round(extensions.st_distance(
    s.location,
    extensions.st_point(long, lat)::extensions.geography
  ))::integer
  from public.stations s
  where s.id = target_station_id and s.status <> 'rejected';
$$;

create or replace function private.record_station_visit(target_station_id uuid, visit_distance_m integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.station_visits (station_id, user_id, distance_m)
  values (target_station_id, (select auth.uid()), visit_distance_m)
  on conflict (station_id, user_id, visited_on)
  do update set distance_m = least(public.station_visits.distance_m, excluded.distance_m);
end;
$$;

create or replace function public.check_in_station(station_id uuid, lat double precision, long double precision)
returns integer language plpgsql security definer set search_path = '' as $$
declare visit_distance integer;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  visit_distance := private.distance_to_station(station_id, lat, long);
  if visit_distance is null then raise exception 'Station not found'; end if;
  if visit_distance > 200 then raise exception 'Você precisa estar a até 200 metros do posto'; end if;
  perform private.record_station_visit(station_id, visit_distance);
  return visit_distance;
end;
$$;

create or replace function public.confirm_price_at_station(submission_id uuid, lat double precision, long double precision, agrees boolean default true)
returns integer language plpgsql security definer set search_path = '' as $$
declare target_station_id uuid;
declare visit_distance integer;
declare current_trust integer;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  select station_id into target_station_id from public.price_submissions where id = submission_id;
  if target_station_id is null then raise exception 'Price submission not found'; end if;
  visit_distance := private.distance_to_station(target_station_id, lat, long);
  if visit_distance > 200 then raise exception 'Você precisa estar a até 200 metros do posto'; end if;
  select trust_score into current_trust from public.profiles where id = (select auth.uid());
  insert into public.price_confirmations (submission_id, user_id, agrees, trust_score_snapshot)
  values (submission_id, (select auth.uid()), agrees, coalesce(current_trust, 0))
  on conflict (submission_id, user_id) do update
    set agrees = excluded.agrees, trust_score_snapshot = excluded.trust_score_snapshot, created_at = now();
  perform private.record_station_visit(target_station_id, visit_distance);
  return visit_distance;
end;
$$;

create or replace function public.station_visit_counts(target_station_id uuid, days integer default 30)
returns table (visit_date date, visits bigint)
language sql stable security definer set search_path = '' as $$
  select visited_on, count(*)
  from public.station_visits
  where station_id = target_station_id
    and visited_on >= current_date - least(greatest(days, 1), 90)
  group by visited_on
  order by visited_on desc;
$$;

revoke execute on function private.distance_to_station(uuid, double precision, double precision) from public, anon, authenticated;
revoke execute on function private.record_station_visit(uuid, integer) from public, anon, authenticated;
revoke execute on function public.check_in_station(uuid, double precision, double precision) from public;
revoke execute on function public.confirm_price_at_station(uuid, double precision, double precision, boolean) from public;
revoke execute on function public.station_visit_counts(uuid, integer) from public;
grant execute on function public.check_in_station(uuid, double precision, double precision) to authenticated;
grant execute on function public.confirm_price_at_station(uuid, double precision, double precision, boolean) to authenticated;
grant execute on function public.station_visit_counts(uuid, integer) to anon, authenticated;
