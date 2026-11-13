\set ON_ERROR_STOP on
begin read only;
select 'all_stations' as metric, count(*) from public.stations
union all select 'anp_stations', count(*) from public.stations where source_kind = 'anp'
union all select 'community_stations', count(*) from public.stations where source_kind = 'community'
union all select 'anp_source_records', count(*) from public.station_import_sources
union all select 'anp_prices', count(*) from public.price_submissions p join public.stations s on s.id=p.station_id where s.source_kind='anp'
union all select 'anp_contribution_points', count(*) from private.community_contribution_events e join public.stations s on s.id=e.source_id where s.source_kind='anp'
union all select 'anp_without_fuels', count(*) from public.stations s where s.source_kind='anp' and not exists (select 1 from public.station_fuels f where f.station_id=s.id)
union all select 'test_stations', count(*) from public.stations where name like '[SYNTH HML]%' or name like '[DEMO RMBH]%';

select city, count(*) from public.stations where source_kind='anp' group by city order by city;
select 'same_point_pairs', count(*) from public.stations a join public.stations b
  on a.id < b.id and a.source_kind='anp' and b.source_kind='anp'
  and extensions.st_dwithin(a.location,b.location,150);

set local role anon;
select 'anon_visible_anp', count(*) from public.stations where source_kind='anp';
select 'anon_visible_provenance', count(*) from public.station_import_sources;
commit;
