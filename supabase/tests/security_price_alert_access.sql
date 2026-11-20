-- Run only against the disposable local migration replay.
begin;

create or replace function auth.uid()
returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;

insert into auth.users (id, email, raw_user_meta_data) values
  ('66666666-6666-4666-8666-666666666666', 'alert-one@example.invalid', '{}'::jsonb);

do $$ begin
  if has_table_privilege('authenticated', 'private.price_alert_devices', 'SELECT')
     or has_table_privilege('authenticated', 'private.price_alert_devices', 'INSERT')
     or has_table_privilege('anon', 'private.price_alert_devices', 'SELECT') then
    raise exception 'Push tokens are directly accessible';
  end if;
  if has_function_privilege('authenticated', 'public.price_alert_dispatch_authorized(text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.price_alert_dispatch_authorized(text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.pending_price_alert_pushes(integer)', 'EXECUTE')
     or has_function_privilege('anon', 'public.pending_price_alert_pushes(integer)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.mark_price_alert_push_result(uuid,text,text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.mark_price_alert_push_result(uuid,text,text)', 'EXECUTE') then
    raise exception 'Alert dispatch functions are callable from the app';
  end if;
end $$;

select set_config('request.jwt.claim.sub', '66666666-6666-4666-8666-666666666666', true);
set local role authenticated;
do $$
declare blocked boolean := false;
begin
  begin
    perform public.register_my_price_alert_device('invalid-token');
  exception when raise_exception then
    if sqlerrm = 'Invalid push token' then blocked := true;
    else raise; end if;
  end;
  if not blocked then raise exception 'Invalid push token was accepted'; end if;
  perform public.register_my_price_alert_device('ExpoPushToken[ABCDEFGHIJKLMNOPQRST]');
end $$;
reset role;

do $$ begin
  if (select count(*) from private.price_alert_devices
      where user_id = '66666666-6666-4666-8666-666666666666'
      and expo_push_token = 'ExpoPushToken[ABCDEFGHIJKLMNOPQRST]') <> 1 then
    raise exception 'Push token was not assigned to the signed-in account';
  end if;
end $$;

rollback;
