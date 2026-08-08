# Emerging Radar — deploy guide

The daily "find emerging things" pipeline for the **AI & Dev** genre. It ingests AI
sources, processes them into cards, then detects newly-appearing named things
(standards, tools, models, protocols, file conventions like `agents.md`) and ranks
them by cross-source velocity on the **Emerging Radar** page (`/app/radar`).

## What was added

| Piece | Path |
|---|---|
| AI & Dev genre + sources | `src/config/genres.ts` (`ai`) |
| AI categories in processors | `supabase/functions/process-story`, `process-stories-batch` |
| Built-in AI sources for ingest | `supabase/functions/ingest-stories` (`GENRE_SOURCES.ai`) |
| Emerging detector | `supabase/functions/detect-emerging` |
| DB tables + enums | `supabase/migrations/20260808120000_add_emerging.sql` |
| Daily cron (1×/day) | `supabase/migrations/20260808130000_daily_emerging_cron.sql` |
| Radar UI | `src/pages/EmergingRadar.tsx` + route `/app/radar` + nav link |
| Writer app (combined into repo) | `signalforge/` |

## How it works

1. **07:00 UTC** — `ingest-stories` pulls the AI source list into `stories_raw`.
2. **07:15 UTC** — `process-stories-batch` turns raw stories into `story_cards`.
3. **07:35 UTC** — `detect-emerging` reads the last 72h of AI stories, asks the LLM
   to extract genuinely new/rising named entities, and upserts them into
   `emerging_entities` with first-seen date + 24h velocity + cross-source count.
4. An entity is flagged **new / rising** and floats up the radar by
   `emerging_score = (velocity*2 + mentions + sources*3) * noveltyBoost`.
   `getvisus_relevant` marks web standards/conventions a site should adopt.

That scoring is exactly what would have surfaced `agents.md`: a brand-new named
file convention appearing across several sources within a short window.

## Deploy steps

Prereq: Supabase CLI linked to project `cqkavbgoxilopaohjybr`.

```bash
# 1. Push migrations (tables + enum values + cron)
supabase db push

# 2. Deploy the new + changed edge functions
supabase functions deploy ingest-stories
supabase functions deploy process-stories-batch
supabase functions deploy detect-emerging

# 3. Secrets (once). detect-emerging reuses these:
#    INGEST_SECRET, LOVABLE_API_KEY, SUPABASE_SERVICE_ROLE_KEY,
#    SUPABASE_ANON_KEY, SUPABASE_URL   (SUPABASE_* are auto-set by Supabase)
supabase secrets set INGEST_SECRET=xxxxx LOVABLE_API_KEY=xxxxx
```

Before running the cron migration, replace `YOUR_INGEST_SECRET` in
`20260808130000_daily_emerging_cron.sql` with the real `INGEST_SECRET`.

## Frontend

```bash
cp .env.example .env   # fill VITE_SUPABASE_ANON_KEY + VITE_SIGNALFORGE_URL
npm install && npm run build
```

Open `/app/radar`. **Scan now** re-runs `detect-emerging` on demand (works for any
logged-in user; the daily cron uses the secret). **Draft post** opens SignalForge
(`VITE_SIGNALFORGE_URL`) with the topic prefilled.

## Known follow-ups

- `supabase/config.toml` has `project_id = "ezpjcjhkzffpfhhfnqfv"` but `.env` /
  `.temp` / cron all use `cqkavbgoxilopaohjybr`. Confirm which is live and make
  them consistent before `supabase link`.
- `signalforge/` is React 19 + `@google/genai`; the main app is React 18 + Lovable
  gateway. They ship in one repo but build separately (kept apart on purpose —
  a deep React-version merge was high-risk for no functional gain). The radar
  reaches the writer via `VITE_SIGNALFORGE_URL`, same deep-link contract it already
  used.
- Some RSS feed URLs in the AI source list may 404 over time; check the
  `failed_feeds` count in the `ingest-stories` response and prune.
