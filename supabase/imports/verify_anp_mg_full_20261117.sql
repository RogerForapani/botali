select json_build_object(
 'stations_total',(select count(*) from public.stations),
 'anp_stations',(select count(*) from public.stations where source_kind='anp'),
 'anp_sources',(select count(*) from public.station_import_sources),
 'anp_without_source',(select count(*) from public.stations s left join public.station_import_sources src on src.station_id=s.id where s.source_kind='anp' and src.station_id is null),
 'anp_prices',(select count(*) from public.price_submissions p join public.stations s on s.id=p.station_id where s.source_kind='anp'),
 'anp_without_fuels',(select count(*) from public.stations s where s.source_kind='anp' and not exists(select 1 from public.station_fuels f where f.station_id=s.id)),
 'cities',(select count(distinct city) from public.stations where source_kind='anp'),
 'community_stations',(select count(*) from public.stations where source_kind='community'),
 'anon_visible',(select count(*) from public.stations where source_kind='anp' and status='verified')
)::text;
set role anon;
select json_build_object('anon_stations',(select count(*) from public.stations where source_kind='anp'),'anon_sources',(select count(*) from public.station_import_sources))::text;
