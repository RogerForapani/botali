-- Ensaio isolado de planos de consulta para o mapa do Botali.
-- Usa apenas tabelas temporarias da sessao; nao altera dados do aplicativo.

create temporary table perf_stations (
  id uuid primary key,
  latitude double precision not null,
  longitude double precision not null,
  location extensions.geography(point, 4326) not null,
  status text not null
);

create index perf_stations_location_gix on perf_stations using gist (location);

insert into perf_stations (id, latitude, longitude, location, status)
select
  md5('perf-station-' || number)::uuid,
  -20.20 + (((number - 1) / 100) * 0.006),
  -44.25 + (((number - 1) % 100) * 0.006),
  extensions.st_point(
    -44.25 + (((number - 1) % 100) * 0.006),
    -20.20 + (((number - 1) / 100) * 0.006)
  )::extensions.geography,
  'verified'
from generate_series(1, 10000) as series(number);

create temporary table perf_price_submissions (
  id uuid primary key,
  station_id uuid not null,
  fuel_type_id integer not null,
  user_id uuid not null,
  price numeric(6,3) not null,
  user_trust_score_snapshot integer not null,
  created_at timestamptz not null
);

create index perf_prices_lookup_idx
  on perf_price_submissions (station_id, fuel_type_id, created_at desc);
create index perf_prices_user_idx
  on perf_price_submissions (user_id, station_id, fuel_type_id, created_at desc);

insert into perf_price_submissions (
  id, station_id, fuel_type_id, user_id, price,
  user_trust_score_snapshot, created_at
)
select
  md5('perf-price-' || station.id || '-' || fuel || '-' || reporter)::uuid,
  station.id,
  fuel,
  md5('perf-user-' || reporter || '-' || ((row_number() over ()) % 5000))::uuid,
  (3.50 + fuel * 0.55 + reporter * 0.01 + abs(mod(hashtext(station.id::text), 40)) * 0.01)::numeric(6,3),
  50 + abs(mod(hashtext(station.id::text || reporter), 51)),
  now() - abs(mod(hashtext(station.id::text || fuel || reporter), 120)) * interval '1 hour'
from perf_stations station
cross join generate_series(1, 4) as fuels(fuel)
cross join generate_series(1, 2) as reporters(reporter);

analyze perf_stations;
analyze perf_price_submissions;

create temporary table perf_query_plans (
  query_name text primary key,
  plan jsonb not null
);

do $performance$
declare
  plan_document jsonb;
begin
  execute $query$
    explain (analyze, buffers, format json)
    select s.id
    from perf_stations s
    where s.status <> 'rejected'
      and extensions.st_dwithin(
        s.location,
        extensions.st_point(-43.9345, -19.9167)::extensions.geography,
        25000
      )
    order by
      s.location operator(extensions.<->) extensions.st_point(-43.9345, -19.9167)::extensions.geography,
      s.id
    limit 200
  $query$ into plan_document;
  insert into perf_query_plans values ('raio_25km_atual', plan_document);

  execute $query$
    explain (analyze, buffers, format json)
    with search_area as (
      select
        extensions.st_makeenvelope(-44.01, -19.975, -43.89, -19.875, 4326) as bounds,
        extensions.st_point(-43.95, -19.925)::extensions.geography as center
    )
    select s.id
    from perf_stations s
    cross join search_area area
    where s.status <> 'rejected'
      and extensions.st_covers(area.bounds, s.location::extensions.geometry)
    order by s.location operator(extensions.<->) area.center, s.id
    limit 200
  $query$ into plan_document;
  insert into perf_query_plans values ('limites_visiveis_atual', plan_document);

  execute $query$
    explain (analyze, buffers, format json)
    with search_area as (
      select
        extensions.st_makeenvelope(-44.01, -19.975, -43.89, -19.875, 4326)::extensions.geography as bounds,
        extensions.st_point(-43.95, -19.925)::extensions.geography as center
    )
    select s.id
    from perf_stations s
    cross join search_area area
    where s.status <> 'rejected'
      and extensions.st_intersects(s.location, area.bounds)
    order by s.location operator(extensions.<->) area.center, s.id
    limit 200
  $query$ into plan_document;
  insert into perf_query_plans values ('limites_visiveis_geography', plan_document);

  execute $query$
    explain (analyze, buffers, format json)
    with target_stations as (
      select s.id
      from perf_stations s
      order by s.location operator(extensions.<->) extensions.st_point(-43.9345, -19.9167)::extensions.geography
      limit 200
    ),
    latest_reports as (
      select distinct on (p.station_id, p.fuel_type_id, p.user_id)
        p.station_id,
        p.fuel_type_id,
        p.user_id,
        round(p.price, 2) as normalized_price,
        p.user_trust_score_snapshot,
        p.created_at
      from perf_price_submissions p
      join target_stations target on target.id = p.station_id
      where p.created_at >= now() - interval '5 days'
      order by p.station_id, p.fuel_type_id, p.user_id, p.created_at desc
    )
    select
      station_id,
      fuel_type_id,
      normalized_price,
      count(*) as reports,
      sum(user_trust_score_snapshot) as trust,
      max(created_at) as updated_at
    from latest_reports
    group by station_id, fuel_type_id, normalized_price
  $query$ into plan_document;
  insert into perf_query_plans values ('consenso_200_postos', plan_document);
end;
$performance$;

select
  query_name,
  round((plan -> 0 ->> 'Planning Time')::numeric, 3) as planning_ms,
  round((plan -> 0 ->> 'Execution Time')::numeric, 3) as execution_ms,
  plan -> 0 -> 'Plan' ->> 'Node Type' as root_node,
  plan::text like '%Index%' as uses_index,
  (select count(*) from perf_stations) as stations,
  (select count(*) from perf_price_submissions) as price_reports
from perf_query_plans
order by query_name;
