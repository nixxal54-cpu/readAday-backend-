-- ==============================================================================
-- readAday - PostgreSQL & Supabase Database Migration
-- Version: 20261101000000
-- Premium Digital Reading, Independent Publishing & Content Discovery Platform
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('reader', 'writer', 'editor', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE content_type AS ENUM ('editorial', 'news', 'community');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE article_status AS ENUM ('draft', 'pending_review', 'published', 'rejected', 'archived', 'scheduled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE content_rights AS ENUM ('licensed_full', 'fair_use_summary', 'original_reporting', 'syndicated', 'snippet_only');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE relationship_type AS ENUM ('broader', 'narrower', 'related', 'prerequisite', 'deep_dive');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE application_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE report_reason AS ENUM ('copyright', 'misinformation', 'spam', 'harassment', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'dismissed', 'actioned');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. PROFILES TABLE (Linked to auth.users in Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'reader',
  bio TEXT,
  website TEXT,
  settings JSONB NOT NULL DEFAULT '{"emailNotifications": true, "readingTheme": "dark", "fontSize": 16, "preferredCategories": []}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. TOPICS TABLE (Foundation for Rabbit Hole discovery)
CREATE TABLE IF NOT EXISTS public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. TOPIC RELATIONSHIPS (Graph Edges for Rabbit Hole Discovery)
CREATE TABLE IF NOT EXISTS public.topic_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  target_topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  affinity_score NUMERIC(3, 2) NOT NULL DEFAULT 0.50 CHECK (affinity_score >= 0.00 AND affinity_score <= 1.00),
  relationship_type relationship_type NOT NULL DEFAULT 'related',
  rationale TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_topic_pair UNIQUE (source_topic_id, target_topic_id)
);

-- 7. ARTICLES TABLE (Strictly separated by content_type)
CREATE TABLE IF NOT EXISTS public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type content_type NOT NULL,
  status article_status NOT NULL DEFAULT 'draft',
  title TEXT NOT NULL CHECK (char_length(title) >= 5 AND char_length(title) <= 250),
  slug TEXT UNIQUE NOT NULL,
  summary TEXT NOT NULL CHECK (char_length(summary) >= 10),
  content TEXT NOT NULL,
  cover_image_url TEXT,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  tags TEXT[] NOT NULL DEFAULT '{}'::text[],
  reading_time_minutes INT NOT NULL DEFAULT 1 CHECK (reading_time_minutes >= 1),
  published_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  curation_notes TEXT,
  -- News Engine & Copyright Rights Metadata
  source_publisher TEXT,
  original_url TEXT,
  content_rights content_rights DEFAULT 'original_reporting',
  dedup_hash TEXT,
  full_content_permitted BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  -- Engagement Metrics
  view_count INT NOT NULL DEFAULT 0,
  like_count INT NOT NULL DEFAULT 0,
  bookmark_count INT NOT NULL DEFAULT 0,
  comment_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. CURATED EDITORIAL COLLECTIONS
CREATE TABLE IF NOT EXISTS public.curated_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_editorial_choice BOOLEAN NOT NULL DEFAULT false,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.curated_collections(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  added_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_collection_article UNIQUE (collection_id, article_id)
);

-- 9. READER FEATURES: BOOKMARKS & PROGRESS
CREATE TABLE IF NOT EXISTS public.reading_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_user_bookmark UNIQUE (user_id, article_id)
);

CREATE TABLE IF NOT EXISTS public.reading_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  progress_percent INT NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  scroll_position NUMERIC(5, 4) NOT NULL DEFAULT 0.0000,
  completed BOOLEAN NOT NULL DEFAULT false,
  read_duration_seconds INT NOT NULL DEFAULT 0,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_user_article_history UNIQUE (user_id, article_id)
);

-- 10. READER FEATURES: HIGHLIGHTS & PRIVATE NOTES (CRITICAL USER ISOLATION)
CREATE TABLE IF NOT EXISTS public.highlights_and_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  highlight_text TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'amber',
  start_offset INT,
  end_offset INT,
  private_note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. PERSONAL READING COLLECTIONS
CREATE TABLE IF NOT EXISTS public.personal_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_private BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.personal_collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.personal_collections(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_personal_item UNIQUE (collection_id, article_id)
);

-- 12. COMMUNITY: WRITER APPLICATIONS
CREATE TABLE IF NOT EXISTS public.writer_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sample_urls TEXT[] NOT NULL DEFAULT '{}'::text[],
  bio TEXT NOT NULL,
  topics TEXT[] NOT NULL DEFAULT '{}'::text[],
  status application_status NOT NULL DEFAULT 'pending',
  reviewer_notes TEXT,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 13. COMMUNITY: COMMENTS & INTERACTIONS
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 3000),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'flagged', 'hidden')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.article_likes (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (user_id, article_id)
);

CREATE TABLE IF NOT EXISTS public.author_follows (
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (follower_id, author_id),
  CONSTRAINT no_self_follow CHECK (follower_id <> author_id)
);

-- 14. CONTENT REPORTS & MODERATION
CREATE TABLE IF NOT EXISTS public.content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('article', 'comment', 'user')),
  target_id UUID NOT NULL,
  reason report_reason NOT NULL,
  details TEXT,
  status report_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 15. NEWS ENGINE SOURCES
CREATE TABLE IF NOT EXISTS public.news_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  rss_url TEXT UNIQUE NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  license_type content_rights NOT NULL DEFAULT 'fair_use_summary',
  is_active BOOLEAN NOT NULL DEFAULT true,
  fetch_interval_minutes INT NOT NULL DEFAULT 30,
  last_fetched_at TIMESTAMPTZ,
  total_ingested INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- INDEXES & PERFORMANCE OPTIMIZATIONS
-- ==============================================================================

-- Feed Separation & Querying Indexes
CREATE INDEX IF NOT EXISTS idx_articles_feed_status ON public.articles (content_type, status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON public.articles (slug);
CREATE INDEX IF NOT EXISTS idx_articles_author ON public.articles (author_id);
CREATE INDEX IF NOT EXISTS idx_articles_category ON public.articles (category_id);
CREATE INDEX IF NOT EXISTS idx_articles_dedup_hash ON public.articles (dedup_hash) WHERE dedup_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_articles_scheduled ON public.articles (status, scheduled_for) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_articles_tags ON public.articles USING gin (tags);

-- Reader Feature Indexes
CREATE INDEX IF NOT EXISTS idx_reading_history_user ON public.reading_history (user_id, last_read_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON public.reading_bookmarks (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_highlights_user_article ON public.highlights_and_notes (user_id, article_id);

-- Discovery Graph Indexes
CREATE INDEX IF NOT EXISTS idx_topic_rel_source ON public.topic_relationships (source_topic_id, affinity_score DESC);
CREATE INDEX IF NOT EXISTS idx_topic_rel_target ON public.topic_relationships (target_topic_id, affinity_score DESC);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Helper Functions to read user role safely inside RLS
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_editor_or_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('editor', 'admin')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 1. PROFILES RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Regular users cannot self-escalate role
    AND (role = (SELECT role FROM public.profiles WHERE id = auth.uid()) OR public.is_editor_or_admin())
  );

-- 2. ARTICLES RLS (Feed Separation & Security)
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- Reading Policy: Published articles are public; drafts/pending are strictly private to author or editors/admins
CREATE POLICY "Published articles are readable by all"
  ON public.articles FOR SELECT
  USING (
    status = 'published'
    OR author_id = auth.uid()
    OR public.is_editor_or_admin()
  );

-- Inserting Policy:
-- - Editorial & News require editor/admin
-- - Community requires writer, editor, or admin
CREATE POLICY "Authorized article creation"
  ON public.articles FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      (content_type = 'editorial' AND public.is_editor_or_admin())
      OR (content_type = 'news' AND public.is_editor_or_admin())
      OR (content_type = 'community' AND public.get_current_user_role() IN ('writer', 'editor', 'admin'))
    )
    -- Initial status must be draft or pending_review (unless editor/admin publishing directly)
    AND (
      status IN ('draft', 'pending_review')
      OR public.is_editor_or_admin()
    )
  );

-- Updating Policy: Authors can update drafts/pending; editors/admins can update any
CREATE POLICY "Authorized article editing and publishing"
  ON public.articles FOR UPDATE
  USING (
    author_id = auth.uid()
    OR public.is_editor_or_admin()
  )
  WITH CHECK (
    -- Only editor or admin can transition status to published or rejected
    (status NOT IN ('published', 'rejected', 'archived') OR public.is_editor_or_admin())
    -- Authors cannot change content_type
    AND (content_type = (SELECT content_type FROM public.articles WHERE id = articles.id) OR public.is_editor_or_admin())
  );

-- Deletion Policy: Only author of a draft or admin
CREATE POLICY "Authorized article deletion"
  ON public.articles FOR DELETE
  USING (
    (author_id = auth.uid() AND status = 'draft')
    OR (public.get_current_user_role() = 'admin')
  );

-- 3. HIGHLIGHTS & PRIVATE NOTES (STRICT ISOLATION)
ALTER TABLE public.highlights_and_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users have full and exclusive access to their private notes"
  ON public.highlights_and_notes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. READING BOOKMARKS RLS
ALTER TABLE public.reading_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own bookmarks"
  ON public.reading_bookmarks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. READING HISTORY RLS
ALTER TABLE public.reading_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own reading history"
  ON public.reading_history FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. PERSONAL COLLECTIONS RLS
ALTER TABLE public.personal_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read public collections or their own private collections"
  ON public.personal_collections FOR SELECT
  USING (is_private = false OR auth.uid() = user_id);

CREATE POLICY "Users manage their own collections"
  ON public.personal_collections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 7. WRITER APPLICATIONS RLS
ALTER TABLE public.writer_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Writers view and create their own application"
  ON public.writer_applications FOR SELECT
  USING (auth.uid() = user_id OR public.is_editor_or_admin());

CREATE POLICY "Applicants can submit application"
  ON public.writer_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Editors and admins review applications"
  ON public.writer_applications FOR UPDATE
  USING (public.is_editor_or_admin());

-- 8. COMMENTS RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active comments are readable by all"
  ON public.comments FOR SELECT
  USING (status = 'active' OR auth.uid() = user_id OR public.is_editor_or_admin());

CREATE POLICY "Authenticated users can post comments"
  ON public.comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users edit own comments, editors moderate"
  ON public.comments FOR UPDATE
  USING (auth.uid() = user_id OR public.is_editor_or_admin());

-- 9. CONTENT REPORTS RLS
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users create reports"
  ON public.content_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users see own reports, editors see all"
  ON public.content_reports FOR SELECT
  USING (auth.uid() = reporter_id OR public.is_editor_or_admin());

CREATE POLICY "Editors action reports"
  ON public.content_reports FOR UPDATE
  USING (public.is_editor_or_admin());
