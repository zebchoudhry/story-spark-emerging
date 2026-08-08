import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Genre-specific categories for AI categorisation (2, 3)
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
  ai: `- models: New LLMs / frontier model releases
- agents: AI agents, agentic frameworks, MCP, agents.md
- tooling: Dev tools, SDKs, frameworks, IDEs
- standards: New specs/conventions (agents.md, llms.txt, MCP)
- research: Papers, benchmarks, techniques
- safety: Alignment, safety, policy, regulation
- startups: Funding, launches, company moves
- infra: Compute, GPUs, serving, deployment`,
  paranormal: `- ufo: UFO sightings, UAP, alien encounters
- paranormal: Ghosts, hauntings, spirits, supernatural events
- cryptid: Bigfoot, cryptozoology, mysterious creatures, lake monsters
- conspiracy: Government coverups, secret societies, alternative history
- true_crime: Murders, investigations, criminal cases
- unresolved: Cold cases, unexplained disappearances, internet mysteries
- weird_news: Strange news that doesn't fit above`,
  tech: `- ai: LLMs, machine learning, AI products
- startups: Funding, launches, venture capital
- cybersecurity: Hacks, breaches, infosec
- gadgets: Hardware, devices, reviews
- science: Research, breakthroughs
- crypto: Blockchain, Web3, digital assets`,
  sports: `- football: Soccer
- basketball: NBA, college basketball
- nfl: American football
- transfers: Signings, rumors, deals
- analysis: Tactics, stats, breakdowns
- breaking: Injury news, suspensions, major announcements`,
  food: `- restaurants: Openings, closures, industry
- recipes: Home cooking, techniques
- trends: Viral foods, fads, TikTok
- reviews: Restaurant reviews, product reviews
- street_food: Street vendors, food trucks
- health_food: Clean eating, diets, wellness`,
  business: `- startups: Early-stage, funding, exits
- markets: Stocks, economy, macro
- entrepreneurship: Founder stories, advice
- personal_finance: Savings, investments, debt
- property: Real estate, housing
- careers: Job market, workplace`,
  gaming: `- releases: New games, DLC, updates
- reviews: Game reviews, impressions
- esports: Competitive gaming, tournaments
- retro: Retro gaming, remasters
- industry: Studios, acquisitions, layoffs
- mods: Modding, community creations`,
  health: `- fitness: Exercise, strength, cardio
- mental_health: Therapy, anxiety, depression
- nutrition: Diet, supplements, eating
- wellness: Sleep, stress, self-care
- medical: Conditions, treatments, doctors
- research: Studies, breakthroughs`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, body, sourceType, sourceName, genre_id: genreIdParam } = await req.json();
    const genreId = genreIdParam ?? "paranormal";
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Processing story:", title, "genre:", genreId);

    const categories = GENRE_CATEGORIES[genreId] ?? GENRE_CATEGORIES.paranormal;
    const categoryDefs = GENRE_CATEGORY_DEFINITIONS[genreId] ?? GENRE_CATEGORY_DEFINITIONS.paranormal;

    const systemPrompt = `You are an AI assistant that cleans and structures stories for content creators. For the input text, extract:

- summary_short (1 sentence, max 200 characters)
- summary_long (3-5 sentence factual summary)
- why_interesting (explain why creators may want to cover this, 2-3 sentences)
- category (one of: ${categories.join(", ")})
- credibility (one of: low, medium, high - based on source reliability and claims)
- is_relevant (boolean): true if the story clearly fits this genre, false if it's off-topic (e.g. routine news, unrelated content)

Category definitions for this genre:
${categoryDefs}

Return ONLY valid JSON with these exact keys. No additional text or markdown.`;

    const userPrompt = `Process this story (genre: ${genreId}):

Title: ${title}
Source: ${sourceName} (${sourceType})

Content:
${body}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content generated");
    }

    // Parse the JSON response
    let storyCard;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        storyCard = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      throw new Error("Failed to process story");
    }

    // Validate and normalize the response
    const validCategories = GENRE_CATEGORIES[genreId] ?? GENRE_CATEGORIES.paranormal;
    const validCredibility = ["low", "medium", "high"];
    const defaultCategory = validCategories[0] ?? "weird_news";
    
    if (!validCategories.includes(storyCard.category)) {
      storyCard.category = defaultCategory;
    }
    if (!validCredibility.includes(storyCard.credibility)) {
      storyCard.credibility = "medium";
    }
    storyCard.is_relevant = storyCard.is_relevant !== false;

    console.log("Story processed successfully:", storyCard.category, "is_relevant:", storyCard.is_relevant);

    return new Response(JSON.stringify(storyCard), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing story:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
