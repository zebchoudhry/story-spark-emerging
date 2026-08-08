
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { 
  ResearchResult, 
  ArticleIdea, 
  ArticleSection, 
  BrandProfile, 
  BacklinkStrategy, 
  StudioAssets, 
  GeneratedImage, 
  SiteProfile, 
  ContentMode, 
  LinkSuggestion, 
  ExistingPost 
} from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SITE_PROFILES: Record<string, SiteProfile> = {
  beyond: {
    site_id: 'beyond',
    site_name: 'BeyondThePeripheral',
    domain: 'beyondtheperipheral.com',
    content_mode: 'exploratory_media',
    tone: 'Investigative, speculative, slow-burn, curious.',
    allowed_topic_classes: ['*'],
    disallowed_topic_classes: [],
    publish_frequency: 'High',
    output_format: 'Markdown',
    allow_opinion: true,
    allow_trends: true,
    auto_publish: true
  },
  fozias: {
    site_id: 'fozias',
    site_name: 'Fozias',
    domain: 'fozias.com',
    content_mode: 'authority_restaurant',
    tone: 'Declarative, educational, historical, authoritative, calm.',
    allowed_topic_classes: [
      'Pakistani cuisine',
      'Indian cuisine',
      'Kashmiri cuisine',
      'Cooking methods',
      'Ingredients and spices',
      'Regional food history',
      'Home-style cooking',
      'South Asian cuisine',
      'Food trends in South Asian cuisine'
    ],
    disallowed_topic_classes: ['Restaurant reviews', 'Comparisons', 'Opinion pieces', 'Best of lists', 'Breaking news', 'Timely content'],
    publish_frequency: 'Scheduled',
    output_format: 'Markdown/TSX',
    allow_opinion: false,
    allow_trends: true,
    auto_publish: false
  }
};

/**
 * MANDATORY TOPIC GATING
 */
export const validateTopicAccess = async (topic: string, siteId: string): Promise<{ allowed: boolean; reason?: string }> => {
  const profile = SITE_PROFILES[siteId];
  if (!profile) return { allowed: false, reason: "Invalid Site Profile" };
  if (profile.allowed_topic_classes.includes('*')) return { allowed: true };

  const classifierPrompt = `Classify the following topic into one of these categories: ${profile.allowed_topic_classes.join(', ')}. 
  If it fits into none or matches any of these forbidden categories: ${profile.disallowed_topic_classes.join(', ')}, return "FORBIDDEN".
  Topic: "${topic}"
  Return ONLY the category name or "FORBIDDEN".`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: classifierPrompt
  });

  const category = response.text.trim();
  if (category === "FORBIDDEN" || !profile.allowed_topic_classes.includes(category)) {
    return { allowed: false, reason: `Topic class "${category}" is restricted for the ${profile.site_name} pipeline.` };
  }

  return { allowed: true };
};

const cleanJson = (text: string): string => {
  if (!text) return "[]";
  let cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim();
  const firstOpenBracket = cleaned.indexOf('[');
  const lastCloseBracket = cleaned.lastIndexOf(']');
  if (firstOpenBracket !== -1 && lastCloseBracket !== -1) return cleaned.substring(firstOpenBracket, lastCloseBracket + 1);
  const firstOpenBrace = cleaned.indexOf('{');
  const lastCloseBrace = cleaned.lastIndexOf('}');
  if (firstOpenBrace !== -1 && lastCloseBrace !== -1) return cleaned.substring(firstOpenBrace, lastCloseBrace + 1);
  return cleaned;
};

export const generateIdeas = async (
  topic: string, 
  brand: BrandProfile, 
  sourceMode: string,
  siteId: string = 'beyond'
): Promise<ArticleIdea[]> => {
  const profile = SITE_PROFILES[siteId];
  
  // Pre-flight check
  const access = await validateTopicAccess(topic, siteId);
  if (!access.allowed) {
    throw new Error(access.reason);
  }

  const prompt = `Generate 3 ${profile.content_mode === 'authority_restaurant' ? 'educational authority' : 'investigative'} blog post angles for "${topic}" for site ${profile.domain}. 
  Tone: ${profile.tone}
  Return JSON array: [{title, angle}].`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: { tools: [{ googleSearch: {} }] }
  });
  try { return JSON.parse(cleanJson(response.text)); } catch (e) { return []; }
};

// Fixed signature to match calls from StepResearch and StepBatch
export const performResearch = async (
  idea: ArticleIdea, 
  topic: string,
  sourceMode?: string,
  sourceText?: string,
  mediaData?: string,
  mediaMimeType?: string,
  youtubeUrl?: string
): Promise<ResearchResult> => {
  const prompt = `Research synthesis for "${idea.title}" (Topic: ${topic}). 
  Source Mode: ${sourceMode}
  ${sourceText ? `Source Text: ${sourceText.slice(0, 5000)}` : ''}
  ${youtubeUrl ? `URL: ${youtubeUrl}` : ''}
  Return detailed JSON: {
    summary, 
    sources: [{title, url, trustScore}], 
    claims: [{id, claimText, status, verificationReasoning}],
    legalSummary: { hardBansDetected: number }
  }.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: { tools: [{ googleSearch: {} }] }
  });
  try { 
    return JSON.parse(cleanJson(response.text)); 
  } catch (e) { 
    return { summary: "", sources: [], claims: [], legalSummary: { hardBansDetected: 0 } }; 
  }
};

export const generateOutline = async (idea: ArticleIdea, researchSummary: string): Promise<ArticleSection[]> => {
  const prompt = `Create outline for "${idea.title}". Research: ${researchSummary.slice(0, 5000)}. Return JSON: [{heading, keyPoints}].`;
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    config: { responseMimeType: 'application/json' },
    contents: prompt,
  });
  return JSON.parse(cleanJson(response.text) || "[]");
};

/**
 * FROZEN OUTPUT TEMPLATES
 */
// Fixed signature to match calls from StepDraft and StepBatch
export const writeDraft = async (
  idea: ArticleIdea, 
  outline: ArticleSection[], 
  researchSummary: string, 
  brand: BrandProfile,
  nlpKeywords?: string,
  sourceText?: string,
  topic?: string,
  siteId: string = 'beyond'
): Promise<string> => {
  const profile = SITE_PROFILES[siteId];
  
  let systemInstruction = "";
  if (profile.content_mode === 'authority_restaurant') {
    systemInstruction = `You are a Senior Culinary Historian and Authority on Pakistani, Indian, and Kashmiri cuisine. 
    Strict Constraints for the ${profile.site_name} pipeline:
    - MODE: authority_food_v1
    - TONE: Declarative, educational, calm.
    - ALLOWED: Food trend coverage must be framed educationally (origins, cultural context, rising popularity) — not as hype or marketing.
    - PROHIBITED: Speculation, opinion, superlatives, marketing language, calls to action, restaurant reviews.
    - RESTRICTION: Do NOT mention the restaurant name "${profile.site_name}" in the body text.
    - FORMAT: Direct educational article. No fluff. No superlatives like "best" or "finest".`;
  } else {
    systemInstruction = `You are an investigative journalist for ${profile.domain}. 
    - MODE: exploratory_media_v2
    - TONE: Investigative, speculative, slow-burn.
    - ALLOWED: Questions, speculative angles, curious framing.`;
  }

  const prompt = `Write an article based on the following:
  Title: ${idea.title}
  Topic: ${topic}
  Keywords: ${nlpKeywords}
  Research: ${researchSummary}
  Outline: ${JSON.stringify(outline)}
  ${sourceText ? `Context: ${sourceText.slice(0, 2000)}` : ''}
  
  Output Format: ${profile.output_format === 'Markdown/TSX' ? 'Markdown intended for a React TSX blog component' : 'Standard Markdown'}.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: { systemInstruction }
  });
  
  return response.text;
};

export const generateBlogImage = async (idea: ArticleIdea, brand: BrandProfile): Promise<GeneratedImage> => {
  const prompt = `Photorealistic cinematic image for "${idea.title}". Style: ${brand.imageStyle}`;
  // Use generateContent for nano banana series models as per guidelines
  const response = await ai.models.generateContent({ 
    model: 'gemini-2.5-flash-image', 
    contents: { parts: [{ text: prompt }] }
  });
  const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  if (part && part.inlineData) return { base64: part.inlineData.data, mimeType: part.inlineData.mimeType, prompt: prompt };
  throw new Error("Failed to generate image.");
};

/**
 * NEW CAPABILITIES
 */

export const generateLinkSuggestions = async (content: string, posts: ExistingPost[]): Promise<LinkSuggestion[]> => {
  const prompt = `Analyze this content and suggest internal links from the list of existing posts.
  Content: ${content.slice(0, 2000)}
  Posts: ${JSON.stringify(posts)}
  Return JSON: [{originalText: "text to link", url: "url from posts list"}].`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: { responseMimeType: 'application/json' }
  });
  try { return JSON.parse(cleanJson(response.text)); } catch (e) { return []; }
};

export const generateMetaDescription = async (content: string, topic: string): Promise<string> => {
  const prompt = `Write a compelling SEO meta description (max 160 chars) for this article about ${topic}.
  Content: ${content.slice(0, 1000)}`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt
  });
  return response.text.trim();
};

export const analyzeGEO = async (content: string, topic: string): Promise<{score: number, analysis: string}> => {
  const prompt = `Analyze this content for Search Generative Experience (SGE/GEO) optimization.
  How well does it answer "${topic}"? 
  Return JSON: {score: 0-100, analysis: "explanation"}.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: { responseMimeType: 'application/json' }
  });
  try { return JSON.parse(cleanJson(response.text)); } catch (e) { return { score: 0, analysis: "Failed to analyze." }; }
};

export const generateGallery = async (idea: ArticleIdea, content: string, brand: BrandProfile): Promise<GeneratedImage[]> => {
  const prompt = `Generate 3 diverse visual prompts for internal body images of the article: "${idea.title}".
  Content snippet: ${content.slice(0, 1000)}
  Return JSON: ["prompt 1", "prompt 2", "prompt 3"].`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: { responseMimeType: 'application/json' }
  });
  
  const prompts = JSON.parse(cleanJson(response.text));
  const images: GeneratedImage[] = [];
  
  for (const p of prompts) {
    const imgResponse = await ai.models.generateContent({ 
        model: 'gemini-2.5-flash-image', 
        contents: { parts: [{ text: `${p}. Style: ${brand.imageStyle}` }] }
    });
    const part = imgResponse.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (part && part.inlineData) {
        images.push({ base64: part.inlineData.data, mimeType: part.inlineData.mimeType, prompt: p });
    }
  }
  return images;
};

export const generateBacklinkStrategy = async (topic: string, content: string, domain: string): Promise<BacklinkStrategy> => {
  const prompt = `Create a backlink outreach strategy for an article about ${topic} on ${domain}.
  Return JSON: { searchQueries: ["string"], socialPost: "string" }.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: { responseMimeType: 'application/json' }
  });
  try { return JSON.parse(cleanJson(response.text)); } catch (e) { return { searchQueries: [], socialPost: "" }; }
};

export const generateStudioAssets = async (content: string): Promise<StudioAssets> => {
  const prompt = `Create production assets for a video based on this content.
  Return JSON: { 
    narrationScript: "...", 
    shotList: "...", 
    condensedScript: "...",
    shortClips: [{title: "...", caption: "..."}]
  }.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: { responseMimeType: 'application/json' }
  });
  try { return JSON.parse(cleanJson(response.text)); } catch (e) { return { narrationScript: "", shotList: "", condensedScript: "", shortClips: [] }; }
};

export const generateSpeech = async (text: string, voiceName: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  });
  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
};

export const generateSEOKeywords = async (topic: string): Promise<string[]> => {
  const prompt = `Generate 10 high-intent SEO keywords for: ${topic}.
  Return JSON array of strings.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: { responseMimeType: 'application/json' }
  });
  try { return JSON.parse(cleanJson(response.text)); } catch (e) { return []; }
};
