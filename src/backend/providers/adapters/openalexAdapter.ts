/**
 * OpenAlex Content Provider Adapter
 * Academic discovery across global scholarly works, journals, and citations
 * Content Identity: 'discover'
 */

import { BaseProviderAdapter } from '../baseAdapter.ts';
import { NormalizedProviderItem, ProviderFetchOptions } from '../types.ts';
import { ContentProviderId, ContentIdentity } from '../../types.ts';

export class OpenalexAdapter extends BaseProviderAdapter {
  readonly id: ContentProviderId = 'openalex';
  readonly name = 'OpenAlex Scholarly Index';
  readonly description = 'Open-access index of global scholarly research papers, scientific journals, and citations';
  readonly contentIdentity: ContentIdentity = 'discover';
  readonly requiresApiKey = false;
  readonly envKeyName = 'OPENALEX_API_KEY';

  async fetchContent(options: ProviderFetchOptions = {}): Promise<NormalizedProviderItem[]> {
    const query = options.query || options.category || 'neuroscience OR cognition';
    const limit = Math.min(options.limit || 8, 20);
    const page = options.page || 1;
    const apiKey = process.env.OPENALEX_API_KEY;

    let url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=${limit}&page=${page}&filter=has_abstract:true`;
    if (apiKey) {
      url += `&api_key=${apiKey}`;
    }

    const res = await this.safeFetch(url, {
      headers: {
        'User-Agent': 'readAday-Discovery/1.0 (https://readaday.internal; mailto:discovery-engine@readaday.internal)',
      },
    });

    if (!res.ok) {
      if (res.status === 429) {
        throw new Error('OpenAlex API rate limit exceeded. Configure OPENALEX_API_KEY for unconstrained capacity.');
      }
      throw new Error(`OpenAlex API error HTTP ${res.status}`);
    }

    const data = await res.json();
    const results = data?.results || [];

    return results.map((work: any) => {
      const title = this.sanitizeText(work.display_name || work.title || 'Scholarly Work');
      const doi = work.doi || '';
      const originalUrl = doi || work.primary_location?.landing_page_url || `https://openalex.org/${work.id}`;
      const publishedYear = work.publication_year || new Date().getFullYear();
      const publishedAt = work.publication_date ? new Date(work.publication_date).toISOString() : `${publishedYear}-01-01T00:00:00Z`;

      // Extract authors
      const authors = (work.authorships || [])
        .map((a: any) => a.author?.display_name)
        .filter(Boolean);
      const authorDisplay = authors.length > 0 ? authors.slice(0, 3).join(', ') + (authors.length > 3 ? ' et al.' : '') : 'Scholarly Authors';

      // Reconstruct abstract from inverted index
      const abstract = this.reconstructAbstract(work.abstract_inverted_index) || 'Scholarly research contribution.';
      const summary = abstract.slice(0, 240) + '...';

      // Concepts / tags
      const concepts = (work.concepts || [])
        .map((c: any) => c.display_name?.toLowerCase())
        .filter(Boolean)
        .slice(0, 5);

      const externalId = `openalex_${work.id.split('/').pop()}`;

      const attributionHtml = `
<div class="readaday-attribution-card p-4 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-300 my-4">
  <div class="flex items-center justify-between">
    <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">OpenAlex Academic Index</span>
    <span class="text-xs px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">Citations: ${work.cited_by_count || 0}</span>
  </div>
  <p class="mt-2 text-sm text-slate-400">
    Published in <em>${work.primary_location?.source?.display_name || 'Academic Venue'}</em> (${publishedYear}). DOI: <code>${doi || 'N/A'}</code>
  </p>
  <a href="${originalUrl}" target="_blank" rel="noopener noreferrer" class="mt-3 inline-block text-amber-400 hover:text-amber-300 text-sm font-medium hover:underline">
    View complete scholarly publication record &rarr;
  </a>
</div>
      `.trim();

      const content = `
<div class="readaday-academic-article">
  <div class="abstract-body mb-6">
    <h3 class="text-xs font-bold uppercase tracking-wider text-sky-400 mb-2">Research Abstract</h3>
    <p class="text-slate-200 leading-relaxed font-serif text-base">${abstract}</p>
  </div>
  ${attributionHtml}
</div>
      `.trim();

      return {
        externalId,
        title,
        slug: this.generateSlug(title, externalId),
        summary,
        content,
        contentType: 'discover',
        authorName: authorDisplay,
        categoryName: 'Science & Nature',
        categorySlug: 'science-cosmos',
        tags: ['academic', 'openalex', 'research', ...concepts],
        coverImageUrl: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=1200&q=80',
        sourcePublisher: 'OpenAlex Scholarly Network',
        originalUrl,
        contentRights: 'fair_use_summary',
        fullContentPermitted: false,
        readingTimeMinutes: this.estimateReadingTime(abstract),
        publishedAt,
        metadata: {
          doi,
          citedByCount: work.cited_by_count,
          isOpenAccess: work.open_access?.is_oa,
          sourceName: work.primary_location?.source?.display_name,
        },
      };
    });
  }

  /**
   * OpenAlex encodes abstracts as an inverted index: { "word": [positions...] }
   * We reconstruct the original sentence string by sorting positions.
   */
  private reconstructAbstract(invertedIndex?: Record<string, number[]>): string {
    if (!invertedIndex || Object.keys(invertedIndex).length === 0) {
      return '';
    }

    const wordsWithPositions: Array<{ word: string; pos: number }> = [];
    for (const [word, positions] of Object.entries(invertedIndex)) {
      for (const pos of positions) {
        wordsWithPositions.push({ word, pos });
      }
    }

    wordsWithPositions.sort((a, b) => a.pos - b.pos);
    return this.sanitizeText(wordsWithPositions.map((w) => w.word).join(' '));
  }
}
