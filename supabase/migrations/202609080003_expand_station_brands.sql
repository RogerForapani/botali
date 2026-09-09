insert into public.station_brands (name, operator_name) values
  ('Vibra', 'Vibra Energia'),
  ('Raízen', 'Raízen'),
  ('Rodoil', 'Rodoil'),
  ('Rede SIM', 'SIM Rede de Postos'),
  ('Rede Graal', 'Rede Graal'),
  ('Ruff', 'Ruff'),
  ('PetroBahia', 'PetroBahia'),
  ('Larco', 'Larco'),
  ('Federal', 'Rede Federal'),
  ('Small', 'Small Distribuidora'),
  ('Charrua', 'Charrua'),
  ('Maxxi', 'Maxxi Distribuidora')
on conflict (name) do update set operator_name = excluded.operator_name, active = true;

create or replace function public.create_station_suggestion(
  station_name text, brand_name text, station_address text, station_neighborhood text,
  station_city text, station_state text, station_postal_code text,
  lat double precision, long double precision, fuel_codes text[], service_codes text[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  creator_id uuid := (select auth.uid());
  selected_brand_id uuid;
  new_station_id uuid;
begin
  if creator_id is null then raise exception 'Authentication required'; end if;
  if char_length(trim(station_name)) < 2 then raise exception 'Informe o nome do posto'; end if;
  if trim(station_address) = '' or trim(station_city) = '' or char_length(trim(station_state)) <> 2 then raise exception 'Informe endereço, cidade e UF'; end if;
  if lat not between -90 and 90 or long not between -180 and 180 then raise exception 'Localização inválida'; end if;
  if char_length(trim(brand_name)) not between 2 and 80 then raise exception 'Informe uma bandeira válida'; end if;
  if coalesce(cardinality(fuel_codes), 0) = 0 and not coalesce(service_codes, '{}'::text[]) && array['recarga_ac', 'recarga_dc'] then raise exception 'Selecione ao menos um combustível ou tipo de recarga'; end if;

  select id into selected_brand_id from public.station_brands where lower(name) = lower(trim(brand_name)) limit 1;
  if selected_brand_id is null then
    insert into public.station_brands (name, operator_name, active) values (trim(brand_name), 'Sugerida pela comunidade', true) returning id into selected_brand_id;
  end if;

  insert into public.stations (name, brand_id, address, neighborhood, city, state, postal_code, latitude, longitude, status, created_by)
  values (trim(station_name), selected_brand_id, trim(station_address), nullif(trim(station_neighborhood), ''), trim(station_city), upper(trim(station_state)), nullif(trim(station_postal_code), ''), lat, long, 'pending', creator_id)
  returning id into new_station_id;

  insert into public.station_fuels (station_id, fuel_type_id)
  select new_station_id, id from public.fuel_types where active and code = any(coalesce(fuel_codes, '{}'::text[]));
  insert into public.station_services (station_id, service_id, status, created_by)
  select new_station_id, id, 'reported', creator_id from public.services where active and code = any(coalesce(service_codes, '{}'::text[]));
  return new_station_id;
end;
$$;
