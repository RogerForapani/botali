# Price alert dispatch

Deploy this function with JWT verification disabled and a long random dispatch secret stored in Supabase Vault. The function verifies the incoming `x-botali-alert-secret` through a service-role-only RPC before processing alerts. Never expose this secret or the service role key in the mobile app.

Apply `202610070001_price_alerts.sql` first. Then schedule a server-side invocation every few minutes with `pg_cron` + `pg_net`; keep both the invocation URL and header secret in Supabase Vault. The homologation-only activation and rollback SQL live in `supabase/operations/`. Production scheduling requires a separate release decision.

The worker sends at most 50 Expo messages per invocation, then checks delivery receipts at least 15 minutes later. Invalid device tokens are removed by database functions. Expo/Firebase/APNs credentials need to be configured and tested in a new native build; publishing a JavaScript OTA alone cannot supply missing native credentials.
