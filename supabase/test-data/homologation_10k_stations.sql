-- Massa persistente, sintetica e removivel para testes ponta a ponta em homologacao.
-- NAO executar em producao. Todos os registros usam IDs deterministicos e o
-- prefixo [SYNTH HML]. O script remove somente uma carga anterior com o mesmo
-- marcador antes de recria-la.

begin;

set local statement_timeout = '10min';

-- Limpa somente uma execucao anterior desta massa sintetica.
delete from public.stations
where name like '[SYNTH HML]%';

delete from auth.users
where email in (
  'botali-hml-reporter-1@example.invalid',
  'botali-hml-reporter-2@example.invalid'
);

-- Perfis sem senha e sem identidade OAuth: existem apenas para respeitar as
-- chaves estrangeiras e exercitar consenso por colaboradores distintos.
insert into auth.users (
  id, instance_id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    md5('botali-hml-reporter-1')::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated', 'authenticated',
    'botali-hml-reporter-1@example.invalid', now(),
    '{"provider":"test","providers":["test"],"synthetic":true}'::jsonb,
    '{"full_name":"Botali HML Sintetico 1","synthetic":true}'::jsonb,
    now(), now()
  ),
  (
    md5('botali-hml-reporter-2')::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated', 'authenticated',
    'botali-hml-reporter-2@example.invalid', now(),
    '{"provider":"test","providers":["test"],"synthetic":true}'::jsonb,
    '{"full_name":"Botali HML Sintetico 2","synthetic":true}'::jsonb,
    now(), now()
  );

insert into public.profiles (id, display_name, trust_score)
values
  (md5('botali-hml-reporter-1')::uuid, 'Botali HML Sintetico 1', 90),
  (md5('botali-hml-reporter-2')::uuid, 'Botali HML Sintetico 2', 75)
on conflict (id) do update set
  display_name = excluded.display_name,
  trust_score = excluded.trust_score;

insert into public.user_roles (user_id, role)
values
  (md5('botali-hml-reporter-1')::uuid, 'user'),
  (md5('botali-hml-reporter-2')::uuid, 'user')
on conflict (user_id) do update set role = excluded.role;

with municipalities(city_index, city, center_latitude, center_longitude) as (
  values
    (1, 'Belo Horizonte', -19.9167::double precision, -43.9345::double precision),
    (2, 'Contagem', -19.9317, -44.0536),
    (3, 'Betim', -19.9678, -44.1983),
    (4, 'Nova Lima', -19.9856, -43.8467),
    (5, 'Ribeirao das Neves', -19.7669, -44.0867),
    (6, 'Santa Luzia', -19.7692, -43.8513),
    (7, 'Sabara', -19.8889, -43.8053),
    (8, 'Ibirite', -20.0210, -44.0580),
    (9, 'Vespasiano', -19.6919, -43.9233),
    (10, 'Lagoa Santa', -19.6253, -43.8894)
),
generated as (
  select
    number,
    municipality.city,
    (array['Shell', 'Ipiranga', 'Petrobras', 'Ale', 'Independente'])[((number - 1) % 5) + 1] as brand_name,
    municipality.center_latitude
      + ((((number - 1) / 10) / 40) - 12) * 0.0035 as latitude,
    municipality.center_longitude
      + (((((number - 1) / 10) % 40) - 19.5) * 0.0035) as longitude
  from generate_series(1, 10000) as series(number)
  join municipalities municipality
    on municipality.city_index = ((number - 1) % 10) + 1
)
insert into public.stations (
  id, name, brand_id, brand_name_override, latitude, longitude,
  address, neighborhood, city, state, postal_code, status, created_by
)
select
  md5('botali-hml-station-' || generated.number::text)::uuid,
  format('[SYNTH HML] Posto %s - %s', lpad(generated.number::text, 5, '0'), generated.brand_name),
  brand.id,
  null,
  generated.latitude,
  generated.longitude,
  format('Avenida Sintetica, %s', 100 + generated.number),
  format('Bairro HML %s', ((generated.number - 1) % 40) + 1),
  generated.city,
  'MG',
  null,
  'verified',
  md5('botali-hml-reporter-1')::uuid
from generated
join public.station_brands brand on brand.name = generated.brand_name;

insert into public.station_fuels (station_id, fuel_type_id)
select station.id, fuel.id
from public.stations station
cross join public.fuel_types fuel
where station.name like '[SYNTH HML]%'
  and fuel.code in ('gasolina', 'gasolina_aditivada', 'etanol', 'diesel_s10');

insert into public.station_services (
  station_id, service_id, status, created_by
)
select
  station.id,
  service.id,
  'confirmed',
  md5('botali-hml-reporter-1')::uuid
from public.stations station
join public.services service on (
  (service.code = 'banheiro' and abs(mod(hashtext(station.id::text), 2)) = 0)
  or (service.code = 'conveniencia' and abs(mod(hashtext(station.id::text), 3)) = 0)
  or (service.code = 'arla_32' and abs(mod(hashtext(station.id::text), 4)) = 0)
  or (service.code = '24h' and abs(mod(hashtext(station.id::text), 5)) = 0)
  or (service.code = 'calibrador' and abs(mod(hashtext(station.id::text), 6)) = 0)
  or (service.code = 'recarga_ac' and abs(mod(hashtext(station.id::text), 25)) = 0)
  or (service.code = 'recarga_dc' and abs(mod(hashtext(station.id::text), 50)) = 0)
)
where station.name like '[SYNTH HML]%';

do $load_prices$
declare
  reporter_id uuid;
begin
  reporter_id := md5('botali-hml-reporter-1')::uuid;
  perform set_config('request.jwt.claim.sub', reporter_id::text, true);

  insert into public.price_submissions (
    id, station_id, fuel_type_id, user_id, price,
    user_trust_score_snapshot, created_at
  )
  select
    md5('botali-hml-price-1-' || station.id::text || '-' || fuel.code)::uuid,
    station.id,
    fuel.id,
    reporter_id,
    case fuel.code
      when 'gasolina' then 5.59 + abs(mod(hashtext(station.id::text), 45)) * 0.01
      when 'gasolina_aditivada' then 5.89 + abs(mod(hashtext(station.id::text), 50)) * 0.01
      when 'etanol' then 3.69 + abs(mod(hashtext(station.id::text), 40)) * 0.01
      when 'diesel_s10' then 5.99 + abs(mod(hashtext(station.id::text), 55)) * 0.01
    end::numeric(6,3),
    90,
    now() - abs(mod(hashtext(station.id::text || fuel.code), 96)) * interval '1 hour'
  from public.stations station
  cross join public.fuel_types fuel
  where station.name like '[SYNTH HML]%'
    and fuel.code in ('gasolina', 'gasolina_aditivada', 'etanol', 'diesel_s10');

  reporter_id := md5('botali-hml-reporter-2')::uuid;
  perform set_config('request.jwt.claim.sub', reporter_id::text, true);

  insert into public.price_submissions (
    id, station_id, fuel_type_id, user_id, price,
    user_trust_score_snapshot, created_at
  )
  select
    md5('botali-hml-price-2-' || station.id::text || '-' || fuel.code)::uuid,
    station.id,
    fuel.id,
    reporter_id,
    case fuel.code
      when 'gasolina' then 5.59 + abs(mod(hashtext(station.id::text), 45)) * 0.01
      when 'gasolina_aditivada' then 5.89 + abs(mod(hashtext(station.id::text), 50)) * 0.01
      when 'etanol' then 3.69 + abs(mod(hashtext(station.id::text), 40)) * 0.01
      when 'diesel_s10' then 5.99 + abs(mod(hashtext(station.id::text), 55)) * 0.01
    end::numeric(6,3),
    75,
    now() - abs(mod(hashtext(station.id::text || fuel.code || '2'), 96)) * interval '1 hour'
  from public.stations station
  cross join public.fuel_types fuel
  where station.name like '[SYNTH HML]%'
    and fuel.code in ('gasolina', 'gasolina_aditivada', 'etanol', 'diesel_s10');
end;
$load_prices$;

analyze public.stations;
analyze public.station_fuels;
analyze public.station_services;
analyze public.price_submissions;

commit;

select jsonb_build_object(
  'synthetic_stations', count(*),
  'synthetic_fuels', (
    select count(*)
    from public.station_fuels sf
    join public.stations s on s.id = sf.station_id
    where s.name like '[SYNTH HML]%'
  ),
  'synthetic_services', (
    select count(*)
    from public.station_services ss
    join public.stations s on s.id = ss.station_id
    where s.name like '[SYNTH HML]%'
  ),
  'synthetic_prices', (
    select count(*)
    from public.price_submissions p
    join public.stations s on s.id = p.station_id
    where s.name like '[SYNTH HML]%'
  ),
  'synthetic_reporters', (
    select count(*) from auth.users
    where email like 'botali-hml-reporter-%@example.invalid'
  )
) as verification
from public.stations
where name like '[SYNTH HML]%';
