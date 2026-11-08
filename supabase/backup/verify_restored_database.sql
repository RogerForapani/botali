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

  if exists (
    select 1 from pg_class relation
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public' and relation.relkind = 'r'
      and has_table_privilege('anon', relation.oid, 'INSERT')
  ) then
    raise exception 'Papel anon pode inserir diretamente em tabelas publicas';
  end if;

  if has_table_privilege('anon', 'public.price_submissions', 'SELECT')
     or has_table_privilege('authenticated', 'public.stations', 'INSERT') then
    raise exception 'Privilegios de tabelas sensiveis mais amplos que a origem';
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

  if exists (
    select 1 from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname in ('delete_my_account', 'moderate_station_edit_request')
      and has_function_privilege('anon', procedure.oid, 'EXECUTE')
  ) then
    raise exception 'Papel anon pode executar funcoes sensiveis';
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
  'verification_version', 4,
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
  'table_privileges', jsonb_build_object(
    'acl_hash', (
      select md5(string_agg(relation.relname || '=' || coalesce(relation.relacl::text, ''), '|' order by relation.relname))
      from pg_class relation
      join pg_namespace namespace on namespace.oid = relation.relnamespace
      where namespace.nspname = 'public' and relation.relkind = 'r'
    ),
    'anon_insert', (
      select count(*) from pg_class relation
      join pg_namespace namespace on namespace.oid = relation.relnamespace
      where namespace.nspname = 'public' and relation.relkind = 'r'
        and has_table_privilege('anon', relation.oid, 'INSERT')
    ),
    'anon_select', (
      select count(*) from pg_class relation
      join pg_namespace namespace on namespace.oid = relation.relnamespace
      where namespace.nspname = 'public' and relation.relkind = 'r'
        and has_table_privilege('anon', relation.oid, 'SELECT')
    ),
    'authenticated_insert', (
      select count(*) from pg_class relation
      join pg_namespace namespace on namespace.oid = relation.relnamespace
      where namespace.nspname = 'public' and relation.relkind = 'r'
        and has_table_privilege('authenticated', relation.oid, 'INSERT')
    )
  ),
  'function_privileges', jsonb_build_object(
    'effective_acl_hash', (
      select md5(string_agg(
        procedure.proname || '=' ||
        has_function_privilege('anon', procedure.oid, 'EXECUTE')::text || ',' ||
        has_function_privilege('authenticated', procedure.oid, 'EXECUTE')::text || ',' ||
        has_function_privilege('service_role', procedure.oid, 'EXECUTE')::text,
        '|' order by procedure.proname
      ))
      from pg_proc procedure
      join pg_namespace namespace on namespace.oid = procedure.pronamespace
      where namespace.nspname = 'public'
    )
  ),
  'postgres_public_default_privileges', (
    select coalesce(jsonb_object_agg(default_acl.defaclobjtype, default_acl.defaclacl::text), '{}'::jsonb)
    from pg_default_acl default_acl
    where default_acl.defaclrole = 'postgres'::regrole
      and default_acl.defaclnamespace = 'public'::regnamespace
  ),
  'storage', jsonb_build_object(
    'buckets', (select count(*) from storage.buckets),
    'objects', (select count(*) from storage.objects)
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
