grant insert on public.station_fuels to authenticated;

create policy station_fuels_creator_insert on public.station_fuels
for insert to authenticated
with check (
  exists (
    select 1 from public.stations
    where stations.id = station_fuels.station_id
      and stations.created_by = (select auth.uid())
      and stations.status = 'pending'
  )
);

create or replace function private.prevent_nearby_station_duplicate()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (
    select 1 from public.stations
    where status <> 'rejected'
      and extensions.st_dwithin(
        location,
        extensions.st_setsrid(extensions.st_makepoint(new.longitude, new.latitude), 4326)::extensions.geography,
        100
      )
  ) then
    raise exception 'Já existe um posto cadastrado a menos de 100 metros deste local';
  end if;
  return new;
end;
$$;

create trigger prevent_nearby_station_duplicate
before insert on public.stations
for each row execute function private.prevent_nearby_station_duplicate();
