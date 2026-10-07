-- Opt-in price alerts. The selected map area is rounded to ~1 km; precise GPS is not stored.

create table public.price_alert_rules (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  fuel_code text not null references public.fuel_types(code),
  center_lat numeric(4,2) not null check (center_lat between -90 and 90),
  center_long numeric(5,2) not null check (center_long between -180 and 180),
  radius_km integer not null check (radius_km in (2, 5, 10, 25, 50)),
  max_price numeric(6,3) not null check (max_price between 0.5 and 30),
  push_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index price_alert_rules_fuel_idx on public.price_alert_rules (fuel_code);
alter table public.price_alert_rules enable row level security;
revoke all on public.price_alert_rules from public, anon, authenticated;
grant select, insert, update, delete on public.price_alert_rules to authenticated;
create policy price_alert_rules_own on public.price_alert_rules for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create table public.price_alert_events (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.price_alert_rules(user_id) on delete cascade,
  station_id uuid not null references public.stations(id) on delete cascade,
  station_name text not null,
  fuel_code text not null,
  price numeric(6,3) not null,
  confidence integer not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  push_status text not null default 'skipped' check (push_status in ('pending', 'sent', 'failed', 'skipped')),
  push_ticket_id text,
  push_sent_at timestamptz,
  push_checked_at timestamptz,
  push_attempts smallint not null default 0 check (push_attempts between 0 and 3)
);
create index price_alert_events_user_idx on public.price_alert_events (user_id, created_at desc);
create index price_alert_events_pending_idx on public.price_alert_events (created_at) where push_status = 'pending';
alter table public.price_alert_events enable row level security;
revoke all on public.price_alert_events from public, anon, authenticated;
grant select on public.price_alert_events to authenticated;
create policy price_alert_events_own_read on public.price_alert_events for select to authenticated
  using (user_id = (select auth.uid()));

create table private.price_alert_devices (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  expo_push_token text not null unique check (char_length(expo_push_token) between 20 and 255),
  updated_at timestamptz not null default now()
);
revoke all on private.price_alert_devices from public, anon, authenticated;

create or replace function public.register_my_price_alert_device(push_token text)
returns void language plpgsql security definer set search_path = '' as $$
declare account_id uuid := (select auth.uid());
begin
  if account_id is null then raise exception 'Authentication required'; end if;
  if push_token !~ '^(Expo|Exponent)PushToken\[[A-Za-z0-9_-]{16,220}\]$' then raise exception 'Invalid push token'; end if;
  delete from private.price_alert_devices where expo_push_token = push_token and user_id <> account_id;
  insert into private.price_alert_devices (user_id, expo_push_token)
  values (account_id, push_token)
  on conflict (user_id) do update set expo_push_token = excluded.expo_push_token, updated_at = now();
end;
$$;
revoke execute on function public.register_my_price_alert_device(text) from public, anon;
grant execute on function public.register_my_price_alert_device(text) to authenticated;

create or replace function public.remove_my_price_alert_device()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  delete from private.price_alert_devices where user_id = (select auth.uid());
  update public.price_alert_rules set push_enabled = false, updated_at = now() where user_id = (select auth.uid());
end;
$$;
revoke execute on function public.remove_my_price_alert_device() from public, anon;
grant execute on function public.remove_my_price_alert_device() to authenticated;

create or replace function public.mark_my_price_alert_read(alert_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  update public.price_alert_events set read_at = coalesce(read_at, now())
  where id = alert_id and user_id = (select auth.uid());
end;
$$;
revoke execute on function public.mark_my_price_alert_read(uuid) from public, anon;
grant execute on function public.mark_my_price_alert_read(uuid) to authenticated;

create or replace function private.record_price_alert_for_station(target_station_id uuid, target_fuel_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  station_row public.stations%rowtype;
  target_code text;
  quote record;
begin
  select * into station_row from public.stations where id = target_station_id and status = 'verified';
  if not found then return; end if;
  select code into target_code from public.fuel_types where id = target_fuel_id;
  if target_code is null or not exists (select 1 from public.price_alert_rules where fuel_code = target_code) then return; end if;

  select * into quote from public.community_prices_for_stations(array[target_station_id])
  where fuel_code = target_code;
  if not found then return; end if;
  if quote.submission_id is null or quote.updated_at < now() - interval '5 days' or quote.confidence < 70 then return; end if;

  insert into public.price_alert_events (user_id, station_id, station_name, fuel_code, price, confidence, push_status)
  select r.user_id, station_row.id, station_row.name, target_code, quote.price, quote.confidence,
    case when r.push_enabled and exists (select 1 from private.price_alert_devices d where d.user_id = r.user_id) then 'pending' else 'skipped' end
  from public.price_alert_rules r
  where r.fuel_code = target_code and quote.price <= r.max_price
    and r.user_id <> (select user_id from public.price_submissions where id = quote.submission_id)
    and extensions.st_dwithin(
      station_row.location,
      extensions.st_setsrid(extensions.st_makepoint(r.center_long::double precision, r.center_lat::double precision), 4326)::extensions.geography,
      r.radius_km * 1000
    )
    and not exists (select 1 from public.price_alert_events e where e.user_id = r.user_id and e.created_at > now() - interval '24 hours')
    and not exists (select 1 from public.price_alert_events e where e.user_id = r.user_id and e.station_id = station_row.id and e.created_at > now() - interval '7 days');
end;
$$;
revoke execute on function private.record_price_alert_for_station(uuid, uuid) from public, anon, authenticated;

create or replace function private.on_price_alert_source_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_station_id uuid; target_fuel_id uuid;
begin
  if tg_table_name = 'price_submissions' then
    target_station_id := new.station_id;
    target_fuel_id := new.fuel_type_id;
  else
    select station_id, fuel_type_id into target_station_id, target_fuel_id
    from public.price_submissions where id = new.submission_id;
  end if;
  if target_station_id is not null then perform private.record_price_alert_for_station(target_station_id, target_fuel_id); end if;
  return new;
end;
$$;
revoke execute on function private.on_price_alert_source_change() from public, anon, authenticated;
create trigger price_alert_after_submission after insert on public.price_submissions
  for each row execute function private.on_price_alert_source_change();
create trigger price_alert_after_confirmation after insert or update on public.price_confirmations
  for each row execute function private.on_price_alert_source_change();

create or replace function private.on_station_price_alert_approval()
returns trigger language plpgsql security definer set search_path = '' as $$
declare fuel_row record;
begin
  if old.status <> 'verified' and new.status = 'verified' then
    for fuel_row in select distinct fuel_type_id from public.price_submissions where station_id = new.id loop
      perform private.record_price_alert_for_station(new.id, fuel_row.fuel_type_id);
    end loop;
  end if;
  return new;
end;
$$;
revoke execute on function private.on_station_price_alert_approval() from public, anon, authenticated;
create trigger price_alert_after_station_approval after update of status on public.stations
  for each row execute function private.on_station_price_alert_approval();

create or replace function public.pending_price_alert_pushes(batch_limit integer default 50)
returns table (event_id uuid, expo_push_token text, station_id uuid, station_name text, fuel_code text, price numeric, latitude double precision, longitude double precision)
language sql security definer set search_path = '' as $$
  select e.id, d.expo_push_token, e.station_id, e.station_name, e.fuel_code, e.price, s.latitude, s.longitude
  from public.price_alert_events e
  join public.price_alert_rules r on r.user_id = e.user_id and r.push_enabled
  join private.price_alert_devices d on d.user_id = e.user_id
  join public.stations s on s.id = e.station_id
  where e.push_status = 'pending' and e.push_attempts < 3 and e.created_at > now() - interval '2 days'
  order by e.created_at limit least(greatest(batch_limit, 1), 100);
$$;
revoke execute on function public.pending_price_alert_pushes(integer) from public, anon, authenticated;
grant execute on function public.pending_price_alert_pushes(integer) to service_role;

create or replace function public.mark_price_alert_push_result(alert_id uuid, ticket_id text, error_code text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.price_alert_events
  set push_attempts = least(push_attempts + 1, 3),
      push_status = case when ticket_id is not null then 'sent' when push_attempts >= 2 then 'failed' else 'pending' end,
      push_ticket_id = ticket_id,
      push_sent_at = case when ticket_id is not null then now() else null end,
      push_checked_at = case when ticket_id is null then now() else null end
  where id = alert_id;
  if error_code = 'DeviceNotRegistered' then
    delete from private.price_alert_devices d using public.price_alert_events e
    where e.id = alert_id and d.user_id = e.user_id;
    update public.price_alert_rules r set push_enabled = false, updated_at = now()
    from public.price_alert_events e where e.id = alert_id and r.user_id = e.user_id;
  end if;
end;
$$;
revoke execute on function public.mark_price_alert_push_result(uuid, text, text) from public, anon, authenticated;
grant execute on function public.mark_price_alert_push_result(uuid, text, text) to service_role;

create or replace function public.unchecked_price_alert_receipts(batch_limit integer default 50)
returns table (event_id uuid, ticket_id text)
language sql security definer set search_path = '' as $$
  select id, push_ticket_id from public.price_alert_events
  where push_status = 'sent' and push_ticket_id is not null and push_checked_at is null
    and push_sent_at < now() - interval '15 minutes' and push_sent_at > now() - interval '24 hours'
  order by push_sent_at limit least(greatest(batch_limit, 1), 100);
$$;
revoke execute on function public.unchecked_price_alert_receipts(integer) from public, anon, authenticated;
grant execute on function public.unchecked_price_alert_receipts(integer) to service_role;

create or replace function public.mark_price_alert_receipt(alert_id uuid, error_code text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.price_alert_events set push_checked_at = now(), push_status = case when error_code is null then 'sent' else 'failed' end
  where id = alert_id;
  if error_code = 'DeviceNotRegistered' then
    delete from private.price_alert_devices d using public.price_alert_events e
    where e.id = alert_id and d.user_id = e.user_id;
    update public.price_alert_rules r set push_enabled = false, updated_at = now()
    from public.price_alert_events e where e.id = alert_id and r.user_id = e.user_id;
  end if;
end;
$$;
revoke execute on function public.mark_price_alert_receipt(uuid, text) from public, anon, authenticated;
grant execute on function public.mark_price_alert_receipt(uuid, text) to service_role;
