select json_build_object(
  'reports',(select count(*) from public.station_existence_reports),
  'anon_read',has_table_privilege('anon','public.station_existence_reports','select'),
  'authenticated_read',has_table_privilege('authenticated','public.station_existence_reports','select'),
  'authenticated_insert',has_table_privilege('authenticated','public.station_existence_reports','insert'),
  'anon_report',has_function_privilege('anon','public.report_station_missing(uuid,text)','execute'),
  'authenticated_report',has_function_privilege('authenticated','public.report_station_missing(uuid,text)','execute'),
  'anon_moderate',has_function_privilege('anon','public.moderate_station_missing_report(uuid,text,text)','execute')
)::text;
