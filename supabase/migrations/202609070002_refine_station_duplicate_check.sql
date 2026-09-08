create or replace function private.prevent_nearby_station_duplicate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.stations
    where status <> 'rejected'
      and lower(regexp_replace(trim(name), '[^[:alnum:]]+', '', 'g')) =
          lower(regexp_replace(trim(new.name), '[^[:alnum:]]+', '', 'g'))
      and extensions.st_dwithin(
        location,
        extensions.st_setsrid(
          extensions.st_makepoint(new.longitude, new.latitude),
          4326
        )::extensions.geography,
        100
      )
  ) then
    raise exception 'Este posto parece já estar cadastrado nesta localização';
  end if;

  return new;
end;
$$;
