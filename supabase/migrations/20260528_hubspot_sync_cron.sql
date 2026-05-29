-- Hourly HubSpot sync: pg_cron + pg_net invoke the sync-hubspot edge function on
-- the internal docker network. The function syncs users/subs changed in the last
-- ~2h. The shared request secret is read from Supabase Vault ('hubspot_sync_secret'),
-- so nothing sensitive is stored in cron.job.command.
--
-- Prereq: the two Vault secrets exist (see supabase/README.md):
--   select vault.create_secret('<hubspot token>', 'hubspot_private_app_token');
--   select vault.create_secret('<random>',        'hubspot_sync_secret');
--
-- Re-runnable: unschedule first so re-applying doesn't error on the existing job.

select cron.unschedule('hubspot-sync')
where exists (select 1 from cron.job where jobname = 'hubspot-sync');

select cron.schedule('hubspot-sync', '0 * * * *', $$
  select net.http_post(
    url := 'http://supabase-edge-functions:9000/sync-hubspot',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sync-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'hubspot_sync_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
$$);
