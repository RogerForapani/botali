-- Permite sugerir e moderar a correção do ponto geográfico de um posto publicado.

create or replace function public.create_station_edit_suggestion_v3(
  target_station_id uuid,
  proposed_name text,
  proposed_brand text,
  proposed_address text,
  proposed_neighborhood text,
  proposed_city text,
  proposed_state text,
  proposed_postal_code text,
  proposed_latitude double precision,
  proposed_longitude double precision,
  fuel_codes text[],
  service_codes text[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  creator_id uuid := (select auth.uid());
  target public.stations%rowtype;
  request_id uuid;
  old_brand text;
begin
  if creator_id is null then raise exception 'Authentication required'; end if;
  select * into target from public.stations where id = target_station_id and status = 'verified';
  if not found then raise exception 'Posto não encontrado ou ainda não publicado'; end if;
  if char_length(trim(proposed_name)) not between 2 and 120 then raise exception 'Informe um nome válido'; end if;
  if char_length(trim(proposed_brand)) not between 2 and 80 then raise exception 'Informe uma bandeira válida'; end if;
  if char_length(trim(proposed_address)) < 3 or trim(proposed_city) = '' or char_length(trim(proposed_state)) <> 2 then
    raise exception 'Informe rua, cidade e UF';
  end if;
  if proposed_latitude is null or proposed_latitude not between -90 and 90
    or proposed_longitude is null or proposed_longitude not between -180 and 180 then
    raise exception 'Informe uma localização válida para o posto';
  end if;
  if coalesce(cardinality(fuel_codes), 0) = 0
    and not coalesce(service_codes, '{}'::text[]) && array['recarga_ac', 'recarga_dc'] then
    raise exception 'Selecione ao menos um combustível ou tipo de recarga';
  end if;
  if exists (
    select 1 from public.station_edit_requests
    where station_id = target_station_id and user_id = creator_id
      and field_name = 'station_profile' and status = 'pending'
  ) then raise exception 'Você já tem uma correção aguardando revisão para este posto'; end if;
  if exists (
    select 1 from public.stations s
    where s.id <> target_station_id
      and s.status <> 'rejected'
      and lower(regexp_replace(trim(s.name), '[^[:alnum:]]+', '', 'g')) =
          lower(regexp_replace(trim(proposed_name), '[^[:alnum:]]+', '', 'g'))
      and extensions.st_dwithin(
        s.location,
        extensions.st_setsrid(extensions.st_makepoint(proposed_longitude, proposed_latitude), 4326)::extensions.geography,
        100
      )
  ) then raise exception 'Este posto parece já estar cadastrado nesta localização'; end if;

  old_brand := coalesce(target.brand_name_override, (select b.name from public.station_brands b where b.id = target.brand_id), 'Sem bandeira');

  insert into public.station_edit_requests (station_id, user_id, field_name, old_value, new_value)
  values (
    target_station_id,
    creator_id,
    'station_profile',
    jsonb_build_object(
      'name', target.name,
      'brand', old_brand,
      'address', target.address,
      'neighborhood', target.neighborhood,
      'city', target.city,
      'state', target.state,
      'postal_code', target.postal_code,
      'latitude', target.latitude,
      'longitude', target.longitude,
      'fuel_codes', coalesce((select jsonb_agg(ft.code order by ft.name) from public.station_fuels sf join public.fuel_types ft on ft.id = sf.fuel_type_id where sf.station_id = target_station_id), '[]'::jsonb),
      'service_codes', coalesce((select jsonb_agg(s.code order by s.name) from public.station_services ss join public.services s on s.id = ss.service_id where ss.station_id = target_station_id and ss.status = 'confirmed'), '[]'::jsonb)
    ),
    jsonb_build_object(
      'name', trim(proposed_name),
      'brand', trim(proposed_brand),
      'address', trim(proposed_address),
      'neighborhood', nullif(trim(proposed_neighborhood), ''),
      'city', trim(proposed_city),
      'state', upper(trim(proposed_state)),
      'postal_code', nullif(trim(proposed_postal_code), ''),
      'latitude', proposed_latitude,
      'longitude', proposed_longitude,
      'fuel_codes', to_jsonb(coalesce(fuel_codes, '{}'::text[])),
      'service_codes', to_jsonb(coalesce(service_codes, '{}'::text[]))
    )
  ) returning id into request_id;
  return request_id;
end;
$$;

revoke execute on function public.create_station_edit_suggestion_v3(uuid, text, text, text, text, text, text, text, double precision, double precision, text[], text[]) from public, anon;
grant execute on function public.create_station_edit_suggestion_v3(uuid, text, text, text, text, text, text, text, double precision, double precision, text[], text[]) to authenticated;

create or replace function public.moderate_station_edit_request(
  target_request_id uuid,
  decision text,
  reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row public.station_edit_requests%rowtype;
  payload jsonb;
  selected_brand_id uuid;
  custom_brand_name text;
  selected_fuels text[];
  selected_services text[];
  next_latitude double precision;
  next_longitude double precision;
begin
  if not (select private.is_moderator()) then raise exception 'Moderator access required'; end if;
  if decision not in ('approved', 'rejected') then raise exception 'Invalid moderation decision'; end if;
  if decision = 'rejected' and char_length(trim(coalesce(reason, ''))) < 5 then raise exception 'Informe o motivo da rejeição'; end if;

  select * into request_row from public.station_edit_requests
  where id = target_request_id and status = 'pending'
  for update;
  if not found then raise exception 'Pending edit request not found'; end if;

  if decision = 'approved' then
    payload := request_row.new_value;
    select id into selected_brand_id from public.station_brands
    where lower(name) = lower(trim(payload->>'brand')) and active limit 1;
    if selected_brand_id is null then
      select id into selected_brand_id from public.station_brands where name = 'Outra' limit 1;
      custom_brand_name := trim(payload->>'brand');
    end if;
    select coalesce(array_agg(value), '{}'::text[]) into selected_fuels from jsonb_array_elements_text(coalesce(payload->'fuel_codes', '[]'::jsonb));
    select coalesce(array_agg(value), '{}'::text[]) into selected_services from jsonb_array_elements_text(coalesce(payload->'service_codes', '[]'::jsonb));
    select
      case when payload ? 'latitude' then (payload->>'latitude')::double precision else latitude end,
      case when payload ? 'longitude' then (payload->>'longitude')::double precision else longitude end
    into next_latitude, next_longitude
    from public.stations where id = request_row.station_id;
    if next_latitude is null or next_latitude not between -90 and 90
      or next_longitude is null or next_longitude not between -180 and 180 then
      raise exception 'A correção contém uma localização inválida';
    end if;
    if exists (
      select 1 from public.stations s
      where s.id <> request_row.station_id
        and s.status <> 'rejected'
        and lower(regexp_replace(trim(s.name), '[^[:alnum:]]+', '', 'g')) =
            lower(regexp_replace(trim(payload->>'name'), '[^[:alnum:]]+', '', 'g'))
        and extensions.st_dwithin(
          s.location,
          extensions.st_setsrid(extensions.st_makepoint(next_longitude, next_latitude), 4326)::extensions.geography,
          100
        )
    ) then raise exception 'Este posto parece já estar cadastrado nesta localização'; end if;

    update public.stations set
      name = trim(payload->>'name'),
      brand_id = selected_brand_id,
      brand_name_override = custom_brand_name,
      address = trim(payload->>'address'),
      neighborhood = case when payload ? 'neighborhood' then nullif(trim(payload->>'neighborhood'), '') else neighborhood end,
      city = case when payload ? 'city' then trim(payload->>'city') else city end,
      state = case when payload ? 'state' then upper(trim(payload->>'state')) else state end,
      postal_code = case when payload ? 'postal_code' then nullif(trim(payload->>'postal_code'), '') else postal_code end,
      latitude = next_latitude,
      longitude = next_longitude,
      updated_at = now()
    where id = request_row.station_id;

    delete from public.station_fuels where station_id = request_row.station_id;
    insert into public.station_fuels (station_id, fuel_type_id)
    select request_row.station_id, id from public.fuel_types where active and code = any(selected_fuels);

    update public.station_services set status = 'rejected', updated_at = now()
    where station_id = request_row.station_id and not (service_id in (select id from public.services where code = any(selected_services)));
    insert into public.station_services (station_id, service_id, status, created_by)
    select request_row.station_id, id, 'confirmed', request_row.user_id
    from public.services where active and code = any(selected_services)
    on conflict (station_id, service_id) do update set status = 'confirmed', updated_at = now();
  end if;

  update public.station_edit_requests set status = decision, resolved_at = now() where id = target_request_id;
  insert into public.station_edit_moderation_actions (edit_request_id, moderator_id, decision, reason)
  values (target_request_id, (select auth.uid()), decision, nullif(trim(reason), ''));
end;
$$;
