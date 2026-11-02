/**
 * RSS Content Provider Adapter
 * Blog discovery, premier intellectual publications, and independent article feeds
 * Content Identity: 'editorial'
 */

import { BaseProviderAdapter } from '../baseAdapter.ts';
import { NormalizedProviderItem, ProviderFetchOptions } from '../types.ts';
import { ContentProviderId, ContentIdentity } from '../../types.ts';

interface RssFeedTarget {
  name: string;
  url: string;
  category: string;
  categorySlug: string;
}

const DEFAULT_EDITORIAL_FEEDS: RssFeedTarget[] = [
  {
    name: 'Ars Technica In-Depth',
    url: 'https://feeds.arstechnica.com/arstechnica/index',
    category: 'Technology & Systems',
    categorySlug: 'technology-ai',
  },
  {
    name: 'Aeon Essays',
    url: 'https://aeon.co/feed.rss',
    category: 'Philosophy & Culture',
    categorySlug: 'philosophy-culture',
  },
];

export class RssAdapter extends BaseProviderAdapter {
  readonly id: ContentProviderId = 'rss';
  readonly name = 'RSS Publication Engine';
  readonly description = 'Syndicated discovery feeds from leading independent publications and long-form journals';
  readonly contentIdentity: ContentIdentity = 'editorial';
  readonly requiresApiKey = false;

  async fetchContent(options: ProviderFetchOptions = {}): Promise<NormalizedProviderItem[]> {
    const limit = Math.min(options.limit || 8, 20);
    const feedTargets = DEFAULT_EDITORIAL_FEEDS;
    const allItems: NormalizedProviderItem[] = [];

    for (const target of feedTargets) {
      try {
        const res = await this.safeFetch(target.url, {}, 7000, 1);
        if (!res.ok) continue;

        const xml = await res.text();
        const parsed = this.parseFeedXml(xml, target);
        allItems.push(...parsed);

        if (allItems.length >= limit) break;
      } catch (err) {
        // Continue to next feed if one fails
      }
    }

    return allItems.slice(0, limit);
  }

  private parseFeedXml(xmlText: string, target: RssFeedTarget): NormalizedProviderItem[] {
    const items: NormalizedProviderItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;

    while ((match = itemRegex.exec(xmlText)) !== null) {
      const itemXml = match[1];
      const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
      const linkMatch = itemXml.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
      const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
      const contentMatch = itemXml.match(/<content:encoded>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content:encoded>/i);
      const dateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
      const creatorMatch = itemXml.match(/<dc:creator>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/dc:creator>/i);
      const mediaMatch = itemXml.match(/<media:content[^>]+url="([^"]+)"/i) || itemXml.match(/<enclosure[^>]+url="([^"]+)"/i);

      const title = this.sanitizeText(titleMatch ? titleMatch[1] : '');
      const link = linkMatch ? linkMatch[1].trim() : '';
      const summary = this.sanitizeText(descMatch ? descMatch[1] : '').slice(0, 260) + '...';
      const author = creatorMatch ? this.sanitizeText(creatorMatch[1]) : target.name;
      const pubDate = dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString();
      const coverImageUrl = mediaMatch ? mediaMatch[1] : undefined;
      const rawBody = contentMatch ? contentMatch[1] : descMatch ? descMatch[1] : '';

      if (title && link) {
        const externalId = `rss_${Buffer.from(link).toString('base64').slice(-12)}`;
        const attribution = this.buildAttributionBox(
          target.name,
          link,
          'Ingested via RSS discovery feed. Full content remains with original copyright holder.'
        );

        const content = `
<div class="readaday-editorial-article">
  <p class="summary-lead text-lg font-serif text-slate-200 mb-4 leading-relaxed">${summary}</p>
  <div class="article-excerpt prose max-w-none text-slate-300 font-serif leading-relaxed mb-6">
    ${this.sanitizeText(rawBody).slice(0, 1400)}
  </div>
  ${attribution}
</div>
        `.trim();

        items.push({
          externalId,
          title,
          slug: this.generateSlug(title, externalId),
          summary,
          content,
          contentType: 'editorial',
          authorName: author,
          categoryName: target.category,
          categorySlug: target.categorySlug,
          tags: ['editorial', 'discovery', target.name.toLowerCase().replace(/[^a-z0-9]/g, '-')],
          coverImageUrl,
          sourcePublisher: target.name,
          originalUrl: link,
          contentRights: 'fair_use_summary',
          fullContentPermitted: false,
          readingTimeMinutes: this.estimateReadingTime(summary + ' ' + rawBody),
          publishedAt: pubDate,
        });
      }
    }

    return items;
  }
}
