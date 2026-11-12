-- User-confirmed test duplicates at Rua Icobe, 74, Contagem.
-- Run only on botali-homologacao after a verified backup.
\set ON_ERROR_STOP on
begin;
set local lock_timeout = '10s';
set local statement_timeout = '5min';

create temp table cleanup_icobe_stations on commit drop as
select id from public.stations where id in (
  '48a11e8b-c794-47fc-8a84-d70f7682277c'::uuid,
  '6f02b734-d7da-48ee-be00-a3ee542e5280'::uuid
) and address = 'Rua Icobe, 74' and city = 'Contagem';
create unique index on cleanup_icobe_stations(id);
create temp table cleanup_icobe_submissions on commit drop as
select id from public.price_submissions
where station_id in (select id from cleanup_icobe_stations);

do $$
begin
  if (select count(*) from cleanup_icobe_stations) <> 2
     or (select count(*) from cleanup_icobe_submissions) <> 4
  then raise exception 'Inventário da Rua Icobe mudou; limpeza cancelada'; end if;
end $$;

delete from private.community_contribution_events e
where (e.event_type in ('price_report', 'validated_price_report', 'price_confirmation')
       and e.source_id in (select id from cleanup_icobe_submissions))
   or (e.event_type = 'verified_station'
       and e.source_id in (select id from cleanup_icobe_stations));

delete from public.user_reputation_events e
where e.reference_id in (select id from cleanup_icobe_submissions)
   or e.reference_id in (select id from cleanup_icobe_stations);

delete from public.stations s
where s.id in (select id from cleanup_icobe_stations);

do $$
begin
  if exists (select 1 from public.stations where id in (select id from cleanup_icobe_stations))
     or exists (select 1 from private.community_contribution_events
                where source_id in (select id from cleanup_icobe_stations)
                   or source_id in (select id from cleanup_icobe_submissions))
  then raise exception 'Verificação da Rua Icobe falhou; limpeza cancelada'; end if;
end $$;

select 'removed_stations' as metric, count(*) from cleanup_icobe_stations
union all select 'removed_price_submissions', count(*) from cleanup_icobe_submissions;
commit;
