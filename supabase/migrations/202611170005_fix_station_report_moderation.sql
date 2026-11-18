create or replace function public.moderate_station_missing_report(target_report_id uuid, decision text, reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare report_row public.station_existence_reports%rowtype;
begin
  if not (select private.is_moderator()) then raise exception 'Moderator access required'; end if;
  if decision not in ('approved','rejected') then raise exception 'Invalid decision'; end if;
  if decision='rejected' and char_length(trim(coalesce($3,'')))<5
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
          moderation_reason=nullif(trim($3),''),resolved_at=now()
      where station_id=report_row.station_id and status='pending';
  else
    update public.station_existence_reports
      set status='rejected',moderator_id=(select auth.uid()),
          moderation_reason=trim($3),resolved_at=now()
      where id=target_report_id;
  end if;
end;
$$;
