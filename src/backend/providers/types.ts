/**
 * Content Provider Integration Architecture Types
 */

import type { ContentType, ContentRights, ContentProviderId, ContentIdentity, ProviderHealth } from '../types.ts';

export interface ProviderFetchOptions {
  query?: string;
  category?: string;
  tag?: string;
  page?: number;
  limit?: number;
  since?: string;
}

export interface NormalizedProviderItem {
  externalId: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  contentType: ContentType;
  authorName: string;
  authorAvatar?: string;
  categoryName: string;
  categorySlug: string;
  tags: string[];
  coverImageUrl?: string;
  sourcePublisher: string;
  originalUrl: string;
  contentRights: ContentRights;
  fullContentPermitted: boolean;
  readingTimeMinutes: number;
  publishedAt: string;
  metadata?: Record<string, any>;
}

export interface ContentProviderAdapter {
  readonly id: ContentProviderId;
  readonly name: string;
  readonly description: string;
  readonly contentIdentity: ContentIdentity;
  readonly requiresApiKey: boolean;
  readonly envKeyName?: string;

  /**
   * Fetch and normalize real content from the remote provider
   */
  fetchContent(options?: ProviderFetchOptions): Promise<NormalizedProviderItem[]>;

  /**
   * Health check verifying API responsiveness and latency
   */
  healthCheck(): Promise<ProviderHealth>;
}
