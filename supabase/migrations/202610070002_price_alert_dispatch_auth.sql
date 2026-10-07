-- Keep the dispatch credential inside the database. The scheduler can read it
-- from Vault; the Edge Function only receives it in the request header.
select vault.create_secret(
  replace(extensions.gen_random_uuid()::text, '-', '') || replace(extensions.gen_random_uuid()::text, '-', ''),
  'botali_price_alert_dispatch'
) where not exists (
  select 1 from vault.secrets where name = 'botali_price_alert_dispatch'
);

create or replace function public.price_alert_dispatch_authorized(candidate text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select candidate is not null and exists (
    select 1 from vault.decrypted_secrets
    where name = 'botali_price_alert_dispatch'
      and decrypted_secret = candidate
  );
$$;

revoke all on function public.price_alert_dispatch_authorized(text) from public, anon, authenticated;
grant execute on function public.price_alert_dispatch_authorized(text) to service_role;
