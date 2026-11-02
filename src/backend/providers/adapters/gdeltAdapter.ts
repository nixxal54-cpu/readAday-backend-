/**
 * GDELT Content Provider Adapter
 * Latest Global News via GDELT Project 2.0 DOC API
 * Content Identity: 'news'
 */

import { BaseProviderAdapter } from '../baseAdapter.ts';
import { NormalizedProviderItem, ProviderFetchOptions } from '../types.ts';
import { ContentProviderId, ContentIdentity } from '../../types.ts';

export class GdeltAdapter extends BaseProviderAdapter {
  readonly id: ContentProviderId = 'gdelt';
  readonly name = 'GDELT Project 2.0';
  readonly description = 'Global Database of Events, Language, and Tone tracking worldwide news and developments';
  readonly contentIdentity: ContentIdentity = 'news';
  readonly requiresApiKey = false;

  async fetchContent(options: ProviderFetchOptions = {}): Promise<NormalizedProviderItem[]> {
    const query = options.query || options.category || 'technology';
    const limit = Math.min(options.limit || 10, 30);

    const encodedQuery = encodeURIComponent(query);
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodedQuery}&mode=artlist&format=json&maxrecords=${limit}&sort=DateDesc`;

    const res = await this.safeFetch(url, {}, 9000, 1);
    if (!res.ok) {
      throw new Error(`GDELT API responded with HTTP status ${res.status}`);
    }

    const data = await res.json();
    const articles = data?.articles || [];

    return articles.map((raw: any) => {
      const title = this.sanitizeText(raw.title || 'Global News Dispatch');
      const domain = raw.domain || 'Global Wire';
      const originalUrl = raw.url;
      const seenDate = raw.seendate ? this.parseGdeltDate(raw.seendate) : new Date().toISOString();
      const externalId = `gdelt_${raw.url ? Buffer.from(raw.url).toString('base64').slice(-16) : Math.random().toString(36).slice(2, 10)}`;

      const summary = `Breaking reporting from ${domain}. Monitored and indexed via the GDELT Project 2.0 global event database.`;

      const attributionHtml = this.buildAttributionBox(
        domain,
        originalUrl,
        'Full article content is licensed exclusively by the source publisher. readAday adheres strictly to fair use excerpting.'
      );

      const content = `
<div class="readaday-news-story">
  <p class="text-base text-slate-300 leading-relaxed font-serif mb-4">
    ${summary}
  </p>
  <div class="meta-tagline text-sm text-slate-400 mb-6">
    <span>Original domain: <strong>${domain}</strong></span> |
    <span>Ingested: <strong>${new Date(seenDate).toLocaleDateString()}</strong></span>
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
        contentType: 'news',
        authorName: domain,
        categoryName: 'Latest News & Wire',
        categorySlug: 'news',
        tags: ['news', 'global', 'gdelt', domain.toLowerCase().replace(/[^a-z0-9]/g, '')].filter(Boolean),
        coverImageUrl: raw.socialimage || undefined,
        sourcePublisher: domain,
        originalUrl,
        contentRights: 'fair_use_summary',
        fullContentPermitted: false,
        readingTimeMinutes: 2,
        publishedAt: seenDate,
        metadata: {
          language: raw.language,
          domain: raw.domain,
        },
      };
    });
  }

  private parseGdeltDate(gdeltDateStr: string): string {
    // Format: YYYYMMDDTHHMMSSZ or YYYYMMDDHHMMSS
    if (gdeltDateStr.length === 14) {
      const y = gdeltDateStr.slice(0, 4);
      const m = gdeltDateStr.slice(4, 6);
      const d = gdeltDateStr.slice(6, 8);
      const h = gdeltDateStr.slice(8, 10);
      const min = gdeltDateStr.slice(10, 12);
      const s = gdeltDateStr.slice(12, 14);
      return `${y}-${m}-${d}T${h}:${min}:${s}Z`;
    }
    return new Date().toISOString();
  }
}
