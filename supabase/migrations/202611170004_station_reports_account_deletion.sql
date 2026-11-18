alter table public.station_existence_reports
  drop constraint station_existence_reports_station_id_fkey,
  add constraint station_existence_reports_station_id_fkey
    foreign key (station_id) references public.stations(id) on delete cascade;
alter table public.station_existence_reports
  drop constraint station_existence_reports_reporter_id_fkey,
  add constraint station_existence_reports_reporter_id_fkey
    foreign key (reporter_id) references public.profiles(id) on delete cascade;
alter table public.station_existence_reports
  drop constraint station_existence_reports_moderator_id_fkey,
  add constraint station_existence_reports_moderator_id_fkey
    foreign key (moderator_id) references public.profiles(id) on delete set null;
