/**
 * Supabase Edge Function: Ingest News
 * Scheduled RSS & Licensed Wire Ingestion Worker
 * Enforces deduplication, publisher attribution, and strict copyright rights compliance.
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

    // Fetch active news sources
    const { data: sources, error: sourcesError } = await supabase
      .from('news_sources')
      .select('*')
      .eq('is_active', true);

    if (sourcesError) throw sourcesError;

    const ingestionResults = [];

    for (const source of sources || []) {
      // Fetch RSS XML
      const res = await fetch(source.rss_url, {
        headers: { 'User-Agent': 'readAday-NewsBot/1.0 (+https://readaday.com/bot)' },
      });
      const xmlText = await res.text();

      // Simple regex extraction for RSS items (Deno Edge compatible)
      const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
      let match;
      let count = 0;

      while ((match = itemRegex.exec(xmlText)) !== null && count < 10) {
        const itemXml = match[1];
        const title = (itemXml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i) || [])[1]?.trim() || '';
        const link = (itemXml.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i) || [])[1]?.trim() || '';
        const desc = (itemXml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i) || [])[1]?.trim() || '';
        const pubDate = (itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i) || [])[1]?.trim();

        if (!title || !link) continue;

        // Compute dedup hash
        const cleanUrl = link.split('?')[0].toLowerCase().trim();
        const cleanTitle = title.toLowerCase().replace(/[^\w\s]/g, '').trim();
        const encoder = new TextEncoder();
        const data = encoder.encode(`${cleanUrl}::${cleanTitle}`);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const dedupHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // Check if story already exists
        const { data: existing } = await supabase
          .from('articles')
          .select('id')
          .eq('dedup_hash', dedupHash)
          .maybeSingle();

        if (existing) continue;

        // Enforce rights: licensed_full vs fair_use_summary
        const isLicensed = source.license_type === 'licensed_full';
        const safeSummary = desc.replace(/<[^>]*>/g, ' ').slice(0, 350).trim();
        const safeContent = isLicensed
          ? desc
          : `<div class="news-attribution"><p>${safeSummary}</p><p class="source-credit">Originally published by ${source.name}. <a href="${link}" target="_blank">Read original &rarr;</a></p></div>`;

        const { error: insertError } = await supabase.from('articles').insert({
          content_type: 'news',
          status: 'published',
          title,
          slug: `news-${dedupHash.slice(0, 8)}`,
          summary: safeSummary,
          content: safeContent,
          author_name: source.name,
          category_id: source.category_id,
          source_publisher: source.name,
          original_url: link,
          content_rights: source.license_type,
          dedup_hash: dedupHash,
          full_content_permitted: isLicensed,
          published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
          last_synced_at: new Date().toISOString(),
          reading_time_minutes: Math.max(1, Math.ceil(safeSummary.split(/\s+/).length / 200)),
        });

        if (!insertError) count++;
      }

      await supabase
        .from('news_sources')
        .update({ last_fetched_at: new Date().toISOString(), total_ingested: source.total_ingested + count })
        .eq('id', source.id);

      ingestionResults.push({ source: source.name, newItems: count });
    }

    return new Response(JSON.stringify({ success: true, results: ingestionResults }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
