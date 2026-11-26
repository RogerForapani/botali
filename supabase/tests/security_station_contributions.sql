-- Run only against an isolated local replay of the migrations.
-- The test creates disposable users and stations, then rolls everything back.

begin;

create or replace function auth.uid()
returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-4111-8111-111111111111', 'audit-one@example.invalid', '{}'::jsonb),
  ('22222222-2222-4222-8222-222222222222', 'audit-two@example.invalid', '{}'::jsonb);

insert into public.stations (id, name, latitude, longitude, status, created_by) values
  ('aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Audit Verified', -19.91, -43.91, 'verified', '11111111-1111-4111-8111-111111111111'),
  ('aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'Audit Pending Own', -19.92, -43.92, 'pending', '11111111-1111-4111-8111-111111111111'),
  ('aaaaaaa3-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'Audit Pending Other', -19.93, -43.93, 'pending', '22222222-2222-4222-8222-222222222222'),
  ('aaaaaaa4-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 'Audit Rejected', -19.94, -43.94, 'rejected', '11111111-1111-4111-8111-111111111111');

insert into public.station_fuels (station_id, fuel_type_id)
select s.id, (select id from public.fuel_types where code = 'gasolina')
from public.stations s where s.name like 'Audit %';

set local role anon;
do $$
begin
  if (select count(*) from public.station_fuels where station_id in (
    'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    'aaaaaaa3-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
    'aaaaaaa4-aaaa-4aaa-8aaa-aaaaaaaaaaa4')) <> 1 then
    raise exception 'Anonymous fuel visibility differs from verified-only';
  end if;
end;
$$;
reset role;

select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
set local role authenticated;
do $$
declare blocked boolean;
begin
  if (select count(*) from public.station_fuels where station_id in (
    'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    'aaaaaaa3-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
    'aaaaaaa4-aaaa-4aaa-8aaa-aaaaaaaaaaa4')) <> 2 then
    raise exception 'Authenticated fuel visibility differs from verified plus own pending';
  end if;

  blocked := false;
  begin
    insert into public.station_edit_requests (station_id, user_id, field_name, new_value)
    values ('aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1', auth.uid(), 'station_profile', '{}'::jsonb);
  exception when insufficient_privilege then blocked := true;
  end;
  if not blocked then raise exception 'Direct station edit insert was allowed'; end if;

  blocked := false;
  begin
    insert into public.station_edit_votes (edit_request_id, user_id, vote, trust_score_snapshot)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', auth.uid(), true, 0);
  exception when insufficient_privilege then blocked := true;
  end;
  if not blocked then raise exception 'Direct edit vote insert was allowed'; end if;

  blocked := false;
  begin
    insert into public.price_submissions (station_id, fuel_type_id, user_id, price, user_trust_score_snapshot)
    values ('aaaaaaa4-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
      (select id from public.fuel_types where code = 'gasolina'), auth.uid(), 5.50, 0);
  exception when raise_exception then
    if sqlerrm = 'Posto indisponível para contribuição' then blocked := true;
    else raise; end if;
  end;
  if not blocked then raise exception 'Price for rejected station was allowed'; end if;

  insert into public.price_submissions (station_id, fuel_type_id, user_id, price, user_trust_score_snapshot)
  values ('aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    (select id from public.fuel_types where code = 'gasolina'), auth.uid(), 5.50, 0);

  if public.create_station_edit_suggestion_v3(
    'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Audit Verified', 'Shell',
    'Rua Audit, 10', 'Centro', 'Belo Horizonte', 'MG', '30000-000',
    -19.91, -43.91, array['gasolina'], '{}'::text[]
  ) is null then
    raise exception 'Validated station edit RPC did not create a request';
  end if;
end;
$$;
reset role;

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
set local role authenticated;
do $$
declare blocked boolean := false;
begin
  begin
    insert into public.price_submissions (station_id, fuel_type_id, user_id, price, user_trust_score_snapshot)
    values ('aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
      (select id from public.fuel_types where code = 'gasolina'), auth.uid(), 5.50, 0);
  exception when raise_exception then
    if sqlerrm = 'Posto indisponível para contribuição' then blocked := true;
    else raise; end if;
  end;
  if not blocked then raise exception 'Price for another user pending station was allowed'; end if;
end;
$$;
reset role;

update public.user_roles set role = 'moderator'
where user_id = '22222222-2222-4222-8222-222222222222';

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.station_fuels where station_id in (
    'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    'aaaaaaa3-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
    'aaaaaaa4-aaaa-4aaa-8aaa-aaaaaaaaaaa4')) <> 4 then
    raise exception 'Moderator cannot review all station fuels';
  end if;

  insert into public.price_submissions (station_id, fuel_type_id, user_id, price, user_trust_score_snapshot)
  values ('aaaaaaa3-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
    (select id from public.fuel_types where code = 'gasolina'), auth.uid(), 5.50, 0);
end;
$$;
reset role;

rollback;
