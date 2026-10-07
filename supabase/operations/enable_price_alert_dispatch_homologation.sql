-- Homologation only. Do not apply this operational schedule in production
-- until the separate release checklist is approved.
-- The function reads the endpoint and authorization secret from Vault.
create extension if not exists pg_cron with schema pg_catalog;

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'botali-price-alert-dispatch-preview') then
    perform cron.schedule(
      'botali-price-alert-dispatch-preview',
      '*/5 * * * *',
      'select private.request_price_alert_dispatch();'
    );
  end if;
end;
$$;
