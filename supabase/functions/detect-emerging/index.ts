import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// detect-emerging
// Scans recent raw stories for a genre, uses the LLM to extract genuinely NEW /
// fast-rising named "things" (standards, tools, models, protocols, file
// conventions like "agents.md"), then tracks their cross-source velocity so the
// truly emerging ones float to the top of the Emerging Radar.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const LOOKBACK_HOURS = 72;
const MAX_STORIES = 120; // cap sent to the LLM per run
const CHUNK_SIZE = 30; // stories per LLM call

interface RawStory {
  id: string;
  title: string;
  body: string | null;
  url: string | null;
  source_name: string;
  published_at: string | null;
  created_at: string;
}

interface ExtractedEntity {
  name: string;
  normalized_name: string;
  entity_type: string;
  why_it_matters: string;
  getvisus_relevant: boolean;
  getvisus_reason: string | null;
  story_indices: number[];
}

const VALID_TYPES = [
  "standard", "tool", "model", "protocol", "technique",
  "company", "file", "dataset", "benchmark", "concept",
];

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // --- Auth: accept the cron secret OR an authenticated Supabase user ---
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const cronSecret = req.headers.get("x-cron-secret");
  const expectedSecret = Deno.env.get("INGEST_SECRET");
  let authorized = !!cronSecret && cronSecret === expectedSecret;

  if (!authorized) {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (authHeader.startsWith("Bearer ")) {
      try {
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data } = await userClient.auth.getUser();
        authorized = !!data?.user;
      } catch (_) {
        authorized = false;
      }
    }
  }

  if (!authorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let genreId = "ai";
  if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
    try {
      const body = await req.json().catch(() => ({}));
      genreId = body.genre_id ?? "ai";
    } catch (_) { /* use default */ }
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // 1. Pull recent raw stories for this genre
  const sinceIso = new Date(Date.now() - LOOKBACK_HOURS * 3600 * 1000).toISOString();
  const { data: stories, error: fetchErr } = await supabase
    .from("stories_raw")
    .select("id, title, body, url, source_name, published_at, created_at")
    .eq("genre_id", genreId)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(MAX_STORIES);

  if (fetchErr) {
    return new Response(JSON.stringify({ error: fetchErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rawStories = (stories ?? []) as RawStory[];
  if (rawStories.length === 0) {
    return new Response(
      JSON.stringify({ genre_id: genreId, scanned: 0, entities: 0, status: "ok" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // 2. Extract candidate entities in chunks
  const systemPrompt =
    `You spot GENUINELY NEW or fast-rising named "things" in AI/developer news that a founder or SEO product should know about early.

You are given a numbered list of recent stories. Extract only concrete, named entities that are new, newly-popular, or newly-relevant — for example: new standards/conventions (like "agents.md", "llms.txt", "MCP"), new tools/frameworks/SDKs, new models, protocols, techniques, benchmarks, datasets, or notable new companies/products.

DO NOT extract: generic topics ("AI", "machine learning", "chatbots"), well-established products with no news, vague themes, or people's names on their own.

For each entity return:
- name: canonical display name (e.g. "AGENTS.md", "Model Context Protocol")
- normalized_name: lowercase slug, canonical (e.g. "agents-md", "model-context-protocol"); merge aliases to one slug
- entity_type: one of ${VALID_TYPES.join(", ")}
- why_it_matters: 1-2 sentences, concrete
- getvisus_relevant: true if a UK small-business SEO/website-audit SaaS (GetVisus) should support or write about it (e.g. a new web standard/file/convention that sites should adopt, like agents.md or llms.txt), else false
- getvisus_reason: 1 sentence if relevant, else null
- story_indices: array of the story numbers (as shown) that mention it

Return ONLY a JSON array. No markdown, no prose.`;

  const allEntities: Array<ExtractedEntity & { globalIndices: number[] }> = [];

  for (let start = 0; start < rawStories.length; start += CHUNK_SIZE) {
    const chunk = rawStories.slice(start, start + CHUNK_SIZE);
    const list = chunk
      .map((s, i) => {
        const idx = start + i;
        const snippet = (s.body ?? "").replace(/\s+/g, " ").slice(0, 280);
        return `[${idx}] ${s.title} — ${s.source_name}${snippet ? `\n    ${snippet}` : ""}`;
      })
      .join("\n");

    try {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Stories:\n${list}` },
          ],
        }),
      });

      if (!resp.ok) {
        if (resp.status === 429 || resp.status === 402) {
          console.error(`[detect-emerging] AI limit hit (${resp.status}), stopping`);
          break;
        }
        console.error(`[detect-emerging] AI error: ${await resp.text()}`);
        continue;
      }

      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content ?? "";
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) continue;

      let parsed: ExtractedEntity[];
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch (_) {
        console.error("[detect-emerging] JSON parse failed for chunk");
        continue;
      }

      for (const e of parsed) {
        if (!e?.name) continue;
        const globalIndices = (e.story_indices ?? [])
          .map((n) => Number(n))
          .filter((n) => Number.isInteger(n) && n >= 0 && n < rawStories.length);
        allEntities.push({ ...e, globalIndices });
      }
    } catch (err) {
      console.error("[detect-emerging] chunk error:", err);
    }
  }

  // 3. Merge duplicates across chunks by normalized_name
  const merged = new Map<string, ExtractedEntity & { globalIndices: number[] }>();
  for (const e of allEntities) {
    const key = (e.normalized_name && normalize(e.normalized_name)) || normalize(e.name);
    if (!key) continue;
    const existing = merged.get(key);
    if (existing) {
      existing.globalIndices = Array.from(new Set([...existing.globalIndices, ...e.globalIndices]));
      if (!existing.why_it_matters && e.why_it_matters) existing.why_it_matters = e.why_it_matters;
      existing.getvisus_relevant = existing.getvisus_relevant || e.getvisus_relevant;
      if (!existing.getvisus_reason && e.getvisus_reason) existing.getvisus_reason = e.getvisus_reason;
    } else {
      merged.set(key, { ...e, normalized_name: key });
    }
  }

  // 4. Upsert entities + mentions, then recompute aggregates
  let upserted = 0;
  const touched: string[] = [];

  for (const [key, e] of merged.entries()) {
    const entityType = VALID_TYPES.includes(e.entity_type) ? e.entity_type : "concept";

    // Upsert entity shell (aggregates recomputed below)
    const { data: entityRow, error: upErr } = await supabase
      .from("emerging_entities")
      .upsert(
        {
          genre_id: genreId,
          name: e.name,
          normalized_name: key,
          entity_type: entityType,
          why_it_matters: e.why_it_matters ?? null,
          getvisus_relevant: !!e.getvisus_relevant,
          getvisus_reason: e.getvisus_reason ?? null,
        },
        { onConflict: "genre_id,normalized_name" },
      )
      .select("id")
      .single();

    if (upErr || !entityRow) {
      console.error("[detect-emerging] upsert error:", upErr);
      continue;
    }
    upserted++;
    const entityId = entityRow.id as string;
    touched.push(entityId);

    // Insert mentions (ignore duplicates via unique constraint)
    for (const idx of e.globalIndices) {
      const s = rawStories[idx];
      if (!s) continue;
      await supabase.from("emerging_mentions").upsert(
        {
          entity_id: entityId,
          raw_story_id: s.id,
          source_name: s.source_name,
          url: s.url,
          seen_at: s.published_at ?? s.created_at,
        },
        { onConflict: "entity_id,raw_story_id", ignoreDuplicates: true },
      );
    }

    // Recompute aggregates from all mentions of this entity
    const { data: mentions } = await supabase
      .from("emerging_mentions")
      .select("source_name, url, seen_at")
      .eq("entity_id", entityId);

    const rows = mentions ?? [];
    const mentionCount = rows.length;
    const sources = new Set(rows.map((r) => r.source_name).filter(Boolean));
    const sourceCount = sources.size;
    const times = rows.map((r) => new Date(r.seen_at).getTime()).filter((t) => !isNaN(t));
    const firstSeen = times.length ? new Date(Math.min(...times)) : new Date();
    const lastSeen = times.length ? new Date(Math.max(...times)) : new Date();
    const dayAgo = Date.now() - 24 * 3600 * 1000;
    const velocity24h = times.filter((t) => t >= dayAgo).length;
    const sampleUrls = Array.from(new Set(rows.map((r) => r.url).filter(Boolean))).slice(0, 5);

    // Status
    const ageDays = (Date.now() - firstSeen.getTime()) / (24 * 3600 * 1000);
    const staleDays = (Date.now() - lastSeen.getTime()) / (24 * 3600 * 1000);
    let status: string;
    if (staleDays > 7) status = "fading";
    else if (ageDays <= 2) status = "new";
    else if (velocity24h >= 2 || sourceCount >= 3) status = "rising";
    else status = "established";

    // Emerging score: novelty x cross-source spread x velocity
    const noveltyBoost = Math.max(0.2, 1.5 - ageDays / 7); // newer = higher
    const emergingScore =
      (velocity24h * 2 + mentionCount + sourceCount * 3) * noveltyBoost;

    await supabase
      .from("emerging_entities")
      .update({
        mention_count: mentionCount,
        source_count: sourceCount,
        velocity_24h: velocity24h,
        first_seen_at: firstSeen.toISOString(),
        last_seen_at: lastSeen.toISOString(),
        status,
        emerging_score: Math.round(emergingScore * 100) / 100,
      })
      .eq("id", entityId);

    // sample_urls set separately (array)
    await supabase
      .from("emerging_entities")
      .update({ sample_urls: sampleUrls })
      .eq("id", entityId);
  }

  return new Response(
    JSON.stringify({
      genre_id: genreId,
      scanned: rawStories.length,
      candidates: allEntities.length,
      entities: upserted,
      status: "ok",
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
