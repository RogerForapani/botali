-- Keep pending station fuel choices private and close direct write paths that
-- bypass the validated edit RPC. The station owner can still add prices while
-- their own suggestion is pending.

begin;

drop policy if exists station_fuels_public_read on public.station_fuels;

create policy station_fuels_anon_verified_read on public.station_fuels
for select to anon
using (
  exists (
    select 1 from public.stations s
    where s.id = station_fuels.station_id and s.status = 'verified'
  )
);

create policy station_fuels_authenticated_scoped_read on public.station_fuels
for select to authenticated
using (
  exists (
    select 1 from public.stations s
    where s.id = station_fuels.station_id
      and (
        s.status = 'verified'
        or (s.status = 'pending' and s.created_by = (select auth.uid()))
        or (select private.is_moderator())
      )
  )
);

revoke insert on public.station_edit_requests, public.station_edit_votes from authenticated;

create unique index if not exists station_edit_requests_one_pending_profile_per_user
on public.station_edit_requests (station_id, user_id)
where status = 'pending' and field_name = 'station_profile';

create or replace function private.prepare_price_submission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  station_location extensions.geography(point, 4326);
  station_status text;
  station_creator uuid;
begin
  new.user_id := (select auth.uid());
  select trust_score into new.user_trust_score_snapshot
  from public.profiles
  where id = new.user_id;
  if new.user_trust_score_snapshot is null then raise exception 'Profile not found'; end if;

  select location, status, created_by
  into station_location, station_status, station_creator
  from public.stations where id = new.station_id;
  if not found
    or station_status = 'rejected'
    or (station_status = 'pending'
      and station_creator <> new.user_id
      and not (select private.is_moderator())) then
    raise exception 'Posto indisponível para contribuição';
  end if;

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
    new.distance_from_station_m := round(extensions.st_distance(new.submitted_location, station_location));
  else
    new.distance_from_station_m := null;
  end if;
  new.submitted_location := null;
  return new;
end;
$$;

commit;
