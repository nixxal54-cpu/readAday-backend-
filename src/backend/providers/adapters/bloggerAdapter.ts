/**
 * Blogger API Content Provider Adapter
 * Independent blogs, curated essays, and publication articles
 * Content Identity: 'editorial'
 */

import { BaseProviderAdapter } from '../baseAdapter.ts';
import { NormalizedProviderItem, ProviderFetchOptions } from '../types.ts';
import { ContentProviderId, ContentIdentity } from '../../types.ts';

export class BloggerAdapter extends BaseProviderAdapter {
  readonly id: ContentProviderId = 'blogger';
  readonly name = 'Blogger API';
  readonly description = 'Long-form independent essays, research dispatches, and publisher blogs';
  readonly contentIdentity: ContentIdentity = 'editorial';
  readonly requiresApiKey = false;
  readonly envKeyName = 'BLOGGER_API_KEY';

  async fetchContent(options: ProviderFetchOptions = {}): Promise<NormalizedProviderItem[]> {
    const apiKey = process.env.BLOGGER_API_KEY;
    const blogId = process.env.BLOGGER_BLOG_ID;
    const limit = Math.min(options.limit || 8, 20);

    if (apiKey && blogId) {
      try {
        return await this.fetchFromBloggerV3(apiKey, blogId, limit);
      } catch (err) {
        // Fall back to public blogger feed if v3 key fails
        return await this.fetchFromPublicBloggerFeed(limit);
      }
    }

    // Default to Google Research / Engineering public Blogger JSON feed
    return await this.fetchFromPublicBloggerFeed(limit);
  }

  private async fetchFromBloggerV3(apiKey: string, blogId: string, limit: number): Promise<NormalizedProviderItem[]> {
    const url = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts?key=${apiKey}&maxResults=${limit}`;
    const res = await this.safeFetch(url);
    if (!res.ok) {
      throw new Error(`Blogger API v3 error HTTP ${res.status}`);
    }

    const data = await res.json();
    const items = data?.items || [];

    return items.map((item: any) => {
      const title = this.sanitizeText(item.title || 'Untitled Dispatch');
      const author = item.author?.displayName || 'Editorial Contributor';
      const authorAvatar = item.author?.image?.url ? `https:${item.author.image.url}` : undefined;
      const originalUrl = item.url;
      const rawContent = item.content || '';
      const summary = this.sanitizeText(rawContent).slice(0, 240) + '...';
      const publishedAt = item.published || new Date().toISOString();
      const externalId = `blogger_${item.id}`;

      const attributionHtml = this.buildAttributionBox(
        'Blogger Publication',
        originalUrl,
        'Original essay syndicated via Blogger API.'
      );

      const content = `
<div class="readaday-editorial-essay">
  <div class="prose max-w-none text-slate-200 leading-relaxed font-serif">
    ${rawContent.slice(0, 2500)}
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
        contentType: 'editorial',
        authorName: author,
        authorAvatar,
        categoryName: 'Literature & Essays',
        categorySlug: 'literature-essays',
        tags: ['editorial', 'essay', 'blog', 'longform'],
        sourcePublisher: 'Blogger Network',
        originalUrl,
        contentRights: 'syndicated',
        fullContentPermitted: true,
        readingTimeMinutes: this.estimateReadingTime(rawContent),
        publishedAt,
      };
    });
  }

  private async fetchFromPublicBloggerFeed(limit: number): Promise<NormalizedProviderItem[]> {
    const url = `https://googleblog.blogspot.com/feeds/posts/default?alt=json&max-results=${limit}`;
    const res = await this.safeFetch(url);
    if (!res.ok) {
      throw new Error(`Public Blogger feed error HTTP ${res.status}`);
    }

    const data = await res.json();
    const entries = data?.feed?.entry || [];

    return entries.map((entry: any) => {
      const title = this.sanitizeText(entry.title?.$t || 'Editorial Essay');
      const author = entry.author?.[0]?.name?.$t || 'Editorial Essayist';
      const linkObj = entry.link?.find((l: any) => l.rel === 'alternate') || entry.link?.[0];
      const originalUrl = linkObj?.href || 'https://googleblog.blogspot.com';
      const rawContent = entry.content?.$t || entry.summary?.$t || '';
      const cleanSummary = this.sanitizeText(rawContent).slice(0, 240) + '...';
      const publishedAt = entry.published?.$t || new Date().toISOString();
      const externalId = `blogger_feed_${Buffer.from(originalUrl).toString('base64').slice(-12)}`;

      const attributionHtml = this.buildAttributionBox(
        'The Official Blog',
        originalUrl,
        'Curated editorial piece syndicated under publication terms.'
      );

      const content = `
<div class="readaday-editorial-essay">
  <div class="prose max-w-none text-slate-200 leading-relaxed font-serif">
    <p class="summary-lead text-lg mb-4">${cleanSummary}</p>
    <div class="essay-body text-slate-300">
      ${rawContent.slice(0, 1800)}
    </div>
  </div>
  ${attributionHtml}
</div>
      `.trim();

      return {
        externalId,
        title,
        slug: this.generateSlug(title, externalId),
        summary: cleanSummary,
        content,
        contentType: 'editorial',
        authorName: author,
        categoryName: 'Literature & Essays',
        categorySlug: 'literature-essays',
        tags: ['editorial', 'essays', 'technology', 'deep-dive'],
        sourcePublisher: 'The Official Blog',
        originalUrl,
        contentRights: 'syndicated',
        fullContentPermitted: true,
        readingTimeMinutes: this.estimateReadingTime(rawContent),
        publishedAt,
      };
    });
  }
}
