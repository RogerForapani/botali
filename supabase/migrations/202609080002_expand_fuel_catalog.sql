insert into public.fuel_types (code, name) values
  ('gasolina_premium', 'Gasolina premium'),
  ('etanol_aditivado', 'Etanol aditivado'),
  ('diesel_s10_aditivado', 'Diesel S10 aditivado'),
  ('diesel_s500_aditivado', 'Diesel S500 aditivado')
on conflict (code) do update set name = excluded.name, active = true;

insert into public.services (code, name) values
  ('arla_32', 'Venda de ARLA 32')
on conflict (code) do update set name = excluded.name, active = true;
