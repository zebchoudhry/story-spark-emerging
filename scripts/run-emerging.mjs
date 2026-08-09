// Daily emerging-things engine for Neon + GitHub Actions.
// 1) ingest AI/dev sources -> stories_raw
// 2) LLM-extract genuinely new/rising named things -> emerging_entities
// 3) recompute cross-source velocity + score
// 4) export top emerging -> public/radar.json
//
// Env: NEON_DATABASE_URL (or DATABASE_URL), and one LLM key:
//   GEMINI_API_KEY (direct)  OR  LOVABLE_API_KEY (Lovable gateway).
// Usage: node scripts/run-emerging.mjs [--no-ingest] [--out public/radar.json]

import pg from "pg";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { createHash } from "node:crypto";

const DB_URL = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!DB_URL) { console.error("Missing NEON_DATABASE_URL"); process.exit(1); }

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
if (!GEMINI_API_KEY && !LOVABLE_API_KEY) {
  console.error("Missing LLM key (GEMINI_API_KEY or LOVABLE_API_KEY)"); process.exit(1);
}

const args = process.argv.slice(2);
const NO_INGEST = args.includes("--no-ingest");
const GENRE = (() => { const i = args.indexOf("--genre"); return i >= 0 ? args[i + 1] : "ai"; })();
const LOOKBACK_HOURS = 72;
const FETCH_TIMEOUT_MS = 12000;

// ---------- per-genre configuration ----------
const GENRE_CONFIGS = {
  ai: {
    entityGuidance:
      `Extract only concrete, named entities that are new/newly-popular: new standards or conventions (e.g. "agents.md","llms.txt","MCP"), new tools/frameworks/SDKs, models, protocols, techniques, benchmarks, datasets, or notable new products. DO NOT extract generic topics ("AI","machine learning","chatbots"), established products with no news, vague themes, or lone people's names.`,
    types: ["standard","tool","model","protocol","technique","company","file","dataset","benchmark","concept"],
    flagLabel: "GetVisus",
    flagCriteria:
      `true if a UK small-business SEO / website-audit SaaS (GetVisus) should support or write about it — e.g. a new web standard/file/convention that sites should adopt (like agents.md, llms.txt, MCP, AI-crawler behaviour); else false`,
    fileIssues: true,
    defaultOut: "public/radar.json",
    sources: [
      { type: "rss", url: "https://openai.com/news/rss.xml", name: "OpenAI" },
      { type: "rss", url: "https://deepmind.google/blog/rss.xml", name: "Google DeepMind" },
      { type: "rss", url: "https://huggingface.co/blog/feed.xml", name: "Hugging Face" },
      { type: "rss", url: "https://github.blog/feed/", name: "GitHub Blog" },
      { type: "rss", url: "https://blog.research.google/feeds/posts/default", name: "Google Research" },
      { type: "rss", url: "https://bair.berkeley.edu/blog/feed.xml", name: "BAIR" },
      { type: "rss", url: "https://hnrss.org/frontpage?points=100", name: "Hacker News" },
      { type: "rss", url: "https://hnrss.org/show", name: "Show HN" },
      { type: "rss", url: "https://hnrss.org/newest?q=AI+OR+LLM+OR+agent", name: "HN New (AI)" },
      { type: "rss", url: "http://export.arxiv.org/rss/cs.AI", name: "arXiv cs.AI" },
      { type: "rss", url: "http://export.arxiv.org/rss/cs.CL", name: "arXiv cs.CL" },
      { type: "rss", url: "http://export.arxiv.org/rss/cs.LG", name: "arXiv cs.LG" },
      { type: "rss", url: "https://techcrunch.com/category/artificial-intelligence/feed/", name: "TechCrunch AI" },
      { type: "rss", url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml", name: "The Verge AI" },
      { type: "rss", url: "https://arstechnica.com/ai/feed/", name: "Ars Technica AI" },
      { type: "rss", url: "https://venturebeat.com/category/ai/feed/", name: "VentureBeat AI" },
      { type: "rss", url: "https://www.technologyreview.com/topic/artificial-intelligence/feed", name: "MIT Tech Review AI" },
      { type: "rss", url: "https://simonwillison.net/atom/everything/", name: "Simon Willison" },
      { type: "rss", url: "https://www.latent.space/feed", name: "Latent Space" },
      { type: "rss", url: "https://jack-clark.net/feed/", name: "Import AI" },
      { type: "rss", url: "https://www.deeplearning.ai/the-batch/feed/", name: "The Batch" },
      { type: "rss", url: "https://www.semianalysis.com/feed", name: "SemiAnalysis" },
      { type: "reddit", url: "LocalLLaMA", name: "r/LocalLLaMA" },
      { type: "reddit", url: "MachineLearning", name: "r/MachineLearning" },
      { type: "reddit", url: "artificial", name: "r/artificial" },
      { type: "reddit", url: "OpenAI", name: "r/OpenAI" },
      { type: "reddit", url: "singularity", name: "r/singularity" },
      { type: "youtube", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCbfYPyITQ-7l4upoX8nvctg", name: "Two Minute Papers" },
      { type: "youtube", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCZHmQk67mSJgfCCTn7xBfew", name: "Yannic Kilcher" },
      { type: "youtube", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCNJ1Ymd5yFuUPtn21xtRbbw", name: "AI Explained" },
    ],
  },

  // beyondtheperipheral.com — paranormal / UFO / conspiracy / cryptid / unexplained
  paranormal: {
    entityGuidance:
      `Extract specific, named, NEW or fast-rising mysteries a paranormal/unexplained blog could write about: a specific UFO/UAP sighting or disclosure, a named cryptid encounter or case, a conspiracy or coverup, a haunting/paranormal event, an unexplained disappearance or cold case, a strange scientific anomaly. Prefer concrete named cases/events over generic themes. DO NOT extract generic topics ("ghosts","aliens","UFOs" in the abstract), long-settled famous cases with no new development, or lone people's names.`,
    types: ["sighting","case","cryptid","conspiracy","phenomenon","event","location","disappearance","claim","concept"],
    flagLabel: "Story pick",
    flagCriteria:
      `true if this is a fresh, dramatic, under-reported mystery that "Beyond the Peripheral" (sensationalist investigative paranormal/UFO/conspiracy blog) should turn into an article now; else false`,
    fileIssues: false,
    defaultOut: "public/radar-beyond.json",
    sources: [
      { type: "reddit", url: "UFOs", name: "r/UFOs" },
      { type: "reddit", url: "Paranormal", name: "r/Paranormal" },
      { type: "reddit", url: "UnresolvedMysteries", name: "r/UnresolvedMysteries" },
      { type: "reddit", url: "Ghosts", name: "r/Ghosts" },
      { type: "reddit", url: "cryptids", name: "r/cryptids" },
      { type: "reddit", url: "conspiracy", name: "r/conspiracy" },
      { type: "reddit", url: "HighStrangeness", name: "r/HighStrangeness" },
      { type: "rss", url: "https://www.coasttocoastam.com/rss/weird-news/", name: "Coast to Coast AM" },
      { type: "rss", url: "https://mysteriousuniverse.org/feed/", name: "Mysterious Universe" },
      { type: "rss", url: "https://www.theblackvault.com/casefiles/feed/", name: "The Black Vault" },
      { type: "rss", url: "https://openminds.tv/feed/", name: "Open Minds UFO" },
      { type: "rss", url: "https://www.latest-ufo-sightings.net/feed/atom", name: "Latest UFO Sightings" },
      { type: "rss", url: "https://www.earthfiles.com/feed/", name: "Earthfiles" },
      { type: "rss", url: "https://feeds.feedburner.com/TheUFOChronicles", name: "The UFO Chronicles" },
      { type: "rss", url: "https://cryptomundo.com/feed/", name: "Cryptomundo" },
      { type: "rss", url: "https://www.phantomsandmonsters.com/feeds/posts/default?alt=rss", name: "Phantoms and Monsters" },
      { type: "rss", url: "https://weekinweird.com/feed/", name: "Week in Weird" },
      { type: "rss", url: "https://www.ancient-origins.net/rss.xml", name: "Ancient Origins" },
      { type: "rss", url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml", name: "BBC Science" },
      { type: "rss", url: "https://www.livescience.com/feeds/all", name: "Live Science" },
      { type: "rss", url: "https://www.sciencedaily.com/rss/strange_offbeat.xml", name: "Science Daily Strange" },
      { type: "rss", url: "https://www.dailystar.co.uk/news/weird-news/rss", name: "Daily Star Weird" },
      { type: "rss", url: "https://www.mirror.co.uk/news/weird-news/rss.xml", name: "Mirror Weird" },
      { type: "rss", url: "https://www.atlasobscura.com/feeds/latest", name: "Atlas Obscura" },
      { type: "youtube", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UC7WMgAJFGFqNQP-5LbPE7FA", name: "The Why Files" },
      { type: "youtube", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCuHn_E6xPuhI_jiOvQXaVIg", name: "The Black Vault" },
      { type: "youtube", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCtPrkXdtCM5DACLufB9jbsA", name: "MrBallen" },
    ],
  },
};

const cfg = GENRE_CONFIGS[GENRE];
if (!cfg) { console.error(`Unknown genre '${GENRE}'. Known: ${Object.keys(GENRE_CONFIGS).join(", ")}`); process.exit(1); }
const SOURCES = cfg.sources;
const VALID_TYPES = cfg.types;
const OUT = (() => { const i = args.indexOf("--out"); return i >= 0 ? args[i + 1] : cfg.defaultOut; })();

// ---------- helpers ----------
const sha256 = (s) => createHash("sha256").update(s).digest("hex");
const domain = (u) => { try { return new URL(u).hostname.replace("www.",""); } catch { return "unknown"; } };
const normalize = (s) => (s||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");

async function fetchTimeout(url, opts = {}) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), FETCH_TIMEOUT_MS);
  try { return await fetch(url, { ...opts, signal: c.signal }); }
  finally { clearTimeout(t); }
}

function parseRSS(xml) {
  const items = [];
  const blocks = xml.match(/<(item|entry)[^>]*>[\s\S]*?<\/(item|entry)>/gi) || [];
  for (const b of blocks) {
    const title = b.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1]?.trim() || "";
    let link = b.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i)?.[1]?.trim() || "";
    if (!link) link = b.match(/<link[^>]*href="([^"]+)"/i)?.[1]?.trim() || "";
    const desc = b.match(/<(?:description|summary|content)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:description|summary|content)>/i)?.[1]?.trim() || "";
    const pub = b.match(/<(?:pubDate|updated|published)[^>]*>([\s\S]*?)<\/(?:pubDate|updated|published)>/i)?.[1]?.trim() || "";
    if (title && link) items.push({ title, link, description: desc.replace(/<[^>]+>/g," ").trim(), pubDate: pub });
  }
  return items;
}

async function fetchReddit(sub) {
  for (const u of [`https://www.reddit.com/r/${sub}/new.json?limit=20`, `https://old.reddit.com/r/${sub}/new.json?limit=20`]) {
    try {
      const r = await fetchTimeout(u, { headers: { "User-Agent": "EmergingRadar/1.0", Accept: "application/json" } });
      if (!r.ok) continue;
      const d = await r.json();
      if (d?.data?.children) return d.data.children;
    } catch { /* next */ }
  }
  return [];
}

// ---------- LLM (with 429 retry/backoff for free-tier rate limits) ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function llmOnce(system, user) {
  if (GEMINI_API_KEY) {
    const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
      { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
        }) });
    if (r.status === 429) { const e = new Error("429"); e.status = 429; e.body = await r.text(); throw e; }
    if (!r.ok) throw new Error(`Gemini ${r.status}: ${await r.text()}`);
    const d = await r.json();
    return d.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  }
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST", headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: process.env.LOVABLE_MODEL || "google/gemini-2.5-flash",
      messages: [{ role: "system", content: system }, { role: "user", content: user }] }) });
  if (r.status === 429) { const e = new Error("429"); e.status = 429; e.body = await r.text(); throw e; }
  if (!r.ok) throw new Error(`Lovable ${r.status}: ${await r.text()}`);
  const d = await r.json();
  return d.choices?.[0]?.message?.content ?? "";
}

async function llmJSON(system, user) {
  const MAX = 4;
  for (let attempt = 1; attempt <= MAX; attempt++) {
    try {
      return await llmOnce(system, user);
    } catch (e) {
      if (e.status === 429 && attempt < MAX) {
        // honour server retryDelay if present, else exponential backoff (cap 30s)
        const m = (e.body || "").match(/"retryDelay":\s*"(\d+(?:\.\d+)?)s"/);
        const wait = Math.min(30000, m ? Math.ceil(parseFloat(m[1]) * 1000) + 1000 : attempt * 8000);
        console.warn(`[llm] 429 rate-limited, waiting ${Math.round(wait/1000)}s (attempt ${attempt}/${MAX})`);
        await sleep(wait);
        continue;
      }
      throw e;
    }
  }
}

// ---------- main ----------
// Neon free computes get recycled if a connection sits idle. LLM detection can
// wait minutes on rate limits, so we hold the DB connection ONLY around actual
// queries: connect for ingest+read, disconnect during LLM, reconnect for writes.
const { Client } = pg;
async function connectDB() {
  const c = new Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false },
    keepAlive: true,
    statement_timeout: 0,
    query_timeout: 0,
  });
  c.on("error", (e) => console.warn(`[db] client error: ${e.message}`));
  await c.connect();
  return c;
}
let client = await connectDB();

// schema
await client.query(await readFile(new URL("./schema.sql", import.meta.url), "utf8"));

// Batch-insert stories to keep round-trips (and total connection time) low —
// Neon drops long single connections doing thousands of one-row inserts.
async function insertStories(rows) {
  if (rows.length === 0) return 0;
  // de-dupe within batch by (source_type, external_id)
  const seen = new Set();
  const uniq = rows.filter((r) => {
    const k = `${r[1]}::${r[3]}`;
    if (seen.has(k)) return false; seen.add(k); return true;
  });
  let inserted = 0;
  const COLS = 8;
  const CHUNK = 500;
  for (let i = 0; i < uniq.length; i += CHUNK) {
    const slice = uniq.slice(i, i + CHUNK);
    const values = slice.map((_, j) => {
      const b = j * COLS;
      return `($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},$${b+6},$${b+7},$${b+8})`;
    }).join(",");
    const params = slice.flat();
    const res = await client.query(
      `INSERT INTO stories_raw (genre_id, source_type, source_name, external_id, title, body, url, published_at)
       VALUES ${values} ON CONFLICT (source_type, external_id) DO NOTHING`, params);
    inserted += res.rowCount;
  }
  return inserted;
}

let ingested = 0;
if (!NO_INGEST) {
  const batch = [];
  for (const s of SOURCES) {
    try {
      if (s.type === "reddit") {
        const posts = await fetchReddit(s.url);
        for (const p of posts) {
          const d = p.data; if (!d?.id || !d?.title) continue;
          batch.push([GENRE, "reddit", s.name, d.id, d.title, d.selftext ?? "",
            `https://reddit.com${d.permalink}`,
            new Date((d.created_utc ?? Date.now()/1000) * 1000).toISOString()]);
        }
      } else {
        const r = await fetchTimeout(s.url, { headers: { "User-Agent": "EmergingRadar/1.0" } });
        if (!r.ok) { console.warn(`RSS ${s.name} -> ${r.status}`); continue; }
        const items = parseRSS(await r.text());
        for (const it of items) {
          const pub = it.pubDate ? new Date(it.pubDate) : null;
          batch.push([GENRE, s.type, s.name || domain(s.url), sha256(it.link), it.title,
            it.description || null, it.link, pub && !isNaN(pub) ? pub.toISOString() : null]);
        }
      }
    } catch (e) { console.warn(`source ${s.name} failed: ${e.message}`); }
  }
  ingested = await insertStories(batch);
  console.log(`[ingest] fetched ${batch.length} items, new stories: ${ingested}`);
}

// pull recent stories
const since = new Date(Date.now() - LOOKBACK_HOURS * 3600 * 1000).toISOString();
const { rows: stories } = await client.query(
  `SELECT id, title, body, url, source_name, published_at, created_at
     FROM stories_raw WHERE genre_id=$1 AND created_at >= $2
     ORDER BY created_at DESC LIMIT 120`, [GENRE, since]);
console.log(`[detect] scanning ${stories.length} recent stories`);

// Release the DB during the (possibly slow, rate-limited) LLM phase.
await client.end();

const SYSTEM = `You spot GENUINELY NEW or fast-rising named "things" worth acting on early.
Given a numbered list of stories, ${cfg.entityGuidance}
Return ONLY a JSON array. Each item:
- name (canonical display)
- normalized_name (lowercase slug, merge aliases)
- entity_type (one of ${VALID_TYPES.join(", ")})
- why_it_matters (1-2 concrete sentences)
- getvisus_relevant (${cfg.flagCriteria})
- getvisus_reason (1 sentence if relevant, else null)
- story_indices (array of the story numbers that mention it)`;

const candidates = [];
for (let start = 0; start < stories.length; start += 50) {
  const chunk = stories.slice(start, start + 50);
  const list = chunk.map((s, i) => {
    const snip = (s.body ?? "").replace(/\s+/g," ").slice(0, 180);
    return `[${start + i}] ${s.title} — ${s.source_name}${snip ? `\n    ${snip}` : ""}`;
  }).join("\n");
  try {
    const txt = await llmJSON(SYSTEM, `Stories:\n${list}`);
    const m = txt.match(/\[[\s\S]*\]/);
    if (!m) continue;
    for (const e of JSON.parse(m[0])) {
      if (!e?.name) continue;
      const idxs = (e.story_indices ?? []).map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n < stories.length);
      candidates.push({ ...e, idxs });
    }
  } catch (e) { console.warn(`chunk ${start} failed: ${e.message}`); }
  await new Promise((r) => setTimeout(r, 1200)); // gentle on free-tier rate limits
}
console.log(`[detect] candidates: ${candidates.length}`);

// merge by normalized_name
const merged = new Map();
for (const e of candidates) {
  const key = normalize(e.normalized_name) || normalize(e.name);
  if (!key) continue;
  const ex = merged.get(key);
  if (ex) {
    ex.idxs = [...new Set([...ex.idxs, ...e.idxs])];
    ex.getvisus_relevant = ex.getvisus_relevant || e.getvisus_relevant;
    if (!ex.getvisus_reason && e.getvisus_reason) ex.getvisus_reason = e.getvisus_reason;
    if (!ex.why_it_matters && e.why_it_matters) ex.why_it_matters = e.why_it_matters;
  } else merged.set(key, { ...e, key });
}

// reconnect for the write phase
client = await connectDB();

// upsert + mentions + aggregates
let upserted = 0;
for (const [key, e] of merged) {
  const type = VALID_TYPES.includes(e.entity_type) ? e.entity_type : "concept";
  const { rows: [row] } = await client.query(
    `INSERT INTO emerging_entities (genre_id,name,normalized_name,entity_type,why_it_matters,getvisus_relevant,getvisus_reason)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (genre_id,normalized_name) DO UPDATE SET
       name=EXCLUDED.name, entity_type=EXCLUDED.entity_type,
       why_it_matters=COALESCE(EXCLUDED.why_it_matters, emerging_entities.why_it_matters),
       getvisus_relevant=emerging_entities.getvisus_relevant OR EXCLUDED.getvisus_relevant,
       getvisus_reason=COALESCE(EXCLUDED.getvisus_reason, emerging_entities.getvisus_reason),
       updated_at=now()
     RETURNING id`,
    [GENRE, e.name, key, type, e.why_it_matters ?? null, !!e.getvisus_relevant, e.getvisus_reason ?? null]);
  upserted++;
  const id = row.id;
  for (const i of e.idxs) {
    const s = stories[i]; if (!s) continue;
    await client.query(
      `INSERT INTO emerging_mentions (entity_id,raw_story_id,source_name,url,seen_at)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (entity_id,raw_story_id) DO NOTHING`,
      [id, s.id, s.source_name, s.url, s.published_at ?? s.created_at]);
  }
  // recompute
  const { rows: ms } = await client.query(
    `SELECT source_name, url, seen_at FROM emerging_mentions WHERE entity_id=$1`, [id]);
  const times = ms.map((m) => new Date(m.seen_at).getTime()).filter((t) => !isNaN(t));
  const first = times.length ? new Date(Math.min(...times)) : new Date();
  const last = times.length ? new Date(Math.max(...times)) : new Date();
  const dayAgo = Date.now() - 864e5;
  const vel = times.filter((t) => t >= dayAgo).length;
  const srcCount = new Set(ms.map((m) => m.source_name).filter(Boolean)).size;
  const urls = [...new Set(ms.map((m) => m.url).filter(Boolean))].slice(0, 5);
  const ageDays = (Date.now() - first.getTime()) / 864e5;
  const stale = (Date.now() - last.getTime()) / 864e5;
  const status = stale > 7 ? "fading" : ageDays <= 2 ? "new" : (vel >= 2 || srcCount >= 3) ? "rising" : "established";
  const novelty = Math.max(0.2, 1.5 - ageDays / 7);
  const score = Math.round((vel * 2 + ms.length + srcCount * 3) * novelty * 100) / 100;
  await client.query(
    `UPDATE emerging_entities SET mention_count=$1, source_count=$2, velocity_24h=$3,
       first_seen_at=$4, last_seen_at=$5, status=$6, emerging_score=$7, sample_urls=$8, updated_at=now()
     WHERE id=$9`,
    [ms.length, srcCount, vel, first.toISOString(), last.toISOString(), status, score, urls, id]);
}
console.log(`[detect] entities upserted: ${upserted}`);

// export radar.json (top, non-fading)
const { rows: top } = await client.query(
  `SELECT name, entity_type, why_it_matters, getvisus_relevant, getvisus_reason,
          first_seen_at, last_seen_at, mention_count, source_count, velocity_24h,
          emerging_score, status, sample_urls
     FROM emerging_entities
    WHERE genre_id=$1 AND status <> 'fading'
    ORDER BY emerging_score DESC LIMIT 60`, [GENRE]);

const out = { generated_at: new Date().toISOString(), genre: GENRE, flag_label: cfg.flagLabel, count: top.length, items: top };
await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(out, null, 2));
console.log(`[export] wrote ${top.length} items -> ${OUT}`);

// ---------- auto-task: open a GitHub issue per NEW GetVisus-relevant hit ----------
// GitHub emails the repo owner on new issues, so this doubles as the alert.
// Runs only in CI (needs GITHUB_TOKEN + GITHUB_REPOSITORY). Each hit files once.
const GH_TOKEN = process.env.GITHUB_TOKEN;
const GH_REPO = process.env.GITHUB_REPOSITORY; // "owner/repo"
if (GH_TOKEN && GH_REPO && cfg.fileIssues) {
  const { rows: hits } = await client.query(
    `SELECT id, name, entity_type, why_it_matters, getvisus_reason, emerging_score,
            source_count, velocity_24h, status, sample_urls
       FROM emerging_entities
      WHERE genre_id=$1 AND getvisus_relevant = true AND getvisus_issued = false
        AND status <> 'fading'
      ORDER BY emerging_score DESC`, [GENRE]);
  console.log(`[getvisus] new hits to file: ${hits.length}`);
  for (const h of hits) {
    const srcs = (h.sample_urls || []).map((u) => `- ${u}`).join("\n") || "(none)";
    const body =
      `**Emerging thing flagged for GetVisus**\n\n` +
      `**${h.name}** _(${h.entity_type}, ${h.status})_\n\n` +
      `**Why it matters:** ${h.why_it_matters ?? "—"}\n\n` +
      `**GetVisus angle:** ${h.getvisus_reason ?? "—"}\n\n` +
      `Score ${h.emerging_score} · ${h.source_count} sources · ${h.velocity_24h} in 24h\n\n` +
      `**Sources:**\n${srcs}\n\n` +
      `_Filed automatically by the Emerging Radar._`;
    try {
      const r = await fetch(`https://api.github.com/repos/${GH_REPO}/issues`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GH_TOKEN}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "User-Agent": "emerging-radar",
        },
        body: JSON.stringify({
          title: `GetVisus radar: ${h.name}`,
          body,
          labels: ["getvisus-hit", "emerging-radar"],
        }),
      });
      if (r.ok) {
        const issue = await r.json();
        await client.query(`UPDATE emerging_entities SET getvisus_issued = true WHERE id=$1`, [h.id]);
        console.log(`[getvisus] issue #${issue.number} for ${h.name}`);
      } else {
        console.warn(`[getvisus] issue failed for ${h.name}: ${r.status} ${await r.text()}`);
      }
    } catch (e) {
      console.warn(`[getvisus] issue error for ${h.name}: ${e.message}`);
    }
  }
} else {
  console.log("[getvisus] skipping issue filing (no GITHUB_TOKEN/GITHUB_REPOSITORY — local run)");
}

await client.end();
console.log("done.");
