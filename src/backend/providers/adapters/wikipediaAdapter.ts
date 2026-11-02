/**
 * Wikipedia Content Provider Adapter
 * Universal knowledge discovery, encyclopedic concepts, and intellectual synthesis
 * Content Identity: 'discover'
 */

import { BaseProviderAdapter } from '../baseAdapter.ts';
import { NormalizedProviderItem, ProviderFetchOptions } from '../types.ts';
import { ContentProviderId, ContentIdentity } from '../../types.ts';

export class WikipediaAdapter extends BaseProviderAdapter {
  readonly id: ContentProviderId = 'wikipedia';
  readonly name = 'Wikipedia Knowledge Graph';
  readonly description = 'The free encyclopedia: deep overviews, conceptual foundations, and philosophical inquiries';
  readonly contentIdentity: ContentIdentity = 'discover';
  readonly requiresApiKey = false;

  async fetchContent(options: ProviderFetchOptions = {}): Promise<NormalizedProviderItem[]> {
    const query = options.query || options.category || 'neuroscience cognition philosophy';
    const limit = Math.min(options.limit || 8, 20);

    const encoded = encodeURIComponent(query);
    const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encoded}&gsrlimit=${limit}&prop=extracts|pageimages|info&exintro=1&explaintext=1&piprop=thumbnail&pithumbsize=800&inprop=url&format=json&origin=*`;

    const res = await this.safeFetch(url, {}, 8000, 1);
    if (!res.ok) {
      throw new Error(`Wikipedia API error HTTP ${res.status}`);
    }

    const data = await res.json();
    const pages = Object.values(data?.query?.pages || {});

    return pages.map((page: any) => {
      const title = this.sanitizeText(page.title || 'Encyclopedic Concept');
      const originalUrl = page.fullurl || `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title || '')}`;
      const extract = this.sanitizeText(page.extract || 'Knowledge overview from Wikipedia.');
      const summary = extract.slice(0, 240) + '...';
      const coverImageUrl = page.thumbnail?.source || undefined;
      const externalId = `wiki_${page.pageid || Math.random().toString(36).slice(2, 8)}`;

      const attributionHtml = `
<div class="readaday-attribution-card p-4 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-300 my-4">
  <div class="flex items-center justify-between">
    <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Creative Commons Knowledge</span>
    <span class="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">CC BY-SA 4.0</span>
  </div>
  <p class="mt-2 text-sm text-slate-400">
    Text syndicated from <strong>Wikipedia</strong>, the free encyclopedia, under the Creative Commons Attribution-ShareAlike 4.0 International License.
  </p>
  <a href="${originalUrl}" target="_blank" rel="noopener noreferrer" class="mt-3 inline-block text-amber-400 hover:text-amber-300 text-sm font-medium hover:underline">
    Explore complete article on Wikipedia &rarr;
  </a>
</div>
      `.trim();

      const content = `
<div class="readaday-encyclopedic-entry">
  <div class="prose max-w-none text-slate-200 leading-relaxed font-serif text-base mb-6">
    <p class="summary-lead text-lg mb-4 text-slate-100 font-serif">${extract.slice(0, 400)}</p>
    <div class="extract-extended text-slate-300">
      ${extract.slice(400, 2000)}
    </div>
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
        authorName: 'Wikipedia Editors',
        categoryName: 'Focus & Cognition',
        categorySlug: 'focus-cognition',
        tags: ['knowledge', 'encyclopedia', 'discover', 'foundations'],
        coverImageUrl,
        sourcePublisher: 'Wikipedia',
        originalUrl,
        contentRights: 'licensed_full', // CC BY-SA allows full licensed text with attribution
        fullContentPermitted: true,
        readingTimeMinutes: this.estimateReadingTime(extract),
        publishedAt: new Date().toISOString(),
        metadata: {
          pageId: page.pageid,
          ns: page.ns,
        },
      };
    });
  }
}
