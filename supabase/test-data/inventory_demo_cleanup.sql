-- Read-only impact inventory for removing Botali's two named test batches.
-- Run against homologation before any DELETE. No personal identifiers are output.
\set ON_ERROR_STOP on
begin read only;

select 'synthetic_hml' as batch, count(*) as stations
from public.stations where name like '[SYNTH HML]%'
union all
select 'demo_rmbh', count(*)
from public.stations where name like '[DEMO RMBH]%';

select conrelid::regclass as dependent_table, a.attname as station_column,
       case c.confdeltype when 'c' then 'cascade' when 'r' then 'restrict'
         when 'a' then 'no action' when 'n' then 'set null' else c.confdeltype::text end as on_delete
from pg_constraint c
join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
where c.contype = 'f' and c.confrelid = 'public.stations'::regclass
order by 1, 2;

-- Count every direct foreign-key dependent row; no table names are hard-coded.
select format(
  'select %L as dependent_table, %L as station_column, count(*) as linked_rows from %s t where t.%I in (select id from public.stations where name like %L or name like %L);',
  c.conrelid::regclass::text, a.attname, c.conrelid::regclass, a.attname,
  '[SYNTH HML]%', '[DEMO RMBH]%'
)
from pg_constraint c
join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
where c.contype = 'f' and c.confrelid = 'public.stations'::regclass
order by c.conrelid::regclass::text
\gexec

select 'price_submissions_non_test_users' as metric, count(*) as rows
from public.price_submissions p
join public.stations s on s.id = p.station_id
join auth.users u on u.id = p.user_id
where (s.name like '[SYNTH HML]%' or s.name like '[DEMO RMBH]%')
  and u.email not like '%@example.invalid';

select 'other_test_named_stations' as metric, count(*) as rows
from public.stations
where name ilike '%teste%' or name ilike '%demo%'
   or name ilike '%synth%';

select 'other_test_station' as metric, id, name, status
from public.stations
where (name ilike '%teste%' or name ilike '%demo%' or name ilike '%synth%')
  and name not like '[SYNTH HML]%' and name not like '[DEMO RMBH]%'
order by name;

select e.event_type, count(*) as contribution_events
from private.community_contribution_events e
where (e.event_type in ('price_report', 'validated_price_report', 'price_confirmation')
       and e.source_id in (
         select p.id from public.price_submissions p
         join public.stations s on s.id = p.station_id
         where s.name like '[SYNTH HML]%' or s.name like '[DEMO RMBH]%'
       ))
   or (e.event_type = 'verified_station' and e.source_id in (
         select id from public.stations
         where name like '[SYNTH HML]%' or name like '[DEMO RMBH]%'
       ))
   or (e.event_type = 'approved_edit' and e.source_id in (
         select er.id from public.station_edit_requests er
         join public.stations s on s.id = er.station_id
         where s.name like '[SYNTH HML]%' or s.name like '[DEMO RMBH]%'
       ))
group by e.event_type order by e.event_type;

select 'reputation_events_linked' as metric, count(*) as rows
from public.user_reputation_events e
where e.reference_id in (
  select id from public.stations where name like '[SYNTH HML]%' or name like '[DEMO RMBH]%'
  union all
  select p.id from public.price_submissions p
  join public.stations s on s.id = p.station_id
  where s.name like '[SYNTH HML]%' or s.name like '[DEMO RMBH]%'
);

select 'technical_users' as metric, count(*) as rows
from auth.users where email like 'botali-hml-reporter-%@example.invalid'
  or email = 'botali-hml-alert-test-reporter-3@example.invalid';

select 'extra_test_station_price_reports' as metric, count(*) as rows
from public.price_submissions p
where p.station_id in (
  'd4aaa8fa-d1fc-463f-9a55-64da62a4140f'::uuid,
  '16c0eb96-ca82-428c-a712-0aa12da568a3'::uuid
);

select 'technical_user_non_target_reports' as metric, count(*) as rows
from public.price_submissions p
join auth.users u on u.id = p.user_id
where (u.email like 'botali-hml-reporter-%@example.invalid'
       or u.email = 'botali-hml-alert-test-reporter-3@example.invalid')
  and p.station_id not in (
    select id from public.stations where name like '[SYNTH HML]%'
    union all
    select unnest(array[
      'd4aaa8fa-d1fc-463f-9a55-64da62a4140f'::uuid,
      '16c0eb96-ca82-428c-a712-0aa12da568a3'::uuid
    ])
  );

select 'technical_user_non_target_stations' as metric, count(*) as rows
from public.stations s
join auth.users u on u.id = s.created_by
where (u.email like 'botali-hml-reporter-%@example.invalid'
       or u.email = 'botali-hml-alert-test-reporter-3@example.invalid')
  and s.name not like '[SYNTH HML]%'
  and s.id not in (
    'd4aaa8fa-d1fc-463f-9a55-64da62a4140f'::uuid,
    '16c0eb96-ca82-428c-a712-0aa12da568a3'::uuid
  );

commit;
