create schema if not exists extensions;
create schema if not exists private;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists postgis with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  avatar_url text,
  trust_score integer not null default 100 check (trust_score >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'moderator', 'admin')),
  created_at timestamptz not null default now()
);

create table public.station_brands (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null unique,
  operator_name text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.stations (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  brand_id uuid references public.station_brands(id),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  location extensions.geography(point, 4326) generated always as (
    extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography
  ) stored,
  address text,
  neighborhood text,
  city text,
  state text check (state is null or char_length(state) = 2),
  postal_code text,
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index stations_location_gix on public.stations using gist (location);
create index stations_city_idx on public.stations (city, state);

create table public.fuel_types (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null unique,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.station_fuels (
  station_id uuid not null references public.stations(id) on delete cascade,
  fuel_type_id uuid not null references public.fuel_types(id),
  created_at timestamptz not null default now(),
  primary key (station_id, fuel_type_id)
);

create table public.price_submissions (
  id uuid primary key default extensions.gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  fuel_type_id uuid not null references public.fuel_types(id),
  user_id uuid not null references public.profiles(id),
  price numeric(6,3) not null check (price between 0.5 and 30),
  photo_url text,
  submitted_location extensions.geography(point, 4326),
  distance_from_station_m integer check (distance_from_station_m >= 0),
  user_trust_score_snapshot integer not null check (user_trust_score_snapshot >= 0),
  created_at timestamptz not null default now()
);
create index price_submissions_lookup_idx on public.price_submissions (station_id, fuel_type_id, created_at desc);
create index price_submissions_user_rate_idx on public.price_submissions (user_id, station_id, fuel_type_id, created_at desc);

create table public.price_confirmations (
  submission_id uuid not null references public.price_submissions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  agrees boolean not null,
  trust_score_snapshot integer not null check (trust_score_snapshot >= 0),
  created_at timestamptz not null default now(),
  primary key (submission_id, user_id)
);

create table public.services (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null unique,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.station_services (
  station_id uuid not null references public.stations(id) on delete cascade,
  service_id uuid not null references public.services(id),
  status text not null default 'reported' check (status in ('reported', 'confirmed', 'rejected')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (station_id, service_id)
);

create table public.station_reviews (
  id uuid primary key default extensions.gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  fuel_trust_rating smallint check (fuel_trust_rating between 1 and 5),
  service_rating smallint check (service_rating between 1 and 5),
  structure_rating smallint check (structure_rating between 1 and 5),
  trusts_station boolean,
  comment text check (char_length(comment) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (station_id, user_id)
);

create table public.station_edit_requests (
  id uuid primary key default extensions.gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  field_name text not null,
  old_value jsonb,
  new_value jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.station_edit_votes (
  edit_request_id uuid not null references public.station_edit_requests(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  vote boolean not null,
  trust_score_snapshot integer not null check (trust_score_snapshot >= 0),
  created_at timestamptz not null default now(),
  primary key (edit_request_id, user_id)
);

create table public.user_reputation_events (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  points integer not null,
  reference_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index reputation_events_user_idx on public.user_reputation_events (user_id, created_at desc);

create or replace function private.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute function private.set_updated_at();
create trigger stations_updated_at before update on public.stations for each row execute function private.set_updated_at();
create trigger station_services_updated_at before update on public.station_services for each row execute function private.set_updated_at();
create trigger station_reviews_updated_at before update on public.station_reviews for each row execute function private.set_updated_at();

create or replace function private.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)), new.raw_user_meta_data ->> 'avatar_url');
  insert into public.user_roles (user_id) values (new.id);
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.create_profile_for_new_user();

create or replace function private.is_moderator()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role in ('moderator', 'admin')
  );
$$;

create or replace function private.prepare_price_submission()
returns trigger language plpgsql security definer set search_path = '' as $$
declare station_location extensions.geography(point, 4326);
begin
  new.user_id := (select auth.uid());
  select trust_score into new.user_trust_score_snapshot from public.profiles where id = new.user_id;
  if new.user_trust_score_snapshot is null then raise exception 'Profile not found'; end if;
  if exists (
    select 1 from public.price_submissions
    where user_id = new.user_id and station_id = new.station_id
      and fuel_type_id = new.fuel_type_id and created_at > now() - interval '5 minutes'
  ) then
    raise exception 'Aguarde antes de enviar outro preço para este combustível';
  end if;
  if new.submitted_location is not null then
    select location into station_location from public.stations where id = new.station_id;
    new.distance_from_station_m := round(extensions.st_distance(new.submitted_location, station_location));
  else
    new.distance_from_station_m := null;
  end if;
  return new;
end;
$$;
create trigger prepare_price_submission before insert on public.price_submissions for each row execute function private.prepare_price_submission();

create or replace function private.prepare_trust_snapshot()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.user_id := (select auth.uid());
  select trust_score into new.trust_score_snapshot from public.profiles where id = new.user_id;
  if new.trust_score_snapshot is null then raise exception 'Profile not found'; end if;
  return new;
end;
$$;
create trigger prepare_price_confirmation before insert on public.price_confirmations for each row execute function private.prepare_trust_snapshot();
create trigger prepare_edit_vote before insert on public.station_edit_votes for each row execute function private.prepare_trust_snapshot();

create or replace function public.nearby_stations(lat double precision, long double precision, radius_m integer default 10000)
returns table (id uuid, name text, brand text, latitude double precision, longitude double precision, address text, distance_m double precision)
language sql stable security invoker set search_path = '' as $$
  select s.id, s.name, b.name, s.latitude, s.longitude, s.address,
    extensions.st_distance(s.location, extensions.st_point(long, lat)::extensions.geography)
  from public.stations s
  left join public.station_brands b on b.id = s.brand_id
  where s.status <> 'rejected'
    and extensions.st_dwithin(s.location, extensions.st_point(long, lat)::extensions.geography, least(greatest(radius_m, 100), 100000))
  order by s.location operator(extensions.<->) extensions.st_point(long, lat)::extensions.geography;
$$;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.station_brands enable row level security;
alter table public.stations enable row level security;
alter table public.fuel_types enable row level security;
alter table public.station_fuels enable row level security;
alter table public.price_submissions enable row level security;
alter table public.price_confirmations enable row level security;
alter table public.services enable row level security;
alter table public.station_services enable row level security;
alter table public.station_reviews enable row level security;
alter table public.station_edit_requests enable row level security;
alter table public.station_edit_votes enable row level security;
alter table public.user_reputation_events enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;
revoke execute on function public.nearby_stations(double precision, double precision, integer) from public;
grant select on public.station_brands, public.stations, public.fuel_types, public.station_fuels, public.price_submissions, public.price_confirmations, public.services, public.station_services, public.station_reviews to anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant select on public.user_roles, public.user_reputation_events to authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;
grant insert on public.stations, public.price_submissions, public.price_confirmations, public.station_services, public.station_reviews, public.station_edit_requests, public.station_edit_votes to authenticated;
grant update (fuel_trust_rating, service_rating, structure_rating, trusts_station, comment) on public.station_reviews to authenticated;
grant select on public.station_edit_requests, public.station_edit_votes to authenticated;
grant execute on function public.nearby_stations(double precision, double precision, integer) to anon, authenticated;

create policy profiles_public_read on public.profiles for select to anon, authenticated using (true);
create policy profiles_update_own_safe_fields on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy brands_public_read on public.station_brands for select to anon, authenticated using (active);
create policy stations_public_read on public.stations for select to anon, authenticated using (status <> 'rejected');
create policy stations_authenticated_insert on public.stations for insert to authenticated with check ((select auth.uid()) = created_by and status = 'pending');
create policy fuel_types_public_read on public.fuel_types for select to anon, authenticated using (active);
create policy station_fuels_public_read on public.station_fuels for select to anon, authenticated using (true);
create policy prices_public_read on public.price_submissions for select to anon, authenticated using (true);
create policy prices_authenticated_insert on public.price_submissions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy price_confirmations_public_read on public.price_confirmations for select to anon, authenticated using (true);
create policy price_confirmations_authenticated_insert on public.price_confirmations for insert to authenticated with check ((select auth.uid()) = user_id);
create policy services_public_read on public.services for select to anon, authenticated using (active);
create policy station_services_public_read on public.station_services for select to anon, authenticated using (status <> 'rejected');
create policy station_services_authenticated_insert on public.station_services for insert to authenticated with check ((select auth.uid()) = created_by and status = 'reported');
create policy reviews_public_read on public.station_reviews for select to anon, authenticated using (true);
create policy reviews_insert_own on public.station_reviews for insert to authenticated with check ((select auth.uid()) = user_id);
create policy reviews_update_own on public.station_reviews for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy edit_requests_authenticated_read on public.station_edit_requests for select to authenticated using (true);
create policy edit_requests_insert_own on public.station_edit_requests for insert to authenticated with check ((select auth.uid()) = user_id and status = 'pending');
create policy edit_votes_authenticated_read on public.station_edit_votes for select to authenticated using (true);
create policy edit_votes_insert_own on public.station_edit_votes for insert to authenticated with check ((select auth.uid()) = user_id);
create policy roles_read_own on public.user_roles for select to authenticated using ((select auth.uid()) = user_id or (select private.is_moderator()));
create policy reputation_read_own on public.user_reputation_events for select to authenticated using ((select auth.uid()) = user_id or (select private.is_moderator()));

insert into public.station_brands (name, operator_name) values
  ('Shell', 'Raízen'), ('Ipiranga', 'Grupo Ultra'), ('Petrobras', 'Vibra Energia'), ('Ale', 'ALE Combustíveis'), ('Independente', null), ('Outra', null);
insert into public.fuel_types (code, name) values
  ('gasolina', 'Gasolina comum'), ('gasolina_aditivada', 'Gasolina aditivada'), ('etanol', 'Etanol'), ('diesel_s10', 'Diesel S10'), ('diesel_s500', 'Diesel S500'), ('gnv', 'GNV');
insert into public.services (code, name) values
  ('24h', 'Funcionamento 24 horas'), ('conveniencia', 'Loja de conveniência'), ('borracharia', 'Borracharia'), ('lanchonete', 'Lanchonete'), ('restaurante', 'Restaurante'), ('banheiro', 'Banheiro'), ('gelo', 'Venda de gelo'), ('calibrador', 'Calibrador'), ('troca_oleo', 'Troca de óleo'), ('lava_jato', 'Lava-jato'), ('caixa_eletronico', 'Caixa eletrônico'), ('estacionamento', 'Estacionamento'), ('gnv', 'GNV'), ('recarga_ac', 'Recarga elétrica AC'), ('recarga_dc', 'Recarga rápida DC'), ('arla_32', 'Venda de ARLA 32');
