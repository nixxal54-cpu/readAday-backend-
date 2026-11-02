/**
 * Supabase Edge Function: Scheduled Publishing Worker
 * Automatically transitions articles from 'scheduled' to 'published'
 * when scheduled_for <= NOW().
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

    const nowIso = new Date().toISOString();

    // Query articles ready to publish
    const { data: readyArticles, error: selectError } = await supabase
      .from('articles')
      .select('id, title, content_type, scheduled_for')
      .eq('status', 'scheduled')
      .lte('scheduled_for', nowIso);

    if (selectError) throw selectError;

    if (!readyArticles || readyArticles.length === 0) {
      return new Response(JSON.stringify({ success: true, publishedCount: 0, message: 'No articles due for publication.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const idsToPublish = readyArticles.map((a) => a.id);

    // Update status to published
    const { error: updateError } = await supabase
      .from('articles')
      .update({
        status: 'published',
        published_at: nowIso,
        updated_at: nowIso,
      })
      .in('id', idsToPublish);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        publishedCount: idsToPublish.length,
        articles: readyArticles,
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
