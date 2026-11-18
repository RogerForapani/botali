create table public.station_existence_reports (
  id uuid primary key default extensions.gen_random_uuid(),
  station_id uuid not null references public.stations(id),
  reporter_id uuid not null references public.profiles(id),
  reason text check (reason is null or char_length(reason) <= 500),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  moderator_id uuid references public.profiles(id),
  moderation_reason text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (id, station_id)
);
create unique index station_existence_reports_one_pending_per_user
  on public.station_existence_reports(station_id, reporter_id) where status='pending';
create index station_existence_reports_queue
  on public.station_existence_reports(status, created_at);
alter table public.station_existence_reports enable row level security;
revoke all on public.station_existence_reports from public, anon, authenticated;
grant select on public.station_existence_reports to authenticated;
create policy station_existence_reports_read on public.station_existence_reports
  for select to authenticated
  using (reporter_id=(select auth.uid()) or (select private.is_moderator()));

create function public.report_station_missing(target_station_id uuid, report_reason text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'Login required'; end if;
  if not exists(select 1 from public.stations where id=target_station_id and status='verified')
    then raise exception 'Station unavailable'; end if;
  if char_length(coalesce(report_reason,'')) > 500 then raise exception 'Reason too long'; end if;
  if (select count(*) from public.station_existence_reports
      where reporter_id=(select auth.uid()) and created_at>now()-interval '1 day') >= 10
    then raise exception 'Daily report limit reached'; end if;
  insert into public.station_existence_reports(station_id,reporter_id,reason)
    values(target_station_id,(select auth.uid()),nullif(trim(report_reason),''))
    on conflict (station_id,reporter_id) where status='pending' do nothing
    returning id into new_id;
  if new_id is null then raise exception 'Report already pending'; end if;
  return new_id;
end;
$$;
revoke execute on function public.report_station_missing(uuid,text) from public, anon;
grant execute on function public.report_station_missing(uuid,text) to authenticated;

create function public.moderate_station_missing_report(target_report_id uuid, decision text, reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare report_row public.station_existence_reports%rowtype;
begin
  if not (select private.is_moderator()) then raise exception 'Moderator access required'; end if;
  if decision not in ('approved','rejected') then raise exception 'Invalid decision'; end if;
  if decision='rejected' and char_length(trim(coalesce(reason,'')))<5
    then raise exception 'Reason required for rejection'; end if;
  select * into report_row from public.station_existence_reports
    where id=target_report_id and status='pending' for update;
  if not found then raise exception 'Pending report not found'; end if;
  if decision='approved' then
    update public.stations set status='rejected'
      where id=report_row.station_id and status='verified';
    if not found then raise exception 'Station no longer published'; end if;
    update public.station_existence_reports
      set status='approved',moderator_id=(select auth.uid()),
          moderation_reason=nullif(trim(reason),''),resolved_at=now()
      where station_id=report_row.station_id and status='pending';
  else
    update public.station_existence_reports
      set status='rejected',moderator_id=(select auth.uid()),
          moderation_reason=trim(reason),resolved_at=now()
      where id=target_report_id;
  end if;
end;
$$;
revoke execute on function public.moderate_station_missing_report(uuid,text,text) from public, anon;
grant execute on function public.moderate_station_missing_report(uuid,text,text) to authenticated;
