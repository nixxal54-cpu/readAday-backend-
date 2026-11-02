/**
 * The Guardian Content Provider Adapter
 * News articles via Guardian Open Platform API / Wire Feeds
 * Content Identity: 'news'
 */

import { BaseProviderAdapter } from '../baseAdapter.ts';
import { NormalizedProviderItem, ProviderFetchOptions } from '../types.ts';
import { ContentProviderId, ContentIdentity } from '../../types.ts';

export class GuardianAdapter extends BaseProviderAdapter {
  readonly id: ContentProviderId = 'guardian';
  readonly name = 'The Guardian API';
  readonly description = 'Independent international journalism, investigative reporting, and cultural commentary';
  readonly contentIdentity: ContentIdentity = 'news';
  readonly requiresApiKey = false; // Graceful public fallback to open feed if key not provided
  readonly envKeyName = 'GUARDIAN_API_KEY';

  async fetchContent(options: ProviderFetchOptions = {}): Promise<NormalizedProviderItem[]> {
    const apiKey = process.env.GUARDIAN_API_KEY;
    const query = options.query || options.category || 'technology';
    const limit = Math.min(options.limit || 10, 25);
    const page = options.page || 1;

    if (apiKey) {
      try {
        return await this.fetchFromGuardianApi(apiKey, query, limit, page);
      } catch (err: any) {
        // Fall back to Guardian wire feed on auth failure
        return await this.fetchFromGuardianRss(query, limit);
      }
    }

    // Default to Guardian live wire feed when no API key is set
    return await this.fetchFromGuardianRss(query, limit);
  }

  private async fetchFromGuardianApi(
    apiKey: string,
    query: string,
    limit: number,
    page: number
  ): Promise<NormalizedProviderItem[]> {
    const encoded = encodeURIComponent(query);
    const url = `https://content.guardianapis.com/search?api-key=${apiKey}&q=${encoded}&page-size=${limit}&page=${page}&show-fields=headline,trailText,byline,thumbnail,bodyText,publication`;

    const res = await this.safeFetch(url);
    if (!res.ok) {
      throw new Error(`Guardian API error HTTP ${res.status}`);
    }

    const data = await res.json();
    const results = data?.response?.results || [];

    return results.map((item: any) => {
      const fields = item.fields || {};
      const title = this.sanitizeText(fields.headline || item.webTitle);
      const originalUrl = item.webUrl;
      const byline = fields.byline || 'The Guardian';
      const summary = this.sanitizeText(fields.trailText || 'News coverage from The Guardian.');
      const coverImageUrl = fields.thumbnail || undefined;
      const publishedAt = item.webPublicationDate || new Date().toISOString();
      const sectionName = item.sectionName || 'World News';
      const externalId = `guardian_${item.id.replace(/[^a-zA-Z0-9]/g, '_')}`;

      const attributionHtml = this.buildAttributionBox(
        'The Guardian',
        originalUrl,
        'Original journalism by The Guardian. Displayed under editorial fair-use excerpt standards.'
      );

      const content = `
<div class="readaday-guardian-article">
  <p class="summary-lead text-lg font-serif text-slate-200 mb-4 leading-relaxed">${summary}</p>
  <div class="guardian-meta text-xs text-slate-400 uppercase tracking-wider mb-6">
    <span>Section: <strong>${sectionName}</strong></span> &bull; 
    <span>By: <strong>${byline}</strong></span>
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
        authorName: byline,
        categoryName: sectionName,
        categorySlug: 'news',
        tags: ['guardian', 'news', sectionName.toLowerCase().replace(/[^a-z0-9]/g, '-')].filter(Boolean),
        coverImageUrl,
        sourcePublisher: 'The Guardian',
        originalUrl,
        contentRights: 'fair_use_summary',
        fullContentPermitted: false,
        readingTimeMinutes: this.estimateReadingTime(summary + ' ' + title),
        publishedAt,
        metadata: {
          sectionId: item.sectionId,
          pillarName: item.pillarName,
        },
      };
    });
  }

  private async fetchFromGuardianRss(query: string, limit: number): Promise<NormalizedProviderItem[]> {
    const feedUrl = query.toLowerCase().includes('tech')
      ? 'https://www.theguardian.com/technology/rss'
      : 'https://www.theguardian.com/world/rss';

    const res = await this.safeFetch(feedUrl);
    if (!res.ok) {
      throw new Error(`Guardian RSS fallback error HTTP ${res.status}`);
    }

    const xml = await res.text();
    const items: NormalizedProviderItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;

    while ((match = itemRegex.exec(xml)) !== null && items.length < limit) {
      const itemXml = match[1];
      const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
      const linkMatch = itemXml.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
      const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
      const dateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
      const creatorMatch = itemXml.match(/<dc:creator>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/dc:creator>/i);
      const mediaMatch = itemXml.match(/<media:content[^>]+url="([^"]+)"/i);

      const title = this.sanitizeText(titleMatch ? titleMatch[1] : '');
      const link = linkMatch ? linkMatch[1].trim() : '';
      const summary = this.sanitizeText(descMatch ? descMatch[1] : '');
      const author = creatorMatch ? this.sanitizeText(creatorMatch[1]) : 'The Guardian';
      const pubDate = dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString();
      const coverImageUrl = mediaMatch ? mediaMatch[1] : undefined;

      if (title && link) {
        const externalId = `guardian_wire_${Buffer.from(link).toString('base64').slice(-12)}`;
        const attribution = this.buildAttributionBox(
          'The Guardian',
          link,
          'Ingested via Guardian international wire. Fair-use synopsis.'
        );

        items.push({
          externalId,
          title,
          slug: this.generateSlug(title, externalId),
          summary: summary.slice(0, 240) + '...',
          content: `
<div class="readaday-guardian-article">
  <p class="summary-lead text-base font-serif text-slate-200 mb-4">${summary}</p>
  ${attribution}
</div>
          `.trim(),
          contentType: 'news',
          authorName: author,
          categoryName: 'Latest News & Wire',
          categorySlug: 'news',
          tags: ['news', 'guardian', 'international'],
          coverImageUrl,
          sourcePublisher: 'The Guardian',
          originalUrl: link,
          contentRights: 'fair_use_summary',
          fullContentPermitted: false,
          readingTimeMinutes: 3,
          publishedAt: pubDate,
        });
      }
    }

    return items;
  }
}
