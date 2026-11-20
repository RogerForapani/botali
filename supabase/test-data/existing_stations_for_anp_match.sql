\set ON_ERROR_STOP on
begin read only;
select s.id, s.name, coalesce(b.name, ''), coalesce(s.brand_name_override, ''),
       coalesce(s.address, ''), coalesce(s.neighborhood, ''),
       coalesce(s.city, ''), coalesce(s.state, ''), coalesce(s.postal_code, ''),
       s.latitude, s.longitude, s.status
from public.stations s
left join public.station_brands b on b.id = s.brand_id
order by s.created_at;
commit;
