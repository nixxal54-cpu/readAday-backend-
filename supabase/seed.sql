-- ==============================================================================
-- readAday - Database Seed Data
-- ==============================================================================

-- 1. CATEGORIES
INSERT INTO public.categories (id, slug, name, description, icon, display_order)
VALUES
  ('c1000000-0000-0000-0000-000000000001', 'focus-cognition', 'Focus & Cognition', 'Mental clarity, deep work, and cognitive architecture.', 'Brain', 1),
  ('c1000000-0000-0000-0000-000000000002', 'technology-ai', 'Technology & Systems', 'Artificial intelligence, software design, and digital futures.', 'Cpu', 2),
  ('c1000000-0000-0000-0000-000000000003', 'literature-essays', 'Literature & Essays', 'Long-form narrative, literary essays, and independent journalism.', 'BookOpen', 3),
  ('c1000000-0000-0000-0000-000000000004', 'science-cosmos', 'Science & Nature', 'Physics, biology, ecological frontiers, and cosmic inquiry.', 'Sparkles', 4),
  ('c1000000-0000-0000-0000-000000000005', 'philosophy-culture', 'Philosophy & Culture', 'Ethics, culture, epistemology, and historical thought.', 'Compass', 5)
ON CONFLICT (slug) DO NOTHING;

-- 2. TOPICS
INSERT INTO public.topics (id, slug, name, category_id, description)
VALUES
  ('t1000000-0000-0000-0000-000000000001', 'deep-work', 'Deep Work', 'c1000000-0000-0000-0000-000000000001', 'Uninterrupted attentional states and deliberate practice.'),
  ('t1000000-0000-0000-0000-000000000002', 'neuroplasticity', 'Neuroplasticity', 'c1000000-0000-0000-0000-000000000001', 'Structural adaptations in the human brain.'),
  ('t1000000-0000-0000-0000-000000000003', 'transformers-llm', 'Transformers & LLMs', 'c1000000-0000-0000-0000-000000000002', 'Attention mechanisms and synthetic intelligence.'),
  ('t1000000-0000-0000-0000-000000000004', 'cognitive-architecture', 'Cognitive Architecture', 'c1000000-0000-0000-0000-000000000002', 'Computational theories of mind and agentic reasoning.'),
  ('t1000000-0000-0000-0000-000000000005', 'marginalia-reading', 'Marginalia & Reading', 'c1000000-0000-0000-0000-000000000003', 'Active reading, note-taking, and synthesis.'),
  ('t1000000-0000-0000-0000-000000000006', 'quantum-foundations', 'Quantum Foundations', 'c1000000-0000-0000-0000-000000000004', 'Measurement problem, entanglement, and information theory.')
ON CONFLICT (slug) DO NOTHING;

-- 3. TOPIC RELATIONSHIPS (Rabbit Hole Discovery Graph)
INSERT INTO public.topic_relationships (source_topic_id, target_topic_id, affinity_score, relationship_type, rationale)
VALUES
  ('t1000000-0000-0000-0000-000000000001', 't1000000-0000-0000-0000-000000000002', 0.88, 'prerequisite', 'Deep work states leverage synaptic plasticity thresholds.'),
  ('t1000000-0000-0000-0000-000000000002', 't1000000-0000-0000-0000-000000000004', 0.92, 'deep_dive', 'Neurobiological plasticity inspires computational cognitive architectures.'),
  ('t1000000-0000-0000-0000-000000000004', 't1000000-0000-0000-0000-000000000003', 0.85, 'related', 'Transformer models mirror aspects of distributed cognitive memory.'),
  ('t1000000-0000-0000-0000-000000000001', 't1000000-0000-0000-0000-000000000005', 0.79, 'related', 'Marginalia acts as an external cognitive buffer for focused synthesis.')
ON CONFLICT DO NOTHING;

-- 4. NEWS SOURCES
INSERT INTO public.news_sources (name, rss_url, category_id, license_type, is_active, fetch_interval_minutes, total_ingested)
VALUES
  ('TechCrunch Wire', 'https://techcrunch.com/feed/', 'c1000000-0000-0000-0000-000000000002', 'fair_use_summary', true, 30, 42),
  ('Ars Technica Science', 'https://feeds.arstechnica.com/arstechnica/science', 'c1000000-0000-0000-0000-000000000004', 'fair_use_summary', true, 60, 28),
  ('readAday Syndicate Dispatch', 'https://syndicate.readaday.internal/wire.xml', 'c1000000-0000-0000-0000-000000000002', 'licensed_full', true, 15, 12)
ON CONFLICT (rss_url) DO NOTHING;
