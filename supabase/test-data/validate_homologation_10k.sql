-- Validacao somente leitura da massa sintetica de homologacao.

with synthetic_stations as (
  select id from public.stations where name like '[SYNTH HML]%'
),
sample_stations as (
  select id from synthetic_stations order by id limit 200
),
counts as (
  select jsonb_build_object(
    'stations', (select count(*) from synthetic_stations),
    'fuels', (
      select count(*) from public.station_fuels sf
      join synthetic_stations s on s.id = sf.station_id
    ),
    'services', (
      select count(*) from public.station_services ss
      join synthetic_stations s on s.id = ss.station_id
    ),
    'prices', (
      select count(*) from public.price_submissions p
      join synthetic_stations s on s.id = p.station_id
    ),
    'reporters', (
      select count(*) from auth.users
      where email like 'botali-hml-reporter-%@example.invalid'
    )
  ) as value
),
bounds_result as (
  select count(*) as value
  from public.stations_in_map_bounds_v1(
    -19.875, -19.975, -43.89, -44.01, 200, 0
  )
),
radius_result as (
  select count(*) as value
  from public.nearby_stations_v3(-19.9167, -43.9345, 25000, 200, 0)
),
consensus_result as (
  select count(*) as value
  from public.community_prices_for_stations(
    array(select id from sample_stations)
  )
)
select jsonb_build_object(
  'counts', (select value from counts),
  'bounds_page', (select value from bounds_result),
  'radius_page', (select value from radius_result),
  'consensus_rows_for_200_stations', (select value from consensus_result),
  'retention_dry_run', private.apply_data_retention(false)
) as verification;
