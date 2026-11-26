\set ON_ERROR_STOP on
begin read only;
select 'brand', name from public.station_brands where active order by name;
select 'fuel', code from public.fuel_types where active order by code;
commit;
