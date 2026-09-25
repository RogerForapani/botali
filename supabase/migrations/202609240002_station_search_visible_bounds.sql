-- Busca paginada limitada ao retângulo realmente visível no mapa.

create or replace function public.stations_in_map_bounds_v1(
  north_lat double precision,
  south_lat double precision,
  east_long double precision,
  west_long double precision,
  result_limit integer default 200,
  result_offset integer default 0
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
  with search_area as (
    select
      extensions.st_makeenvelope(
        least(west_long, east_long),
        least(south_lat, north_lat),
        greatest(west_long, east_long),
        greatest(south_lat, north_lat),
        4326
      ) as bounds,
      extensions.st_point(
        (west_long + east_long) / 2,
        (south_lat + north_lat) / 2
      )::extensions.geography as center
  )
  select
    s.id,
    s.name,
    coalesce(s.brand_name_override, b.name, 'Sem bandeira'),
    s.latitude,
    s.longitude,
    s.address,
    extensions.st_distance(s.location, area.center),
    s.status
  from public.stations s
  left join public.station_brands b on b.id = s.brand_id
  cross join search_area area
  where s.status <> 'rejected'
    and north_lat between -90 and 90
    and south_lat between -90 and 90
    and east_long between -180 and 180
    and west_long between -180 and 180
    and extensions.st_covers(area.bounds, s.location::extensions.geometry)
  order by
    s.location operator(extensions.<->) area.center,
    s.id
  limit least(greatest(result_limit, 1), 200)
  offset least(greatest(result_offset, 0), 10000);
$$;

revoke execute on function public.stations_in_map_bounds_v1(double precision, double precision, double precision, double precision, integer, integer) from public;
grant execute on function public.stations_in_map_bounds_v1(double precision, double precision, double precision, double precision, integer, integer) to anon, authenticated;
