begin;
do $$
declare
  reporter uuid;
  moderator uuid;
  target uuid;
  report uuid;
begin
  select user_id into reporter from public.user_roles where role='user' limit 1;
  select user_id into moderator from public.user_roles where role in ('moderator','admin') limit 1;
  select id into target from public.stations where source_kind='anp' and status='verified' limit 1;
  if reporter is null or moderator is null or target is null then
    raise exception 'Missing test accounts or station';
  end if;
  perform set_config('request.jwt.claim.sub',reporter::text,true);
  report := public.report_station_missing(target,'Local não encontrado no teste reversível');
  if not exists(select 1 from public.station_existence_reports where id=report and status='pending') then
    raise exception 'Report not queued';
  end if;
  perform set_config('request.jwt.claim.sub',moderator::text,true);
  perform public.moderate_station_missing_report(report,'approved','Teste reversível');
  if not exists(select 1 from public.stations where id=target and status='rejected') then
    raise exception 'Station not hidden';
  end if;
  if not exists(select 1 from public.station_existence_reports where id=report and status='approved') then
    raise exception 'Report not resolved';
  end if;
  select id into target from public.stations where source_kind='anp' and status='verified' limit 1;
  perform set_config('request.jwt.claim.sub',reporter::text,true);
  report := public.report_station_missing(target,'Outro teste reversível');
  begin
    perform public.moderate_station_missing_report(report,'approved',null);
    raise exception 'Non-moderator unexpectedly approved';
  exception when others then
    if sqlerrm <> 'Moderator access required' then raise; end if;
  end;
  perform set_config('request.jwt.claim.sub',moderator::text,true);
  perform public.moderate_station_missing_report(report,'rejected','O posto existe no endereço informado');
  if not exists(select 1 from public.stations where id=target and status='verified') then
    raise exception 'Rejected report changed station status';
  end if;
end;
$$;
rollback;
select 'Report and moderation flow passed with rollback' as result;
