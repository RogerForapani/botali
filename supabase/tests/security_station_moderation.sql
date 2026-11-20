-- Run only against the disposable local migration replay.
-- Two synthetic accounts create and moderate a station, then roll back.
begin;

create or replace function auth.uid()
returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;

insert into auth.users (id, email, raw_user_meta_data) values
  ('33333333-3333-4333-8333-333333333333', 'moderation-author@example.invalid', '{}'::jsonb),
  ('44444444-4444-4444-8444-444444444444', 'moderation-reviewer@example.invalid', '{}'::jsonb),
  ('55555555-5555-4555-8555-555555555555', 'moderation-other@example.invalid', '{}'::jsonb);

select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
set local role authenticated;
select public.create_station_suggestion(
  'Audit Pending Station', 'Shell', 'Rua de Teste, 123', 'Centro',
  'Belo Horizonte', 'MG', '30000-000', -19.801, -43.801,
  array['gasolina'], '{}'::text[]
);
do $$ begin
  if (select count(*) from public.stations where name = 'Audit Pending Station' and status = 'pending') <> 1 then
    raise exception 'Author cannot see own pending station';
  end if;
end $$;
reset role;

set local role anon;
do $$ begin
  if exists (select 1 from public.stations where name = 'Audit Pending Station') then
    raise exception 'Visitor can see pending station';
  end if;
end $$;
reset role;

select set_config('request.jwt.claim.sub', '55555555-5555-4555-8555-555555555555', true);
set local role authenticated;
do $$
declare blocked boolean := false;
begin
  if exists (select 1 from public.stations where name = 'Audit Pending Station') then
    raise exception 'Another user can see pending station';
  end if;
  begin
    perform public.moderate_station(
      (select id from public.stations where name = 'Audit Pending Station'), 'verified', null
    );
  exception when raise_exception then
    if sqlerrm = 'Moderator access required' then blocked := true;
    else raise; end if;
  end;
  if not blocked then raise exception 'Ordinary user could moderate station'; end if;
end $$;
reset role;

update public.user_roles set role = 'moderator'
where user_id = '44444444-4444-4444-8444-444444444444';
select set_config('request.jwt.claim.sub', '44444444-4444-4444-8444-444444444444', true);
set local role authenticated;
do $$
declare pending_id uuid;
begin
  select id into pending_id from public.stations where name = 'Audit Pending Station' and status = 'pending';
  if pending_id is null then raise exception 'Moderator cannot see pending station'; end if;
  perform public.moderate_station(pending_id, 'verified', null);
  if (select status from public.stations where id = pending_id) <> 'verified' then
    raise exception 'Approved station was not published';
  end if;
  if not exists (select 1 from public.station_moderation_actions where station_id = pending_id and moderator_id = auth.uid()) then
    raise exception 'Moderation action was not recorded';
  end if;
end $$;
reset role;

set local role anon;
do $$ begin
  if (select count(*) from public.stations where name = 'Audit Pending Station' and status = 'verified') <> 1 then
    raise exception 'Approved station is not visible to visitor';
  end if;
end $$;
reset role;

rollback;
