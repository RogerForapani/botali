-- A one-shot database-side caller for the Edge Function. The destination URL
-- is stored separately in Vault per environment; no project URL is baked in.
create extension if not exists pg_net with schema extensions;

create or replace function private.request_price_alert_dispatch()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  endpoint text;
  dispatch_secret text;
  request_id bigint;
begin
  select decrypted_secret into endpoint
  from vault.decrypted_secrets
  where name = 'botali_price_alert_dispatch_url';
  select decrypted_secret into dispatch_secret
  from vault.decrypted_secrets
  where name = 'botali_price_alert_dispatch';

  if endpoint is null or dispatch_secret is null then
    raise exception 'Price alert dispatch is not configured';
  end if;

  select net.http_post(
    url := endpoint,
    headers := pg_catalog.jsonb_build_object(
      'Content-Type', 'application/json',
      'x-botali-alert-secret', dispatch_secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  ) into request_id;
  return request_id;
end;
$$;

revoke all on function private.request_price_alert_dispatch() from public, anon, authenticated;
