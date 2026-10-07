-- Signing out detaches this device, but does not revoke the account's push preference.
-- A permitted device is registered again when that account signs in.
create or replace function public.remove_my_price_alert_device()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  delete from private.price_alert_devices where user_id = (select auth.uid());
end;
$$;
revoke execute on function public.remove_my_price_alert_device() from public, anon;
grant execute on function public.remove_my_price_alert_device() to authenticated;
