-- Emerging-things engine: track newly-appearing named entities (standards, tools,
-- models, protocols, file conventions like "agents.md") and their cross-source velocity.

-- 1. New story categories for the AI genre (reuse existing enum where possible)
ALTER TYPE public.story_category ADD VALUE IF NOT EXISTS 'models';
ALTER TYPE public.story_category ADD VALUE IF NOT EXISTS 'agents';
ALTER TYPE public.story_category ADD VALUE IF NOT EXISTS 'tooling';
ALTER TYPE public.story_category ADD VALUE IF NOT EXISTS 'standards';
ALTER TYPE public.story_category ADD VALUE IF NOT EXISTS 'safety';
ALTER TYPE public.story_category ADD VALUE IF NOT EXISTS 'infra';

-- 2. Emerging entity type enum
DO $$ BEGIN
  CREATE TYPE public.emerging_type AS ENUM (
    'standard', 'tool', 'model', 'protocol', 'technique',
    'company', 'file', 'dataset', 'benchmark', 'concept'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.emerging_status AS ENUM ('new', 'rising', 'established', 'fading');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. emerging_entities: one row per distinct thing, per genre
CREATE TABLE IF NOT EXISTS public.emerging_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  genre_id TEXT NOT NULL DEFAULT 'ai',
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  entity_type public.emerging_type NOT NULL DEFAULT 'concept',
  why_it_matters TEXT,
  getvisus_relevant BOOLEAN NOT NULL DEFAULT false,
  getvisus_reason TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  mention_count INTEGER NOT NULL DEFAULT 0,
  source_count INTEGER NOT NULL DEFAULT 0,
  velocity_24h INTEGER NOT NULL DEFAULT 0,
  emerging_score NUMERIC NOT NULL DEFAULT 0,
  status public.emerging_status NOT NULL DEFAULT 'new',
  sample_urls TEXT[] NOT NULL DEFAULT '{}',
  dismissed BOOLEAN NOT NULL DEFAULT false,
  drafted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (genre_id, normalized_name)
);

-- 4. emerging_mentions: each time an entity appears in a raw story
CREATE TABLE IF NOT EXISTS public.emerging_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES public.emerging_entities(id) ON DELETE CASCADE,
  raw_story_id UUID REFERENCES public.stories_raw(id) ON DELETE CASCADE,
  source_name TEXT,
  url TEXT,
  seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_id, raw_story_id)
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_emerging_entities_genre ON public.emerging_entities(genre_id);
CREATE INDEX IF NOT EXISTS idx_emerging_entities_score ON public.emerging_entities(emerging_score DESC);
CREATE INDEX IF NOT EXISTS idx_emerging_entities_status ON public.emerging_entities(status);
CREATE INDEX IF NOT EXISTS idx_emerging_mentions_entity ON public.emerging_mentions(entity_id);
CREATE INDEX IF NOT EXISTS idx_emerging_mentions_seen ON public.emerging_mentions(seen_at DESC);

-- 6. updated_at trigger
CREATE TRIGGER update_emerging_entities_updated_at
  BEFORE UPDATE ON public.emerging_entities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. RLS: authenticated users read, admins manage. Service role (edge fn) bypasses RLS.
ALTER TABLE public.emerging_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emerging_mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view emerging entities"
  ON public.emerging_entities FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage emerging entities"
  ON public.emerging_entities FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone authenticated can view emerging mentions"
  ON public.emerging_mentions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage emerging mentions"
  ON public.emerging_mentions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));
