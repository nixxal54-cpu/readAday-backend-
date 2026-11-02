/**
 * Supabase Edge Function: Rabbit Hole Discovery Engine
 * Generates multi-depth topic exploration graph and related content recommendations.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const articleId = url.searchParams.get('articleId');
    const depth = parseInt(url.searchParams.get('depth') || '3', 10);

    if (!articleId) {
      return new Response(JSON.stringify({ error: 'Missing articleId query parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Fetch origin article
    const { data: origin, error: originErr } = await supabase
      .from('articles')
      .select('*, categories(name, slug)')
      .eq('id', articleId)
      .single();

    if (originErr || !origin) {
      return new Response(JSON.stringify({ error: 'Article not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Fetch candidates with matching tags or category
    const { data: candidates, error: candErr } = await supabase
      .from('articles')
      .select('id, title, slug, summary, content_type, tags, reading_time_minutes, published_at, category_id, categories(name, slug)')
      .eq('status', 'published')
      .neq('id', articleId)
      .limit(30);

    if (candErr) throw candErr;

    // 3. Compute topic affinity and build chain
    const originTags = new Set(origin.tags || []);
    const scored = (candidates || []).map((cand: any) => {
      const candTags = new Set(cand.tags || []);
      let shared = 0;
      candTags.forEach((t) => { if (originTags.has(t)) shared++; });
      const sameCat = cand.category_id === origin.category_id ? 0.3 : 0;
      const score = Math.min(1.0, (shared * 0.25) + sameCat);
      return {
        articleId: cand.id,
        title: cand.title,
        slug: cand.slug,
        summary: cand.summary,
        contentType: cand.content_type,
        categoryName: cand.categories?.name || 'General',
        tags: cand.tags,
        affinityScore: Math.round(score * 100) / 100,
        connectionReason: shared > 0 ? `Shared topics: ${Array.from(candTags).filter(t => originTags.has(t)).join(', ')}` : 'Categorical synergy',
      };
    });

    scored.sort((a: any, b: any) => b.affinityScore - a.affinityScore);
    const trail = scored.slice(0, depth).map((node: any, idx: number) => ({
      ...node,
      depth: idx + 1,
    }));

    return new Response(
      JSON.stringify({
        origin: { id: origin.id, title: origin.title, slug: origin.slug, category: origin.categories?.name },
        depth,
        trail,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
