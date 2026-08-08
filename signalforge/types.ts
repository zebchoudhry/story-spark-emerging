
export enum WorkflowStep {
  STRATEGY = 0,
  RESEARCH = 1,
  PLAN = 2,
  DRAFT = 3,
  VISUALS = 4,
  PUBLISH = 5
}

export type UserTier = 'CREATOR' | 'STUDIO' | 'AGENCY' | 'ENTERPRISE' | 'ACADEMIC';
export type Jurisdiction = 'US' | 'UK_EU';
export type ContentMode = 'exploratory_media' | 'authority_restaurant';

export interface UserProfile {
  id: string;
  name: string;
  tier: UserTier;
  usage: {
    articlesThisMonth: number;
    maxArticles: number;
  };
}

export interface SiteProfile {
  site_id: string;
  site_name: string;
  domain: string;
  content_mode: ContentMode;
  tone: string;
  allowed_topic_classes: string[];
  disallowed_topic_classes: string[];
  publish_frequency: string;
  output_format: 'Markdown' | 'Markdown/TSX';
  allow_opinion: boolean;
  allow_trends: boolean;
  auto_publish: boolean;
}

export interface ExistingPost {
  id: number;
  title: string;
  link: string;
}

export interface WPCategory {
  id: number;
  name: string;
}

export interface LinkSuggestion {
  originalText: string;
  url: string;
}

export interface BatchItem {
  id: string;
  title: string;
  url?: string;
  scheduledDate: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REVIEW';
  research?: ResearchResult;
  outline?: ArticleSection[];
  content?: string;
  image?: GeneratedImage;
  nlpKeywords?: string;
  wpLink?: string;
  error?: string;
}

export interface SoundEffect {
  id: string;
  word: string;
}

export interface BlogPostData {
  id?: string;
  site_id: string; // Isolated pipeline routing
  brand: BrandProfile;
  sourceMode: 'keyword' | 'transcript' | 'media' | 'youtube' | 'radar'; 
  topic: string; 
  sourceText?: string; 
  youtubeUrl?: string; 
  mediaData?: string; 
  mediaMimeType?: string; 
  nlpKeywords?: string;
  selectedIdea?: ArticleIdea;
  sourceStoryUrl?: string;
  storySparkId?: string;
  
  research?: ResearchResult;
  outline?: ArticleSection[];
  content?: string; 
  metaDescription?: string; 
  image?: GeneratedImage;
  gallery?: GeneratedImage[]; 
  
  studioAssets?: StudioAssets;
  scheduledDate?: string; 
  selectedCategoryId?: number;
  backlinkStrategy?: BacklinkStrategy;
  batchItems?: BatchItem[];
}

export interface BrandProfile {
  domain: string;
  voice: string;
  imageStyle: string;
  targetAudience?: string; 
  customPrompt?: string; 
  competitors?: string[]; 
  jurisdiction?: Jurisdiction;
}

export interface ArticleIdea {
  title: string;
  angle: string;
}

export interface ArticleSection {
  heading: string;
  keyPoints: string[];
}

export interface TrustPillars {
  provenance: number;
  evidenceType: number;
  editorialStandards: number;
  corroboration: number;
}

export interface ResearchSource {
  title: string;
  url: string;
  trustScore: number; 
  analysis?: string;
  pillars?: TrustPillars;
  forensics?: {
    incentive?: { hasIncentive: boolean };
    isPropaganda: boolean;
    bias: { orientation: string };
  };
}

export interface Claim {
  id: string;
  claimText: string;
  status: string;
  verificationReasoning: string;
  resilienceScore?: string;
  legalAudit?: {
    isLivingPerson?: boolean;
    flaggedForHardBan?: boolean;
    banReason?: string;
  };
  harmProfile?: {
    totalScore?: number;
  };
}

export interface ResearchResult {
  summary: string;
  sources: ResearchSource[];
  claims: Claim[];
  legalSummary?: { hardBansDetected: number };
}

export interface GeneratedImage {
  base64: string;
  mimeType: string;
  prompt: string;
}

export interface StudioAssets {
  narrationScript: string;
  shotList: string;
  condensedScript: string;
  shortClips: { title: string; caption: string }[];
  audioProduction?: {
    voiceModel: string;
    toneStyle: string;
    voiceVol: number;
    musicVol: number;
    effects: SoundEffect[];
  };
}

export interface BacklinkStrategy {
  searchQueries: string[]; 
  socialPost: string;
}

export interface WordPressConfig {
  siteUrl: string;
  username: string;
  appPassword: string; 
}
