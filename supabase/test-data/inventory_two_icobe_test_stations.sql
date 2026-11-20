\set ON_ERROR_STOP on
begin read only;
select id, name, address, city, status from public.stations
where id in (
  '48a11e8b-c794-47fc-8a84-d70f7682277c'::uuid,
  '6f02b734-d7da-48ee-be00-a3ee542e5280'::uuid
);
select format(
  'select %L as dependent_table, count(*) as linked_rows from %s t where t.%I in (%L::uuid, %L::uuid);',
  c.conrelid::regclass::text, c.conrelid::regclass, a.attname,
  '48a11e8b-c794-47fc-8a84-d70f7682277c',
  '6f02b734-d7da-48ee-be00-a3ee542e5280'
)
from pg_constraint c
join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
where c.contype = 'f' and c.confrelid = 'public.stations'::regclass
order by c.conrelid::regclass::text
\gexec
select e.event_type, count(*) from private.community_contribution_events e
where e.source_id in (
  select id from public.stations where id in (
    '48a11e8b-c794-47fc-8a84-d70f7682277c'::uuid,
    '6f02b734-d7da-48ee-be00-a3ee542e5280'::uuid
  )
  union all
  select id from public.price_submissions where station_id in (
    '48a11e8b-c794-47fc-8a84-d70f7682277c'::uuid,
    '6f02b734-d7da-48ee-be00-a3ee542e5280'::uuid
  )
) group by e.event_type order by e.event_type;
commit;
