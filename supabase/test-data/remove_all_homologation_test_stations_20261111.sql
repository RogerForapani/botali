-- Remove the named 10k synthetic batch and two individually verified test stations.
-- Intended only for botali-homologacao after a verified offsite backup.
-- Other community stations are outside this explicit target set.
\set ON_ERROR_STOP on
begin;
set local lock_timeout = '10s';
set local statement_timeout = '15min';

create temp table cleanup_station_ids on commit drop as
select id from public.stations where name like '[SYNTH HML]%'
union all
select id from public.stations where id in (
  'd4aaa8fa-d1fc-463f-9a55-64da62a4140f'::uuid, -- [TESTE HML]
  '16c0eb96-ca82-428c-a712-0aa12da568a3'::uuid  -- [TESTE HTML]
);
create unique index on cleanup_station_ids(id);

create temp table cleanup_submission_ids on commit drop as
select id from public.price_submissions
where station_id in (select id from cleanup_station_ids);
create unique index on cleanup_submission_ids(id);

create temp table cleanup_edit_ids on commit drop as
select id from public.station_edit_requests
where station_id in (select id from cleanup_station_ids);
create unique index on cleanup_edit_ids(id);

do $$
begin
  if (select count(*) from public.stations where name like '[SYNTH HML]%') <> 10000
     or (select count(*) from public.stations where id in (
       'd4aaa8fa-d1fc-463f-9a55-64da62a4140f'::uuid,
       '16c0eb96-ca82-428c-a712-0aa12da568a3'::uuid
     )) <> 2
     or (select count(*) from public.stations where name like '[DEMO RMBH]%') <> 0
     or (select count(*) from cleanup_submission_ids) <> 80004
     or (select count(*) from cleanup_station_ids) <> 10002
  then
    raise exception 'O inventário mudou; limpeza cancelada';
  end if;
end $$;

-- The contribution ledger has no station FK and would otherwise preserve
-- points from synthetic stations after their source records disappear.
delete from private.community_contribution_events e
where (e.event_type in ('price_report', 'validated_price_report', 'price_confirmation')
       and e.source_id in (select id from cleanup_submission_ids))
   or (e.event_type = 'verified_station'
       and e.source_id in (select id from cleanup_station_ids))
   or (e.event_type = 'approved_edit'
       and e.source_id in (select id from cleanup_edit_ids));

delete from public.user_reputation_events e
where e.reference_id in (select id from cleanup_station_ids)
   or e.reference_id in (select id from cleanup_submission_ids)
   or e.reference_id in (select id from cleanup_edit_ids);

-- Direct FKs use ON DELETE CASCADE, including prices, fuels, services and alerts.
delete from public.stations s
where s.id in (select id from cleanup_station_ids);

-- The three accounts were created only to exercise synthetic data and alerts.
delete from auth.users
where email in (
  'botali-hml-reporter-1@example.invalid',
  'botali-hml-reporter-2@example.invalid',
  'botali-hml-alert-test-reporter-3@example.invalid'
);

do $$
begin
  if exists (select 1 from public.stations
             where name like '[SYNTH HML]%' or name like '[DEMO RMBH]%'
                or id in (
                  'd4aaa8fa-d1fc-463f-9a55-64da62a4140f'::uuid,
                  '16c0eb96-ca82-428c-a712-0aa12da568a3'::uuid
                ))
     or exists (select 1 from auth.users
                where email in (
                  'botali-hml-reporter-1@example.invalid',
                  'botali-hml-reporter-2@example.invalid',
                  'botali-hml-alert-test-reporter-3@example.invalid'
                ))
     or exists (select 1 from private.community_contribution_events
                where source_id in (select id from cleanup_station_ids)
                   or source_id in (select id from cleanup_submission_ids)
                   or source_id in (select id from cleanup_edit_ids))
  then
    raise exception 'A verificação final falhou; limpeza cancelada';
  end if;
end $$;

select 'removed_stations' as metric, count(*) from cleanup_station_ids
union all select 'removed_price_submissions', count(*) from cleanup_submission_ids
union all select 'removed_edit_requests', count(*) from cleanup_edit_ids;
commit;
