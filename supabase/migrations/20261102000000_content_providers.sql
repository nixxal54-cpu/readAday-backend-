-- ==============================================================================
-- readAday - PostgreSQL & Supabase Database Migration
-- Version: 20261102000000
-- Integration of 10 Real Content Providers, Strict 5-Feed Schema & Sync Logs
-- ==============================================================================

-- 1. EXTEND CONTENT TYPE ENUM
DO $$ BEGIN
  ALTER TYPE content_type ADD VALUE IF NOT EXISTS 'discover';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE content_type ADD VALUE IF NOT EXISTS 'books';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. PROVIDER SYNC LOG STATUS ENUM
DO $$ BEGIN
  CREATE TYPE provider_sync_status AS ENUM ('success', 'partial', 'failed', 'rate_limited');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. CONTENT PROVIDERS REGISTRY TABLE
CREATE TABLE IF NOT EXISTS public.content_providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  content_identity content_type NOT NULL,
  requires_api_key BOOLEAN NOT NULL DEFAULT false,
  env_key_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sync_interval_minutes INT NOT NULL DEFAULT 60,
  last_sync_at TIMESTAMPTZ,
  last_status TEXT DEFAULT 'healthy',
  last_response_time_ms INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. PROVIDER SYNC LOGS TABLE (Audit History & Rate-Limit Monitoring)
CREATE TABLE IF NOT EXISTS public.provider_sync_logs (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL REFERENCES public.content_providers(id) ON DELETE CASCADE,
  status provider_sync_status NOT NULL,
  fetched_count INT NOT NULL DEFAULT 0,
  ingested_count INT NOT NULL DEFAULT 0,
  duplicate_count INT NOT NULL DEFAULT 0,
  error_message TEXT,
  duration_ms INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sync_logs_provider_id ON public.provider_sync_logs(provider_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at ON public.provider_sync_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_content_type ON public.articles(content_type);
CREATE INDEX IF NOT EXISTS idx_articles_dedup_hash ON public.articles(dedup_hash);

-- 5. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.content_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_sync_logs ENABLE ROW LEVEL SECURITY;

-- Public can view active content providers
CREATE POLICY "Public read access to active content providers"
  ON public.content_providers
  FOR SELECT
  USING (is_active = true);

-- Admins and editors have full control over content providers
CREATE POLICY "Privileged manage content providers"
  ON public.content_providers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'editor')
    )
  );

-- Admins and editors can view sync audit logs
CREATE POLICY "Privileged read sync logs"
  ON public.provider_sync_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'editor')
    )
  );

-- 6. SEED THE 10 REAL CONTENT PROVIDERS
INSERT INTO public.content_providers (id, name, description, content_identity, requires_api_key, env_key_name, is_active, sync_interval_minutes)
VALUES
  ('gdelt', 'GDELT Project 2.0', 'Global Database of Events, Language, and Tone tracking worldwide news and developments', 'news', false, NULL, true, 30),
  ('guardian', 'The Guardian API', 'Independent international journalism, investigative reporting, and cultural commentary', 'news', false, 'GUARDIAN_API_KEY', true, 60),
  ('blogger', 'Blogger API', 'Long-form independent essays, research dispatches, and publisher blogs', 'editorial', false, 'BLOGGER_API_KEY', true, 120),
  ('rss', 'RSS Publication Engine', 'Syndicated discovery feeds from leading independent publications and long-form journals', 'editorial', false, NULL, true, 60),
  ('devto', 'DEV Community API', 'Community developer publications, software architecture guides, and engineering reflections', 'community', false, 'DEVTO_API_KEY', true, 60),
  ('hashnode', 'Hashnode API', 'Community-driven software engineering publications and tech journals', 'community', false, 'HASHNODE_API_KEY', true, 60),
  ('arxiv', 'arXiv Scientific Repository', 'Open-access archive for scientific papers in computer science, neuroscience, and quantum physics', 'discover', false, NULL, true, 180),
  ('openalex', 'OpenAlex Scholarly Index', 'Open-access index of global scholarly research papers, scientific journals, and citations', 'discover', false, 'OPENALEX_API_KEY', true, 180),
  ('gutendex', 'Gutendex Project Gutenberg', 'Public-domain classic literature, philosophical treatises, and historic literary canon', 'books', false, NULL, true, 360),
  ('wikipedia', 'Wikipedia Knowledge Graph', 'The free encyclopedia: deep overviews, conceptual foundations, and philosophical inquiries', 'discover', false, NULL, true, 360)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  content_identity = EXCLUDED.content_identity,
  requires_api_key = EXCLUDED.requires_api_key,
  env_key_name = EXCLUDED.env_key_name,
  is_active = EXCLUDED.is_active,
  sync_interval_minutes = EXCLUDED.sync_interval_minutes,
  updated_at = timezone('utc'::text, now());
