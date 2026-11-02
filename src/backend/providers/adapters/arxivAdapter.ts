/**
 * arXiv Content Provider Adapter
 * Scientific research, physics, mathematics, and machine learning preprints
 * Content Identity: 'discover'
 */

import { BaseProviderAdapter } from '../baseAdapter.ts';
import { NormalizedProviderItem, ProviderFetchOptions } from '../types.ts';
import { ContentProviderId, ContentIdentity } from '../../types.ts';

export class ArxivAdapter extends BaseProviderAdapter {
  readonly id: ContentProviderId = 'arxiv';
  readonly name = 'arXiv Scientific Repository';
  readonly description = 'Open-access archive for scientific papers in computer science, neuroscience, and quantum physics';
  readonly contentIdentity: ContentIdentity = 'discover';
  readonly requiresApiKey = false;

  async fetchContent(options: ProviderFetchOptions = {}): Promise<NormalizedProviderItem[]> {
    const query = options.query || options.category || 'all:artificial intelligence OR all:quantum OR all:cognition';
    const limit = Math.min(options.limit || 8, 20);
    const start = options.page ? (options.page - 1) * limit : 0;

    const encoded = encodeURIComponent(query);
    const url = `https://export.arxiv.org/api/query?search_query=${encoded}&start=${start}&max_results=${limit}&sortBy=submittedDate&sortOrder=descending`;

    const res = await this.safeFetch(url, {}, 8000, 1);
    if (!res.ok) {
      throw new Error(`arXiv API error HTTP ${res.status}`);
    }

    const xmlText = await res.text();
    return this.parseArxivAtom(xmlText);
  }

  private parseArxivAtom(xmlText: string): NormalizedProviderItem[] {
    const items: NormalizedProviderItem[] = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
    let match;

    while ((match = entryRegex.exec(xmlText)) !== null) {
      const entryXml = match[1];
      const idMatch = entryXml.match(/<id>([\s\S]*?)<\/id>/i);
      const titleMatch = entryXml.match(/<title>([\s\S]*?)<\/title>/i);
      const summaryMatch = entryXml.match(/<summary>([\s\S]*?)<\/summary>/i);
      const publishedMatch = entryXml.match(/<published>([\s\S]*?)<\/published>/i);
      const categoryMatch = entryXml.match(/<arxiv:primary_category[^>]+term="([^"]+)"/i);

      // Extract authors
      const authorNames: string[] = [];
      const authorRegex = /<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/gi;
      let authorMatch;
      while ((authorMatch = authorRegex.exec(entryXml)) !== null) {
        authorNames.push(this.sanitizeText(authorMatch[1]));
      }

      // Extract canonical URL and PDF
      const rawId = idMatch ? idMatch[1].trim() : '';
      const arxivId = rawId.split('/abs/').pop() || rawId.split('/').pop() || Math.random().toString(36).slice(2, 8);
      const canonicalUrl = rawId.startsWith('http') ? rawId : `https://arxiv.org/abs/${arxivId}`;
      const pdfUrl = `https://arxiv.org/pdf/${arxivId}.pdf`;

      const title = this.sanitizeText(titleMatch ? titleMatch[1] : 'Scientific Preprint');
      const abstractText = this.sanitizeText(summaryMatch ? summaryMatch[1] : 'No abstract provided.');
      const primaryCategory = categoryMatch ? categoryMatch[1] : 'cs.AI';
      const authorDisplay = authorNames.length > 0 ? authorNames.slice(0, 3).join(', ') + (authorNames.length > 3 ? ' et al.' : '') : 'Scientific Researcher';
      const publishedAt = publishedMatch ? new Date(publishedMatch[1]).toISOString() : new Date().toISOString();
      const externalId = `arxiv_${arxivId.replace(/[^a-zA-Z0-9]/g, '_')}`;

      const attributionHtml = `
<div class="readaday-attribution-card p-4 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-300 my-4">
  <div class="flex items-center justify-between">
    <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Open Access Repository</span>
    <span class="text-xs px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800">arXiv: ${arxivId}</span>
  </div>
  <p class="mt-2 text-sm text-slate-400">
    Published on <strong>arXiv</strong> by <em>${authorDisplay}</em>. Primary subject: <code>${primaryCategory}</code>.
  </p>
  <div class="mt-3 flex items-center space-x-4">
    <a href="${canonicalUrl}" target="_blank" rel="noopener noreferrer" class="text-amber-400 hover:text-amber-300 text-sm font-medium hover:underline">
      View arXiv Abstract &rarr;
    </a>
    <a href="${pdfUrl}" target="_blank" rel="noopener noreferrer" class="text-sky-400 hover:text-sky-300 text-sm font-medium hover:underline">
      Download PDF &rarr;
    </a>
  </div>
</div>
      `.trim();

      const content = `
<div class="readaday-research-paper">
  <div class="abstract-section p-4 rounded bg-slate-900/40 border-l-4 border-amber-500 mb-6">
    <h3 class="text-sm font-bold uppercase text-amber-400 tracking-wider mb-2">Paper Abstract</h3>
    <p class="text-slate-200 leading-relaxed font-serif text-base">${abstractText}</p>
  </div>
  ${attributionHtml}
</div>
      `.trim();

      items.push({
        externalId,
        title,
        slug: this.generateSlug(title, externalId),
        summary: abstractText.slice(0, 240) + '...',
        content,
        contentType: 'discover',
        authorName: authorDisplay,
        categoryName: 'Science & Nature',
        categorySlug: 'science-cosmos',
        tags: ['research', 'preprint', 'arxiv', primaryCategory.toLowerCase()],
        coverImageUrl: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=1200&q=80',
        sourcePublisher: 'arXiv.org',
        originalUrl: canonicalUrl,
        contentRights: 'fair_use_summary',
        fullContentPermitted: false,
        readingTimeMinutes: this.estimateReadingTime(abstractText),
        publishedAt,
        metadata: {
          arxivId,
          primaryCategory,
          pdfUrl,
          totalAuthors: authorNames.length,
        },
      });
    }

    return items;
  }
}
