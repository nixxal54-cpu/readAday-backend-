/**
 * Abstract Base Content Provider Adapter
 * Implements resilient fetching, rate limit detection, exponential backoff retries,
 * and standard attribution formatting.
 */

import type { ContentProviderAdapter, NormalizedProviderItem, ProviderFetchOptions } from './types.ts';
import type { ContentProviderId, ContentIdentity, ProviderHealth } from '../types.ts';

export abstract class BaseProviderAdapter implements ContentProviderAdapter {
  abstract readonly id: ContentProviderId;
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly contentIdentity: ContentIdentity;
  abstract readonly requiresApiKey: boolean;
  readonly envKeyName?: string;

  abstract fetchContent(options?: ProviderFetchOptions): Promise<NormalizedProviderItem[]>;

  /**
   * Safe fetch with timeout, headers, and rate-limit detection
   */
  protected async safeFetch(
    url: string,
    options: RequestInit = {},
    timeoutMs: number = 8000,
    retries: number = 2
  ): Promise<Response> {
    let lastError: Error | null = null;
    let delay = 500;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const mergedHeaders = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 (readAday/1.0)',
          Accept: 'application/json, application/xml, text/xml, */*',
          ...options.headers,
        };

        const res = await fetch(url, {
          ...options,
          headers: mergedHeaders,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.status === 429) {
          const retryAfter = res.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : delay * 2;
          if (attempt < retries) {
            await new Promise((resolve) => setTimeout(resolve, Math.min(waitTime, 3000)));
            continue;
          }
          throw new Error(`Rate limit exceeded (HTTP 429) for provider ${this.id}`);
        }

        return res;
      } catch (err: any) {
        lastError = err;
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
        }
      }
    }

    throw lastError || new Error(`Failed to fetch from ${url} after ${retries + 1} attempts`);
  }

  /**
   * Standard health check querying provider with response time recording
   */
  async healthCheck(): Promise<ProviderHealth> {
    const start = Date.now();
    const isConfigured = !this.requiresApiKey || Boolean(this.envKeyName && process.env[this.envKeyName]);

    try {
      // Attempt a lightweight fetch (limit 1)
      const items = await this.fetchContent({ limit: 1 });
      const responseTimeMs = Date.now() - start;

      return {
        providerId: this.id,
        name: this.name,
        contentIdentity: this.contentIdentity,
        status: items.length > 0 ? 'healthy' : 'degraded',
        responseTimeMs,
        requiresApiKey: this.requiresApiKey,
        isApiKeyConfigured: isConfigured,
        lastCheckedAt: new Date().toISOString(),
        errorMessage: items.length === 0 ? 'No items returned during probe' : undefined,
      };
    } catch (err: any) {
      const responseTimeMs = Date.now() - start;
      const isRateLimit = err?.message?.includes('429') || err?.message?.includes('Rate limit');

      return {
        providerId: this.id,
        name: this.name,
        contentIdentity: this.contentIdentity,
        status: isRateLimit ? 'degraded' : 'down',
        responseTimeMs,
        requiresApiKey: this.requiresApiKey,
        isApiKeyConfigured: isConfigured,
        lastCheckedAt: new Date().toISOString(),
        errorMessage: err?.message || 'Health check probe failed',
      };
    }
  }

  /**
   * Utility: Generate URL-safe slug from title and external ID
   */
  protected generateSlug(title: string, externalId?: string): string {
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80);

    const suffix = externalId
      ? '-' +
        externalId
          .toString()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '')
          .slice(-8)
      : '-' + Math.random().toString(36).slice(2, 8);

    return `${baseSlug}${suffix}`;
  }

  /**
   * Utility: Strip HTML tags and normalize whitespace
   */
  protected sanitizeText(text?: string): string {
    if (!text) return '';
    return text
      .replace(/<[^>]*>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Utility: Estimate reading time
   */
  protected estimateReadingTime(text: string): number {
    const words = text.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 220));
  }

  /**
   * Utility: Build compliant Fair Use Source Attribution Box HTML
   */
  protected buildAttributionBox(sourceName: string, originalUrl: string, licenseNotes?: string): string {
    return `
<div class="readaday-attribution-card p-4 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-300 my-4">
  <div class="flex items-center justify-between">
    <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Source Attribution</span>
    <span class="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">Fair Use Excerpt</span>
  </div>
  <p class="mt-2 text-sm text-slate-400">
    Published by <strong>${this.sanitizeText(sourceName)}</strong>. ${
      licenseNotes || 'Full text remains the intellectual property of the original publisher.'
    }
  </p>
  <a href="${originalUrl}" target="_blank" rel="noopener noreferrer" class="mt-3 inline-flex items-center text-amber-400 hover:text-amber-300 text-sm font-medium hover:underline">
    Read original source publication &rarr;
  </a>
</div>
    `.trim();
  }
}
