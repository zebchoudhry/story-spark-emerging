# Emerging Radar on Neon + GitHub Actions (free, no Supabase)

The engine that finds newly-emerging AI/dev things (standards, tools, models,
file conventions like `agents.md`) and ranks them by cross-source velocity —
running entirely on free tiers, without a Supabase project.

## Architecture

```
GitHub Action (daily 07:00 UTC)
  └─ scripts/run-emerging.mjs
       ├─ ingest AI/dev sources (RSS, Reddit, YouTube) ──► Neon: stories_raw
       ├─ LLM extract new/rising named things           ──► Neon: emerging_entities
       ├─ recompute velocity + score                    ──► Neon: emerging_mentions
       └─ export top ──► public/radar.json (committed) + GitHub Pages viewer
Frontend radar page fetches radar.json (no live DB in the browser)
```

Neon holds the memory needed to measure "emerging" (first-seen date + velocity
across days). The browser never touches Neon — only the Action does, using repo
secrets. `radar.json` is the only thing the UI reads.

## Pieces

| Piece | Path |
|---|---|
| Neon schema | `scripts/schema.sql` |
| Engine (ingest + detect + export) | `scripts/run-emerging.mjs` |
| Static public viewer | `scripts/viewer.html` |
| Daily workflow | `.github/workflows/emerging-daily.yml` |
| React radar page (reads radar.json) | `src/pages/EmergingRadar.tsx` |

## Setup (one-time)

Neon project already created: `story-spark` (`nameless-waterfall-47677582`,
region aws-eu-central-1). Schema already applied.

1. **Secrets** on the GitHub repo (`zebchoudhry/story-spark-emerging`):
   - `NEON_DATABASE_URL` — **set** ✅
   - `GEMINI_API_KEY` — **needed** (free from https://aistudio.google.com).
     Alternatively set `LOVABLE_API_KEY` to use the Lovable gateway instead.

   ```bash
   gh secret set GEMINI_API_KEY -R zebchoudhry/story-spark-emerging -b "AIza..."
   ```

2. **Enable GitHub Pages** (for the public viewer): repo Settings → Pages →
   Source = **GitHub Actions**. (Optional — `radar.json` is also committed to the
   repo regardless.)

## Run it

- **Manual**: repo → Actions → *Emerging Radar (daily)* → **Run workflow**,
  or `gh workflow run "Emerging Radar (daily)" -R zebchoudhry/story-spark-emerging`.
- **Automatic**: every day at 07:00 UTC.
- **Local**:
  ```bash
  cd scripts && npm install
  NEON_DATABASE_URL="postgres://..." GEMINI_API_KEY="AIza..." node run-emerging.mjs
  ```
  Writes `public/radar.json`. Open `scripts/viewer.html?src=../public/radar.json`.

## Viewing

- **Public viewer**: the Pages URL after the first successful run
  (`https://zebchoudhry.github.io/story-spark-emerging/`).
- **In the app**: `/app/radar` fetches `/radar.json`. Set `VITE_RADAR_JSON_URL`
  if you host radar.json elsewhere (e.g. the Pages URL). `VITE_SIGNALFORGE_URL`
  controls where "Draft post" opens.

## Notes

- The old Supabase migrations/edge functions (`supabase/`) are unused in this
  path — kept for if you return to Supabase. This Neon path is self-contained.
- Neon free tier auto-suspends compute when idle; the daily Action wakes it.
- If some RSS feeds 404 over time, the run logs `source ... failed` and continues.
