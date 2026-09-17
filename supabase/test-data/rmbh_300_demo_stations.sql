-- Dados temporarios para testar paginacao e agrupamento do mapa.
-- Todos os registros usam IDs determinísticos e o prefixo [DEMO RMBH].

begin;

do $$
declare
  actor_id uuid;
begin
  select ur.user_id
  into actor_id
  from public.user_roles ur
  where ur.role in ('moderator', 'admin')
  order by case ur.role when 'admin' then 0 else 1 end, ur.created_at
  limit 1;

  if actor_id is null then
    raise exception 'Nenhum moderador ou administrador disponível para associar aos preços demonstrativos';
  end if;

  perform set_config('request.jwt.claim.sub', actor_id::text, true);

  with municipalities(city_index, city, center_latitude, center_longitude) as (
    values
      (1, 'Belo Horizonte', -19.9167::double precision, -43.9345::double precision),
      (2, 'Contagem', -19.9317, -44.0536),
      (3, 'Betim', -19.9678, -44.1983),
      (4, 'Nova Lima', -19.9856, -43.8467),
      (5, 'Ribeirão das Neves', -19.7669, -44.0867),
      (6, 'Santa Luzia', -19.7692, -43.8513),
      (7, 'Sabará', -19.8889, -43.8053),
      (8, 'Ibirité', -20.0210, -44.0580),
      (9, 'Vespasiano', -19.6919, -43.9233),
      (10, 'Lagoa Santa', -19.6253, -43.8894)
  ),
  generated as (
    select
      number,
      municipality.city,
      (array['Shell', 'Ipiranga', 'Petrobras', 'Ale', 'Independente'])[((number - 1) % 5) + 1] as brand_name,
      municipality.center_latitude + ((((number - 1) / 10) / 6) - 2) * 0.006 as latitude,
      municipality.center_longitude + (((((number - 1) / 10) % 6) - 2.5) * 0.006) as longitude
    from generate_series(1, 300) as series(number)
    join municipalities municipality on municipality.city_index = ((number - 1) % 10) + 1
  )
  insert into public.stations (
    id, name, brand_id, brand_name_override, latitude, longitude,
    address, neighborhood, city, state, postal_code, status, created_by
  )
  select
    md5('botali-demo-rmbh-' || generated.number::text)::uuid,
    format('[DEMO RMBH] Posto %s - %s', lpad(generated.number::text, 3, '0'), generated.brand_name),
    brand.id,
    null,
    generated.latitude,
    generated.longitude,
    format('Avenida Demonstrativa, %s', 100 + generated.number),
    format('Bairro de Teste %s', ((generated.number - 1) % 8) + 1),
    generated.city,
    'MG',
    null,
    'verified',
    actor_id
  from generated
  join public.station_brands brand on brand.name = generated.brand_name
  on conflict (id) do update set
    name = excluded.name,
    brand_id = excluded.brand_id,
    brand_name_override = null,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    address = excluded.address,
    neighborhood = excluded.neighborhood,
    city = excluded.city,
    state = excluded.state,
    status = 'verified';

  insert into public.station_fuels (station_id, fuel_type_id)
  select station.id, fuel.id
  from public.stations station
  cross join public.fuel_types fuel
  where station.name like '[DEMO RMBH]%'
    and fuel.code in ('gasolina', 'gasolina_aditivada', 'etanol', 'diesel_s10')
  on conflict (station_id, fuel_type_id) do nothing;

  with price_seed as (
    select
      md5('botali-demo-price-' || station.id::text || '-' || fuel.code)::uuid as id,
      station.id as station_id,
      fuel.id as fuel_type_id,
      case fuel.code
        when 'gasolina' then 5.59 + abs(mod(hashtext(station.id::text), 30)) * 0.01
        when 'gasolina_aditivada' then 5.89 + abs(mod(hashtext(station.id::text), 35)) * 0.01
        when 'etanol' then 3.69 + abs(mod(hashtext(station.id::text), 30)) * 0.01
        when 'diesel_s10' then 5.99 + abs(mod(hashtext(station.id::text), 40)) * 0.01
      end::numeric(6,3) as price,
      now() - (abs(mod(hashtext(station.id::text || fuel.code), 96)) * interval '15 minutes') as created_at
    from public.stations station
    cross join public.fuel_types fuel
    where station.name like '[DEMO RMBH]%'
      and fuel.code in ('gasolina', 'gasolina_aditivada', 'etanol', 'diesel_s10')
  )
  update public.price_submissions submission
  set price = seed.price,
      user_id = actor_id,
      user_trust_score_snapshot = 100,
      created_at = seed.created_at
  from price_seed seed
  where submission.id = seed.id;

  with price_seed as (
    select
      md5('botali-demo-price-' || station.id::text || '-' || fuel.code)::uuid as id,
      station.id as station_id,
      fuel.id as fuel_type_id,
      case fuel.code
        when 'gasolina' then 5.59 + abs(mod(hashtext(station.id::text), 30)) * 0.01
        when 'gasolina_aditivada' then 5.89 + abs(mod(hashtext(station.id::text), 35)) * 0.01
        when 'etanol' then 3.69 + abs(mod(hashtext(station.id::text), 30)) * 0.01
        when 'diesel_s10' then 5.99 + abs(mod(hashtext(station.id::text), 40)) * 0.01
      end::numeric(6,3) as price,
      now() - (abs(mod(hashtext(station.id::text || fuel.code), 96)) * interval '15 minutes') as created_at
    from public.stations station
    cross join public.fuel_types fuel
    where station.name like '[DEMO RMBH]%'
      and fuel.code in ('gasolina', 'gasolina_aditivada', 'etanol', 'diesel_s10')
  )
  insert into public.price_submissions (
    id, station_id, fuel_type_id, user_id, price,
    user_trust_score_snapshot, created_at
  )
  select
    seed.id, seed.station_id, seed.fuel_type_id, actor_id, seed.price, 100, seed.created_at
  from price_seed seed
  where not exists (
    select 1 from public.price_submissions existing where existing.id = seed.id
  );
end;
$$;

commit;

select
  count(*) as demo_stations,
  (select count(*)
   from public.price_submissions submission
   join public.stations station on station.id = submission.station_id
   where station.name like '[DEMO RMBH]%') as demo_prices
from public.stations
where name like '[DEMO RMBH]%';
