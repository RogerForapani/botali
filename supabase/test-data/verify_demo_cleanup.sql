\set ON_ERROR_STOP on
begin read only;
select 'stations_remaining' as metric, count(*) from public.stations
union all select 'prices_remaining', count(*) from public.price_submissions
union all select 'synthetic_remaining', count(*) from public.stations where name like '[SYNTH HML]%'
union all select 'demo_remaining', count(*) from public.stations where name like '[DEMO RMBH]%'
union all select 'technical_users_remaining', count(*) from auth.users where email like 'botali-hml-reporter-%@example.invalid'
union all select 'technical_user_3_remaining', count(*) from auth.users where email = 'botali-hml-alert-test-reporter-3@example.invalid';
select id, name, city, state, latitude, longitude, status from public.stations order by created_at;
commit;
