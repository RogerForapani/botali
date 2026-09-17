-- Paginação espacial da busca do mapa com limite rígido por consulta.

create or replace function public.nearby_stations_v3(
  lat double precision,
  long double precision,
  radius_m integer default 10000,
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
  order by
    s.location operator(extensions.<->) extensions.st_point(long, lat)::extensions.geography,
    s.id
  limit least(greatest(result_limit, 1), 200)
  offset least(greatest(result_offset, 0), 10000);
$$;

revoke execute on function public.nearby_stations_v3(double precision, double precision, integer, integer, integer) from public;
grant execute on function public.nearby_stations_v3(double precision, double precision, integer, integer, integer) to anon, authenticated;
