/**
 * Hashnode Content Provider Adapter
 * Developer publications, engineering blogs, and community essays
 * Content Identity: 'community'
 */

import { BaseProviderAdapter } from '../baseAdapter.ts';
import { NormalizedProviderItem, ProviderFetchOptions } from '../types.ts';
import { ContentProviderId, ContentIdentity } from '../../types.ts';

export class HashnodeAdapter extends BaseProviderAdapter {
  readonly id: ContentProviderId = 'hashnode';
  readonly name = 'Hashnode API';
  readonly description = 'Community-driven software engineering publications and tech journals';
  readonly contentIdentity: ContentIdentity = 'community';
  readonly requiresApiKey = false;
  readonly envKeyName = 'HASHNODE_API_KEY';

  async fetchContent(options: ProviderFetchOptions = {}): Promise<NormalizedProviderItem[]> {
    const limit = Math.min(options.limit || 8, 20);
    const apiKey = process.env.HASHNODE_API_KEY;

    // 1. Try GraphQL query
    try {
      return await this.fetchViaGraphQL(apiKey, limit);
    } catch (err: any) {
      // 2. If GraphQL is rate-limited or blocked by cloud challenge, fall back to engineering feed
      return await this.fetchViaPublicFeed(limit);
    }
  }

  private async fetchViaGraphQL(apiKey?: string, limit: number = 8): Promise<NormalizedProviderItem[]> {
    const query = `
      query GetFeed($first: Int!) {
        feed(first: $first, filter: { type: FEATURED }) {
          edges {
            node {
              id
              title
              brief
              slug
              url
              readTimeInMinutes
              publishedAt
              coverImage {
                url
              }
              author {
                name
                profilePicture
              }
              tags {
                name
              }
            }
          }
        }
      }
    `;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = apiKey;
    }

    const res = await this.safeFetch('https://gql.hashnode.com', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query,
        variables: { first: limit },
      }),
    });

    if (!res.ok) {
      throw new Error(`Hashnode GraphQL error HTTP ${res.status}`);
    }

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      throw new Error('Hashnode returned non-JSON response');
    }

    const edges = data?.data?.feed?.edges || [];
    if (!edges.length) {
      throw new Error('No items returned from Hashnode GraphQL feed');
    }

    return edges.map(({ node }: any) => {
      const title = this.sanitizeText(node.title || 'Hashnode Publication');
      const author = node.author?.name || 'Hashnode Writer';
      const authorAvatar = node.author?.profilePicture || undefined;
      const originalUrl = node.url;
      const summary = this.sanitizeText(node.brief || 'Developer publication from Hashnode community.');
      const coverImageUrl = node.coverImage?.url || undefined;
      const publishedAt = node.publishedAt || new Date().toISOString();
      const tags = Array.isArray(node.tags) ? node.tags.map((t: any) => t.name) : ['engineering'];
      const externalId = `hashnode_${node.id}`;

      const attributionHtml = this.buildAttributionBox(
        'Hashnode Network',
        originalUrl,
        'Published by community engineer on Hashnode.'
      );

      const content = `
<div class="readaday-community-post">
  <p class="summary-lead text-base text-slate-200 mb-4 leading-relaxed font-sans">${summary}</p>
  <div class="author-tagline text-sm text-slate-400 mb-6">
    <span>Author: <strong>${author}</strong></span> &bull;
    <span>Estimated read: <strong>${node.readTimeInMinutes || 5} min</strong></span>
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
        tags: ['community', 'hashnode', ...tags],
        coverImageUrl,
        sourcePublisher: 'Hashnode Network',
        originalUrl,
        contentRights: 'fair_use_summary',
        fullContentPermitted: false,
        readingTimeMinutes: node.readTimeInMinutes || 5,
        publishedAt,
      };
    });
  }

  private async fetchViaPublicFeed(limit: number): Promise<NormalizedProviderItem[]> {
    // Secondary public feed fallback
    const res = await this.safeFetch('https://hashnode.com/atom.xml', {}, 6000, 1);
    if (!res.ok) {
      throw new Error(`Hashnode public atom error HTTP ${res.status}`);
    }

    const xml = await res.text();
    const items: NormalizedProviderItem[] = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
    let match;

    while ((match = entryRegex.exec(xml)) !== null && items.length < limit) {
      const entryXml = match[1];
      const titleMatch = entryXml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const linkMatch = entryXml.match(/<link[^>]+href="([^"]+)"/i);
      const summaryMatch = entryXml.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i) ||
                           entryXml.match(/<content[^>]*>([\s\S]*?)<\/content>/i);
      const authorMatch = entryXml.match(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/i);
      const dateMatch = entryXml.match(/<published>([\s\S]*?)<\/published>/i) ||
                        entryXml.match(/<updated>([\s\S]*?)<\/updated>/i);

      const title = this.sanitizeText(titleMatch ? titleMatch[1] : 'Hashnode Article');
      const originalUrl = linkMatch ? linkMatch[1] : 'https://hashnode.com';
      const summary = this.sanitizeText(summaryMatch ? summaryMatch[1] : '').slice(0, 240) + '...';
      const author = this.sanitizeText(authorMatch ? authorMatch[1] : 'Hashnode Contributor');
      const publishedAt = dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString();
      const externalId = `hashnode_atom_${Buffer.from(originalUrl).toString('base64').slice(-10)}`;

      const attributionHtml = this.buildAttributionBox(
        'Hashnode Network',
        originalUrl,
        'Community developer publication syndicated from Hashnode.'
      );

      items.push({
        externalId,
        title,
        slug: this.generateSlug(title, externalId),
        summary,
        content: `
<div class="readaday-community-post">
  <p class="summary-lead text-base text-slate-200 mb-4">${summary}</p>
  ${attributionHtml}
</div>
        `.trim(),
        contentType: 'community',
        authorName: author,
        categoryName: 'Technology & Systems',
        categorySlug: 'technology-ai',
        tags: ['community', 'hashnode', 'software-design'],
        sourcePublisher: 'Hashnode Network',
        originalUrl,
        contentRights: 'fair_use_summary',
        fullContentPermitted: false,
        readingTimeMinutes: 4,
        publishedAt,
      });
    }

    return items;
  }
}
