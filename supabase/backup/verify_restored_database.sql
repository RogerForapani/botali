-- Execute na origem imediatamente antes do backup e novamente no banco restaurado.
-- O bloco inicial interrompe a validação se faltar estrutura essencial. A consulta
-- final retorna um inventario agregado, sem expor dados pessoais ou segredos.

do $validation$
declare
  missing_tables text[];
  tables_without_rls text[];
  missing_functions text[];
begin
  create temporary table if not exists botali_backup_migration_state (
    present boolean not null,
    latest_version text
  ) on commit drop;
  truncate table botali_backup_migration_state;

  select array_agg(table_name order by table_name)
  into missing_tables
  from unnest(array[
    'profiles', 'user_roles', 'station_brands', 'stations', 'fuel_types',
    'station_fuels', 'price_submissions', 'price_confirmations', 'services',
    'station_services', 'station_reviews', 'station_edit_requests',
    'station_edit_votes', 'user_reputation_events', 'station_visits',
    'station_moderation_actions', 'station_edit_moderation_actions'
  ]) as required(table_name)
  where to_regclass(format('public.%I', table_name)) is null;

  if missing_tables is not null then
    raise exception 'Tabelas obrigatorias ausentes: %', array_to_string(missing_tables, ', ');
  end if;

  select array_agg(required.table_name order by required.table_name)
  into tables_without_rls
  from unnest(array[
    'profiles', 'user_roles', 'station_brands', 'stations', 'fuel_types',
    'station_fuels', 'price_submissions', 'price_confirmations', 'services',
    'station_services', 'station_reviews', 'station_edit_requests',
    'station_edit_votes', 'user_reputation_events', 'station_visits',
    'station_moderation_actions', 'station_edit_moderation_actions'
  ]) as required(table_name)
  join pg_class relation on relation.relname = required.table_name
  join pg_namespace namespace on namespace.oid = relation.relnamespace and namespace.nspname = 'public'
  where not relation.relrowsecurity;

  if tables_without_rls is not null then
    raise exception 'RLS desabilitada em: %', array_to_string(tables_without_rls, ', ');
  end if;

  select array_agg(function_name order by function_name)
  into missing_functions
  from unnest(array[
    'nearby_stations_v3', 'stations_in_map_bounds_v1',
    'community_prices_for_stations', 'create_station_suggestion',
    'create_station_edit_suggestion_v3', 'moderate_station_edit_request',
    'delete_my_account'
  ]) as required(function_name)
  where not exists (
    select 1
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname = required.function_name
  );

  if missing_functions is not null then
    raise exception 'Funcoes obrigatorias ausentes: %', array_to_string(missing_functions, ', ');
  end if;

  if not exists (select 1 from pg_extension where extname = 'postgis') then
    raise exception 'Extensao PostGIS ausente';
  end if;

  if to_regprocedure('private.apply_data_retention(boolean)') is null then
    raise exception 'Funcao privada de retencao ausente';
  end if;

  if to_regclass('supabase_migrations.schema_migrations') is null then
    insert into botali_backup_migration_state values (false, null);
  else
    execute 'insert into botali_backup_migration_state select true, max(version)::text from supabase_migrations.schema_migrations';
  end if;
end;
$validation$;

select jsonb_build_object(
  'verification_version', 1,
  'checked_at', now(),
  'migration_history_present', (select present from botali_backup_migration_state),
  'latest_migration', (select latest_version from botali_backup_migration_state),
  'public_tables', (
    select count(*)
    from pg_class relation
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public' and relation.relkind = 'r'
  ),
  'public_tables_with_rls', (
    select count(*)
    from pg_class relation
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public' and relation.relkind = 'r' and relation.relrowsecurity
  ),
  'counts', jsonb_build_object(
    'auth_users', (select count(*) from auth.users),
    'profiles', (select count(*) from public.profiles),
    'stations', (select count(*) from public.stations),
    'station_fuels', (select count(*) from public.station_fuels),
    'station_services', (select count(*) from public.station_services),
    'price_submissions', (select count(*) from public.price_submissions),
    'price_confirmations', (select count(*) from public.price_confirmations),
    'station_visits', (select count(*) from public.station_visits),
    'station_edit_requests', (select count(*) from public.station_edit_requests),
    'station_moderation_actions', (select count(*) from public.station_moderation_actions),
    'station_edit_moderation_actions', (select count(*) from public.station_edit_moderation_actions)
  ),
  'synthetic_homologation', jsonb_build_object(
    'stations', (select count(*) from public.stations where name like '[SYNTH HML]%'),
    'reporters', (select count(*) from auth.users where email like 'botali-hml-reporter-%@example.invalid'),
    'prices', (
      select count(*)
      from public.price_submissions submission
      join public.stations station on station.id = submission.station_id
      where station.name like '[SYNTH HML]%'
    )
  )
) as backup_verification;
