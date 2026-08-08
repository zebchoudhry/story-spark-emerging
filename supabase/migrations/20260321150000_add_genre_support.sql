-- Add genre support for multi-genre story system

-- 1. Add genre_id to stories_raw
ALTER TABLE public.stories_raw
  ADD COLUMN genre_id TEXT NOT NULL DEFAULT 'paranormal';

-- 2. Add genre_id to story_cards
ALTER TABLE public.story_cards
  ADD COLUMN genre_id TEXT NOT NULL DEFAULT 'paranormal';

-- 3. Ensure all existing rows have genre_id = 'paranormal' (DEFAULT handles new rows)
UPDATE public.stories_raw SET genre_id = 'paranormal';
UPDATE public.story_cards SET genre_id = 'paranormal';

-- 4. Add indexes
CREATE INDEX idx_story_cards_genre_id ON public.story_cards(genre_id);
CREATE INDEX idx_stories_raw_genre_id ON public.stories_raw(genre_id);

-- 6. Add new values to story_category enum (tech, sports, food, business, gaming, health categories)
ALTER TYPE public.story_category ADD VALUE IF NOT EXISTS 'ai';
ALTER TYPE public.story_category ADD VALUE IF NOT EXISTS 'startups';
ALTER TYPE public.story_category ADD VALUE IF NOT EXISTS 'cybersecurity';
ALTER TYPE public.story_category ADD VALUE IF NOT EXISTS 'gadgets';
ALTER TYPE public.story_category ADD VALUE IF NOT EXISTS 'science';
ALTER TYPE public.story_category ADD VALUE IF NOT EXISTS 'crypto';
ALTER TYPE public.story_category ADD VALUE IF NOT EXISTS 'football';
ALTER TYPE public.story_category ADD VALUE IF NOT EXISTS 'basketball';
ALTER TYPE public.story_category ADD VALUE IF NOT EXISTS 'nfl';
ALTER TYPE public.story_category ADD VALUE IF NOT EXISTS 'transfers';
ALTER TYPE public.story_category ADD VALUE IF NOT EXISTS 'analysis';
ALTER TYPE public.story_category ADD VALUE IF NOT EXISTS 'breaking';
ALTER TYPE public.story_category ADD VALUE IF NOT EXISTS 'restaurants';
ALTER TYPE public.story_category ADD VALUE IF NOT EXISTS 'recipes';
ALTER TYPE public.story_category ADD VALUE IF NOT EXISTS 'trends';
ALTER TYPE public.story_category ADD VALUE IF NOT EXISTS 'reviews';
ALTER TYPE public.story_category ADD VALUE IF NOT EXISTS 'street_food';
ALTER TYPE public.story_category ADD VALUE IF NOT EXISTS 'health_food';
ALTER TYPE public.story_category ADD VALUE IF NOT EXISTS 'markets';
ALTER TYPE public.story_category ADD VALUE IF NOT EXISTS 'entrepreneurship';
ALTER TYPE public.story_category ADD VALUE IF NOT EXISTS 'personal_finance';
ALTER TYPE public.story_category ADD VALUE IF NOT EXISTS 'property';
ALTER TYPE public.story_category ADD VALUE IF NOT EXISTS 'careers';
ALTER TYPE public.story_category ADD VALUE IF NOT EXISTS 'releases';
ALTER TYPE public.story_category ADD VALUE IF NOT EXISTS 'esports';
ALTER TYPE public.story_category ADD VALUE IF NOT EXISTS 'retro';
ALTER TYPE public.story_category ADD VALUE IF NOT EXISTS 'industry';
ALTER TYPE public.story_category ADD VALUE IF NOT EXISTS 'mods';
ALTER TYPE public.story_category ADD VALUE IF NOT EXISTS 'fitness';
ALTER TYPE public.story_category ADD VALUE IF NOT EXISTS 'mental_health';
ALTER TYPE public.story_category ADD VALUE IF NOT EXISTS 'nutrition';
ALTER TYPE public.story_category ADD VALUE IF NOT EXISTS 'wellness';
ALTER TYPE public.story_category ADD VALUE IF NOT EXISTS 'medical';
ALTER TYPE public.story_category ADD VALUE IF NOT EXISTS 'research';
