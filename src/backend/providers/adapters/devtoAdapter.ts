/**
 * DEV.to Content Provider Adapter
 * Community developer publications, programming essays, and technical architecture
 * Content Identity: 'community'
 */

import { BaseProviderAdapter } from '../baseAdapter.ts';
import { NormalizedProviderItem, ProviderFetchOptions } from '../types.ts';
import { ContentProviderId, ContentIdentity } from '../../types.ts';

export class DevtoAdapter extends BaseProviderAdapter {
  readonly id: ContentProviderId = 'devto';
  readonly name = 'DEV Community API';
  readonly description = 'Community developer publications, software architecture guides, and engineering reflections';
  readonly contentIdentity: ContentIdentity = 'community';
  readonly requiresApiKey = false;
  readonly envKeyName = 'DEVTO_API_KEY';

  async fetchContent(options: ProviderFetchOptions = {}): Promise<NormalizedProviderItem[]> {
    const limit = Math.min(options.limit || 10, 30);
    const page = options.page || 1;
    const tag = options.tag || options.category || '';
    const apiKey = process.env.DEVTO_API_KEY;

    let url = `https://dev.to/api/articles?per_page=${limit}&page=${page}`;
    if (tag) {
      url += `&tag=${encodeURIComponent(tag.replace(/[^a-zA-Z0-9]/g, ''))}`;
    } else {
      url += `&top=7`; // Top weekly curated stories
    }

    const headers: Record<string, string> = {};
    if (apiKey) {
      headers['api-key'] = apiKey;
    }

    const res = await this.safeFetch(url, { headers });
    if (!res.ok) {
      throw new Error(`DEV.to API returned HTTP ${res.status}`);
    }

    const articles = await res.json();
    if (!Array.isArray(articles)) {
      return [];
    }

    return articles.map((raw: any) => {
      const title = this.sanitizeText(raw.title || 'Technical Reflection');
      const author = raw.user?.name || raw.user?.username || 'Community Engineer';
      const authorAvatar = raw.user?.profile_image || undefined;
      const originalUrl = raw.url;
      const summary = this.sanitizeText(raw.description || 'Community developer insight.');
      const coverImageUrl = raw.cover_image || raw.social_image || undefined;
      const publishedAt = raw.published_at || new Date().toISOString();
      const readingTime = raw.reading_time_minutes || 4;
      const tags = Array.isArray(raw.tag_list) ? raw.tag_list : ['programming', 'technology'];
      const externalId = `devto_${raw.id}`;

      const attributionHtml = this.buildAttributionBox(
        'DEV Community',
        originalUrl,
        'Published by community creator on DEV.to under open developer terms.'
      );

      const content = `
<div class="readaday-community-post">
  <p class="summary-lead text-base text-slate-200 mb-4 leading-relaxed font-sans">${summary}</p>
  <div class="prose max-w-none text-slate-300 mb-6">
    <p>Written by <strong>${author}</strong> in the DEV developer community.</p>
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
        contentType: 'community',
        authorName: author,
        authorAvatar,
        categoryName: 'Technology & Systems',
        categorySlug: 'technology-ai',
        tags: ['community', 'devto', ...tags],
        coverImageUrl,
        sourcePublisher: 'DEV Community',
        originalUrl,
        contentRights: 'fair_use_summary',
        fullContentPermitted: false,
        readingTimeMinutes: readingTime,
        publishedAt,
        metadata: {
          positiveReactionsCount: raw.positive_reactions_count,
          commentsCount: raw.comments_count,
        },
      };
    });
  }
}
