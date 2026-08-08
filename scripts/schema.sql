-- Neon schema for the Emerging engine. Self-contained: no Supabase auth/RLS.
-- Safe to run repeatedly (IF NOT EXISTS everywhere).

CREATE TABLE IF NOT EXISTS stories_raw (
  id            BIGSERIAL PRIMARY KEY,
  genre_id      TEXT NOT NULL DEFAULT 'ai',
  source_type   TEXT NOT NULL,
  source_name   TEXT NOT NULL,
  external_id   TEXT NOT NULL,
  title         TEXT NOT NULL,
  body          TEXT,
  url           TEXT,
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_type, external_id)
);
CREATE INDEX IF NOT EXISTS idx_stories_raw_created ON stories_raw(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_raw_genre   ON stories_raw(genre_id);

CREATE TABLE IF NOT EXISTS emerging_entities (
  id                BIGSERIAL PRIMARY KEY,
  genre_id          TEXT NOT NULL DEFAULT 'ai',
  name              TEXT NOT NULL,
  normalized_name   TEXT NOT NULL,
  entity_type       TEXT NOT NULL DEFAULT 'concept',
  why_it_matters    TEXT,
  getvisus_relevant BOOLEAN NOT NULL DEFAULT false,
  getvisus_reason   TEXT,
  first_seen_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  mention_count     INTEGER NOT NULL DEFAULT 0,
  source_count      INTEGER NOT NULL DEFAULT 0,
  velocity_24h      INTEGER NOT NULL DEFAULT 0,
  emerging_score    NUMERIC NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'new',
  sample_urls       TEXT[] NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (genre_id, normalized_name)
);
CREATE INDEX IF NOT EXISTS idx_emerging_score  ON emerging_entities(emerging_score DESC);
CREATE INDEX IF NOT EXISTS idx_emerging_status ON emerging_entities(status);

CREATE TABLE IF NOT EXISTS emerging_mentions (
  id            BIGSERIAL PRIMARY KEY,
  entity_id     BIGINT NOT NULL REFERENCES emerging_entities(id) ON DELETE CASCADE,
  raw_story_id  BIGINT REFERENCES stories_raw(id) ON DELETE CASCADE,
  source_name   TEXT,
  url           TEXT,
  seen_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_id, raw_story_id)
);
CREATE INDEX IF NOT EXISTS idx_mentions_entity ON emerging_mentions(entity_id);
