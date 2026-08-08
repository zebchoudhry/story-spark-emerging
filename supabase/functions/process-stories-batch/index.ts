import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const MAX_PER_RUN = 50; // Max stories per run to prevent timeout

// Genre-specific categories for AI categorisation (1, 2, 3)
const GENRE_CATEGORIES: Record<string, string[]> = {
  ai: ["models", "agents", "tooling", "standards", "research", "safety", "startups", "infra"],
  paranormal: ["ufo", "paranormal", "cryptid", "conspiracy", "true_crime", "unresolved", "weird_news"],
  tech: ["ai", "startups", "cybersecurity", "gadgets", "science", "crypto"],
  sports: ["football", "basketball", "nfl", "transfers", "analysis", "breaking"],
  food: ["restaurants", "recipes", "trends", "reviews", "street_food", "health_food"],
  business: ["startups", "markets", "entrepreneurship", "personal_finance", "property", "careers"],
  gaming: ["releases", "reviews", "esports", "retro", "industry", "mods"],
  health: ["fitness", "mental_health", "nutrition", "wellness", "medical", "research"],
};

const GENRE_CATEGORY_DEFINITIONS: Record<string, string> = {
  ai: `- models: New LLMs / frontier model releases\n- agents: AI agents, agentic frameworks, MCP, agents.md\n- tooling: Dev tools, SDKs, frameworks, IDEs\n- standards: New specs/conventions (agents.md, llms.txt, MCP)\n- research: Papers, benchmarks, techniques\n- safety: Alignment, safety, policy, regulation\n- startups: Funding, launches, company moves\n- infra: Compute, GPUs, serving, deployment`,
  paranormal: `- ufo: UFO sightings, UAP, alien encounters\n- paranormal: Ghosts, hauntings, spirits\n- cryptid: Bigfoot, cryptozoology, unknown creatures\n- conspiracy: Government coverups, secret societies\n- true_crime: Murders, investigations\n- unresolved: Cold cases, disappearances\n- weird_news: Strange news that doesn't fit above`,
  tech: `- ai: LLMs, machine learning\n- startups: Funding, launches\n- cybersecurity: Hacks, breaches\n- gadgets: Hardware, devices\n- science: Research, breakthroughs\n- crypto: Blockchain, Web3`,
  sports: `- football: Soccer\n- basketball: NBA, college\n- nfl: American football\n- transfers: Signings, rumors\n- analysis: Tactics, stats\n- breaking: Injury news, announcements`,
  food: `- restaurants: Openings, industry\n- recipes: Home cooking\n- trends: Viral foods\n- reviews: Restaurant reviews\n- street_food: Vendors, food trucks\n- health_food: Clean eating, diets`,
  business: `- startups: Funding, exits\n- markets: Stocks, economy\n- entrepreneurship: Founder stories\n- personal_finance: Savings, investments\n- property: Real estate\n- careers: Job market`,
  gaming: `- releases: New games, DLC\n- reviews: Game reviews\n- esports: Competitive gaming\n- retro: Retro gaming\n- industry: Studios, acquisitions\n- mods: Modding`,
  health: `- fitness: Exercise\n- mental_health: Therapy, anxiety\n- nutrition: Diet, supplements\n- wellness: Sleep, stress\n- medical: Conditions, treatments\n- research: Studies, breakthroughs`,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[process-stories-batch] Starting batch processing...");

  // Verify secret
  const cronSecret = req.headers.get("x-cron-secret");
  const expectedSecret = Deno.env.get("INGEST_SECRET");

  if (!cronSecret || cronSecret !== expectedSecret) {
    console.error("[process-stories-batch] Unauthorized");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.error("[process-stories-batch] LOVABLE_API_KEY not configured");
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Initialize Supabase client
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Fetch unprocessed stories (max 50 per run)
  const { data: rawStories, error: fetchError } = await supabase
    .from("stories_raw")
    .select("*")
    .eq("processed", false)
    .order("created_at", { ascending: true })
    .limit(MAX_PER_RUN);

  if (fetchError) {
    console.error("[process-stories-batch] Fetch error:", fetchError);
    return new Response(JSON.stringify({ error: fetchError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!rawStories || rawStories.length === 0) {
    console.log("[process-stories-batch] No unprocessed stories found");
    return new Response(JSON.stringify({ total: 0, errors: 0, status: "ok" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 1. Group unprocessed stories by genre_id
  const storiesByGenre: Record<string, typeof rawStories> = {};
  for (const story of rawStories) {
    const genreId = story.genre_id ?? "paranormal";
    if (!storiesByGenre[genreId]) {
      storiesByGenre[genreId] = [];
    }
    storiesByGenre[genreId].push(story);
  }

  console.log(`[process-stories-batch] Found ${rawStories.length} stories across ${Object.keys(storiesByGenre).length} genres`);

  const genreCounts: Record<string, number> = {};
  let errorCount = 0;

  // 2. Process each genre group with the correct categorisation prompt
  for (const [genreId, stories] of Object.entries(storiesByGenre)) {
    genreCounts[genreId] = 0;
    console.log(`[process-stories-batch] Processing ${stories.length} stories for genre: ${genreId}`);

    for (const story of stories) {
      try {
      const storyGenreId = story.genre_id ?? genreId;
      console.log(`[process-stories-batch] Processing: ${story.title?.substring(0, 50)}... (genre: ${storyGenreId})`);

      const categories = GENRE_CATEGORIES[storyGenreId] ?? GENRE_CATEGORIES.paranormal;
      const categoryDefs = GENRE_CATEGORY_DEFINITIONS[storyGenreId] ?? GENRE_CATEGORY_DEFINITIONS.paranormal;

      // Call AI to process the story (2, 3, 4)
      const systemPrompt = `You are an AI assistant that analyzes stories for content creators. Analyze the input and extract structured data.

Return ONLY valid JSON with these exact keys:
- summary_short: One sentence summary, max 200 characters
- summary_long: 3-5 sentence factual summary of the story
- why_interesting: 2-3 sentences explaining why creators would want to cover this
- category: One of: ${categories.join(", ")}
- credibility: One of: low, medium, high (based on source reliability and verifiability)
- trend_score: One of: hot, warm, cold (based on recency and viral potential)
- is_relevant: boolean - true if the story clearly fits this genre, false if off-topic (e.g. routine news, unrelated content)

Category definitions for this genre:
${categoryDefs}

No additional text, markdown, or explanation. Just the JSON object.`;

      const userPrompt = `Analyze this story (genre: ${storyGenreId}):

Title: ${story.title || "Untitled"}
Source: ${story.source_name} (${story.source_type})
Published: ${story.published_at || "Unknown"}

Content:
${story.body || story.title || "No content available"}`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (!aiResponse.ok) {
        if (aiResponse.status === 429) {
          console.error("[process-stories-batch] Rate limited, stopping batch");
          break;
        }
        if (aiResponse.status === 402) {
          console.error("[process-stories-batch] AI credits exhausted, stopping batch");
          break;
        }
        const errorText = await aiResponse.text();
        console.error(`[process-stories-batch] AI error for ${story.id}:`, errorText);
        errorCount++;
        continue;
      }

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content;

      if (!content) {
        console.error(`[process-stories-batch] No AI content for ${story.id}`);
        errorCount++;
        continue;
      }

      // Parse the JSON response
      let storyCard;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          storyCard = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON found");
        }
      } catch (parseError) {
        console.error(`[process-stories-batch] JSON parse error for ${story.id}:`, parseError);
        errorCount++;
        continue;
      }

      // Validate and normalize
      const validCategories = GENRE_CATEGORIES[storyGenreId] ?? GENRE_CATEGORIES.paranormal;
      const validCredibility = ["low", "medium", "high"];
      const validTrendScore = ["hot", "warm", "cold"];
      const defaultCategory = validCategories[0] ?? "weird_news";

      const category = validCategories.includes(storyCard.category) ? storyCard.category : defaultCategory;
      const credibility = validCredibility.includes(storyCard.credibility) ? storyCard.credibility : "medium";
      const trendScore = validTrendScore.includes(storyCard.trend_score) ? storyCard.trend_score : "warm";
      const isRelevant = storyCard.is_relevant !== false;

      // 5. If is_relevant is false: mark as processed but do NOT insert into story_cards
      if (!isRelevant) {
        console.log(`[process-stories-batch] Story ${story.id} marked off-topic (is_relevant: false), skipping insert`);
        const { error: updateError } = await supabase
          .from("stories_raw")
          .update({ processed: true })
          .eq("id", story.id);

        if (updateError) {
          console.error(`[process-stories-batch] Update error for ${story.id}:`, updateError);
        }
        genreCounts[genreId]++;
        await new Promise((resolve) => setTimeout(resolve, 500));
        continue;
      }

      // 6. Insert into story_cards with genre_id
      const { error: insertError } = await supabase.from("story_cards").insert({
        raw_story_id: story.id,
        title: story.title,
        summary_short: storyCard.summary_short || story.title,
        summary_long: storyCard.summary_long,
        why_interesting: storyCard.why_interesting,
        category,
        credibility,
        trend_score: trendScore,
        source_name: story.source_name,
        source_link: story.url,
        published_at: story.published_at,
        genre_id: storyGenreId,
      });

      if (insertError) {
        console.error(`[process-stories-batch] Insert error for ${story.id}:`, insertError);
        errorCount++;
        continue;
      }

      // Mark raw story as processed
      const { error: updateError } = await supabase
        .from("stories_raw")
        .update({ processed: true })
        .eq("id", story.id);

      if (updateError) {
        console.error(`[process-stories-batch] Update error for ${story.id}:`, updateError);
      }

      genreCounts[genreId]++;
      console.log(`[process-stories-batch] Successfully processed: ${story.id}`);

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));

      } catch (err) {
        console.error(`[process-stories-batch] Error processing ${story.id}:`, err);
        errorCount++;
      }
    }
  }

  const totalProcessed = Object.values(genreCounts).reduce((a, b) => a + b, 0);
  console.log(`[process-stories-batch] Complete. Processed: ${totalProcessed}, Errors: ${errorCount}`);

  return new Response(
    JSON.stringify({
      ...genreCounts,
      total: totalProcessed,
      errors: errorCount,
      status: "ok",
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
