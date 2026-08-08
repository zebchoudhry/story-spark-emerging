-- Daily "emerging things" pipeline for the AI genre.
-- Runs once a day: ingest AI sources -> process into cards -> detect emerging entities.
--
-- BEFORE RUNNING: replace YOUR_INGEST_SECRET with the INGEST_SECRET value from
-- Supabase Dashboard > Project Settings > Edge Functions > Secrets.
-- Requires pg_cron + pg_net (enabled in 20251214211221).

-- 1. Ingest AI sources daily at 07:00 UTC
SELECT cron.schedule(
  'ai-ingest-daily',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url := 'https://cqkavbgoxilopaohjybr.supabase.co/functions/v1/ingest-stories',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'YOUR_INGEST_SECRET'
    ),
    body := jsonb_build_object('genre_id', 'ai')
  );
  $$
);
-- ingest-stories has a built-in AI source list, so {genre_id:'ai'} is enough.

-- 2. Process raw AI stories into cards 15 min later
SELECT cron.schedule(
  'ai-process-daily',
  '15 7 * * *',
  $$
  SELECT net.http_post(
    url := 'https://cqkavbgoxilopaohjybr.supabase.co/functions/v1/process-stories-batch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'YOUR_INGEST_SECRET'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 3. Detect emerging entities 35 min after ingest
SELECT cron.schedule(
  'ai-detect-emerging-daily',
  '35 7 * * *',
  $$
  SELECT net.http_post(
    url := 'https://cqkavbgoxilopaohjybr.supabase.co/functions/v1/detect-emerging',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'YOUR_INGEST_SECRET'
    ),
    body := jsonb_build_object('genre_id', 'ai')
  );
  $$
);
