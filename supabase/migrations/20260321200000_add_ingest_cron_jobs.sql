-- Cron jobs for ingest-stories and process-stories-batch
-- Requires: pg_cron and pg_net (already enabled in 20251214211221)
--
-- BEFORE RUNNING: Replace YOUR_INGEST_SECRET with your actual INGEST_SECRET
-- from Supabase Dashboard > Project Settings > Edge Functions > Secrets

-- 1. Ingest stories every 6 hours (00:00, 06:00, 12:00, 18:00 UTC)
SELECT cron.schedule(
  'ingest-stories-hourly',
  '0 0,6,12,18 * * *',
  $$
  SELECT net.http_post(
    url := 'https://cqkavbgoxilopaohjybr.supabase.co/functions/v1/ingest-stories',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'YOUR_INGEST_SECRET'
    ),
    body := '{"genre_id": "paranormal"}'
  );
  $$
);

-- 2. Process raw stories 10 minutes after ingest (catches new stories)
SELECT cron.schedule(
  'process-stories-batch',
  '10 0,6,12,18 * * *',
  $$
  SELECT net.http_post(
    url := 'https://cqkavbgoxilopaohjybr.supabase.co/functions/v1/process-stories-batch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'YOUR_INGEST_SECRET'
    ),
    body := '{}'
  );
  $$
);
