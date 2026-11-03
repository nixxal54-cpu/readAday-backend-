/**
 * Central Content Provider Registry & Orchestrator
 * Coordinates independent adapters, deduplication, copyright compliance,
 * non-destructive synchronization, health checks, and audit logging.
 */

import { ContentProviderAdapter, NormalizedProviderItem, ProviderFetchOptions } from './types.ts';
import {
  Article,
  ContentProviderId,
  ProviderHealth,
  ProviderSyncLog,
} from '../types.ts';
import { generateDedupHash } from '../logic/copyrightRights.ts';
import { store } from '../store.ts';
import { getOrCreateCategory } from '../apiRouter.ts';

// 10 Independent Provider Adapters
import { GdeltAdapter } from './adapters/gdeltAdapter.ts';
import { GuardianAdapter } from './adapters/guardianAdapter.ts';
import { BloggerAdapter } from './adapters/bloggerAdapter.ts';
import { RssAdapter } from './adapters/rssAdapter.ts';
import { DevtoAdapter } from './adapters/devtoAdapter.ts';
import { HashnodeAdapter } from './adapters/hashnodeAdapter.ts';
import { ArxivAdapter } from './adapters/arxivAdapter.ts';
import { OpenalexAdapter } from './adapters/openalexAdapter.ts';
import { GutendexAdapter } from './adapters/gutendexAdapter.ts';
import { WikipediaAdapter } from './adapters/wikipediaAdapter.ts';

export class ContentProviderRegistry {
  private adapters: Map<ContentProviderId, ContentProviderAdapter> = new Map();
  private healthCache: Map<ContentProviderId, ProviderHealth> = new Map();

  constructor() {
    this.registerAdapter(new GdeltAdapter());
    this.registerAdapter(new GuardianAdapter());
    this.registerAdapter(new BloggerAdapter());
    this.registerAdapter(new RssAdapter());
    this.registerAdapter(new DevtoAdapter());
    this.registerAdapter(new HashnodeAdapter());
    this.registerAdapter(new ArxivAdapter());
    this.registerAdapter(new OpenalexAdapter());
    this.registerAdapter(new GutendexAdapter());
    this.registerAdapter(new WikipediaAdapter());
  }

  public registerAdapter(adapter: ContentProviderAdapter) {
    this.adapters.set(adapter.id, adapter);
  }

  public getAdapter(id: ContentProviderId): ContentProviderAdapter | undefined {
    return this.adapters.get(id);
  }

  public getAllAdapters(): ContentProviderAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Synchronize a specific provider into the readAday store.
   * Guarantees:
   * - Strict deduplication via calculateDedupHash
   * - Never overwrites original platform/user articles
   * - Preserves content identity separation
   * - Logs full sync run metrics
   */
  public async syncProvider(
    id: ContentProviderId,
    options: ProviderFetchOptions = {}
  ): Promise<ProviderSyncLog> {
    const adapter = this.adapters.get(id);
    if (!adapter) {
      throw new Error(`Content provider '${id}' is not registered`);
    }

    const startTime = Date.now();
    const logId = `sync_${id}_${Date.now()}`;
    let fetchedCount = 0;
    let ingestedCount = 0;
    let duplicateCount = 0;
    let status: 'success' | 'partial' | 'failed' | 'rate_limited' = 'success';
    let errorMessage: string | undefined;

    try {
      const items: NormalizedProviderItem[] = await adapter.fetchContent(options);
      fetchedCount = items.length;

      // Existing dedup hashes in current store
      const existingHashes = new Set<string>();
      for (const a of store.articles.values()) {
        if (a.dedupHash) {
          existingHashes.add(a.dedupHash);
        }
      }

      for (const item of items) {
        // Calculate stable cryptographic deduplication hash
        const dedupHash = generateDedupHash(item.title, item.originalUrl);

        if (existingHashes.has(dedupHash)) {
          duplicateCount++;
          continue;
        }

        // Check if an article already exists with this ID or slug
        const existingArticle = store.articles.get(item.externalId);
        if (existingArticle) {
          // Never overwrite original articles
          if (!existingArticle.dedupHash || existingArticle.authorId.startsWith('usr-')) {
            continue;
          }
        }

        // Resolve or create category
        const cat = getOrCreateCategory(item.categorySlug || item.categoryName);

        // Normalize into readAday Article entity
        const newArticle: Article = {
          id: item.externalId,
          contentType: item.contentType,
          status: 'published',
          title: item.title,
          slug: item.slug,
          summary: item.summary,
          content: item.content,
          coverImageUrl: item.coverImageUrl,
          authorId: `provider-${adapter.id}`,
          authorName: item.authorName,
          authorAvatar: item.authorAvatar,
          categoryId: cat.id,
          categoryName: cat.name,
          categorySlug: cat.slug,
          tags: item.tags,
          readingTimeMinutes: item.readingTimeMinutes,
          publishedAt: item.publishedAt,
          sourcePublisher: item.sourcePublisher,
          originalUrl: item.originalUrl,
          contentRights: item.contentRights,
          dedupHash,
          fullContentPermitted: item.fullContentPermitted,
          lastSyncedAt: new Date().toISOString(),
          viewCount: 0,
          likeCount: 0,
          bookmarkCount: 0,
          commentCount: 0,
          createdAt: item.publishedAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        store.articles.set(newArticle.id, newArticle);
        existingHashes.add(dedupHash);
        ingestedCount++;
      }
    } catch (err: any) {
      errorMessage = err?.message || 'Unknown synchronization error';
      if (err?.message?.includes('429') || err?.message?.includes('rate limit')) {
        status = 'rate_limited';
      } else {
        status = fetchedCount > 0 ? 'partial' : 'failed';
      }
    }

    const durationMs = Date.now() - startTime;
    const log: ProviderSyncLog = {
      id: logId,
      providerId: id,
      status,
      fetchedCount,
      ingestedCount,
      duplicateCount,
      errorMessage,
      durationMs,
      timestamp: new Date().toISOString(),
    };

    // Store sync log
    store.providerSyncLogs.set(log.id, log);

    // Update health status cache
    this.healthCache.set(id, {
      providerId: id,
      name: adapter.name,
      contentIdentity: adapter.contentIdentity,
      status: status === 'failed' ? 'down' : status === 'rate_limited' ? 'degraded' : 'healthy',
      responseTimeMs: durationMs,
      requiresApiKey: adapter.requiresApiKey,
      isApiKeyConfigured: !adapter.requiresApiKey || Boolean(adapter.envKeyName && process.env[adapter.envKeyName]),
      lastCheckedAt: new Date().toISOString(),
      lastSyncAt: new Date().toISOString(),
      errorMessage,
    });

    return log;
  }

  /**
   * Synchronize all 10 providers in parallel with isolated boundaries
   */
  public async syncAllProviders(options: ProviderFetchOptions = {}): Promise<ProviderSyncLog[]> {
    const adapters = this.getAllAdapters();
    const promises = adapters.map(async (adapter) => {
      try {
        return await this.syncProvider(adapter.id, options);
      } catch (err: any) {
        return {
          id: `sync_err_${adapter.id}_${Date.now()}`,
          providerId: adapter.id,
          status: 'failed' as const,
          fetchedCount: 0,
          ingestedCount: 0,
          duplicateCount: 0,
          errorMessage: err?.message,
          durationMs: 0,
          timestamp: new Date().toISOString(),
        };
      }
    });

    const settled = await Promise.allSettled(promises);
    return settled.map((r, i) =>
      r.status === 'fulfilled'
        ? r.value
        : {
            id: `sync_err_${adapters[i].id}_${Date.now()}`,
            providerId: adapters[i].id,
            status: 'failed' as const,
            fetchedCount: 0,
            ingestedCount: 0,
            duplicateCount: 0,
            errorMessage: 'Sync execution failed',
            durationMs: 0,
            timestamp: new Date().toISOString(),
          }
    );
  }

  /**
   * Health checks across all 10 adapters
   */
  public async checkAllHealth(): Promise<ProviderHealth[]> {
    const results: ProviderHealth[] = [];
    const adapters = this.getAllAdapters();

    await Promise.all(
      adapters.map(async (adapter) => {
        try {
          const health = await adapter.healthCheck();
          this.healthCache.set(adapter.id, health);
          results.push(health);
        } catch (err: any) {
          const fallback: ProviderHealth = {
            providerId: adapter.id,
            name: adapter.name,
            contentIdentity: adapter.contentIdentity,
            status: 'down',
            responseTimeMs: 0,
            requiresApiKey: adapter.requiresApiKey,
            isApiKeyConfigured: !adapter.requiresApiKey || Boolean(adapter.envKeyName && process.env[adapter.envKeyName]),
            lastCheckedAt: new Date().toISOString(),
            errorMessage: err?.message || 'Check failed',
          };
          this.healthCache.set(adapter.id, fallback);
          results.push(fallback);
        }
      })
    );

    return results;
  }

  /**
   * Get cached or freshly evaluated health statuses for all registered adapters
   */
  public getHealthStatuses(): ProviderHealth[] {
    return this.getAllAdapters().map((adapter) => {
      const cached = this.healthCache.get(adapter.id);
      if (cached) return cached;
      return {
        providerId: adapter.id,
        name: adapter.name,
        contentIdentity: adapter.contentIdentity,
        status: 'healthy',
        responseTimeMs: 0,
        requiresApiKey: adapter.requiresApiKey,
        isApiKeyConfigured: !adapter.requiresApiKey || Boolean(adapter.envKeyName && process.env[adapter.envKeyName]),
        lastCheckedAt: new Date().toISOString(),
      };
    });
  }

  /**
   * Retrieve sync audit logs sorted newest first
   */
  public getSyncLogs(limit: number = 50): ProviderSyncLog[] {
    return Array.from(store.providerSyncLogs.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }
}

export const providerRegistry = new ContentProviderRegistry();
