/**
 * Copyright & Redistribution Rights Management
 * readAday Core Architecture Requirement #4:
 * "Store complete article content only when redistribution rights permit.
 *  Track publisher, original source, publication time and update history.
 *  Never silently copy copyrighted full-text content.
 *  Support licensed content providers and original reporting."
 */

import { ContentRights } from '../types.ts';

export interface RawStoryInput {
  title: string;
  originalUrl: string;
  publisher: string;
  summary: string;
  rawFullContent?: string;
  licenseType?: ContentRights;
  publishedAt?: string;
}

export interface IngestionDecision {
  permittedFullText: boolean;
  contentToStore: string;
  summaryToStore: string;
  contentRights: ContentRights;
  dedupHash: string;
  complianceNotice: string;
}

/**
 * Generate a consistent, normalized deduplication hash from title and canonical URL.
 */
export function generateDedupHash(title: string, originalUrl: string): string {
  // Normalize canonical URL (strip tracking parameters, trailing slashes)
  let cleanUrl = originalUrl.trim().toLowerCase();
  try {
    const urlObj = new URL(cleanUrl);
    // Remove UTM and query trackers
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'source'].forEach((param) => {
      urlObj.searchParams.delete(param);
    });
    cleanUrl = urlObj.origin + urlObj.pathname.replace(/\/+$/, '');
  } catch {
    // fallback string normalization
    cleanUrl = cleanUrl.split('?')[0].replace(/\/+$/, '');
  }

  // Normalize title (lowercase, remove excess whitespace and non-alphanumeric)
  const cleanTitle = title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Simple, fast deterministic 32-bit FNV-1a hash formatted as hex
  let hash = 2166136261;
  const combined = `${cleanUrl}::${cleanTitle}`;
  for (let i = 0; i < combined.length; i++) {
    hash ^= combined.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `hash_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

/**
 * Evaluate redistribution rights and ensure full-text content is never stored
 * without explicit redistribution licensing.
 */
export function evaluateContentRights(story: RawStoryInput): IngestionDecision {
  const dedupHash = generateDedupHash(story.title, story.originalUrl);
  const license: ContentRights = story.licenseType || 'fair_use_summary';

  switch (license) {
    case 'licensed_full': {
      // Licensed syndicate or direct partner agreement
      return {
        permittedFullText: true,
        contentToStore: story.rawFullContent || story.summary,
        summaryToStore: story.summary || (story.rawFullContent ? story.rawFullContent.slice(0, 240) + '...' : ''),
        contentRights: 'licensed_full',
        dedupHash,
        complianceNotice: `Stored with full text permission under licensed partner distribution from ${story.publisher}.`,
      };
    }

    case 'original_reporting': {
      // Direct in-house or authorized readAday correspondent reporting
      return {
        permittedFullText: true,
        contentToStore: story.rawFullContent || story.summary,
        summaryToStore: story.summary,
        contentRights: 'original_reporting',
        dedupHash,
        complianceNotice: `Original reporting authorized by readAday newsroom editorial staff.`,
      };
    }

    case 'fair_use_summary':
    case 'snippet_only':
    case 'syndicated':
    default: {
      // Copyrighted 3rd-party RSS: NEVER store raw full text.
      // Store fair-use editorial summary only with canonical backlink to original source.
      const sanitizedSummary = story.summary.trim().slice(0, 500);
      const safeContent = `
<div class="readaday-news-summary">
  <p class="summary-lead">${sanitizedSummary}</p>
  <div class="publisher-attribution-box p-4 border rounded bg-slate-900/60 mt-4">
    <p class="text-sm text-slate-400">
      <strong>Source Attribution:</strong> Originally published by <em>${story.publisher}</em>.
      In compliance with copyright and fair use principles, readAday does not reproduce full-text articles without explicit syndication agreement.
    </p>
    <a href="${story.originalUrl}" target="_blank" rel="noopener noreferrer" class="mt-2 inline-block text-amber-400 hover:underline text-sm font-medium">
      Read complete original coverage on ${story.publisher} &rarr;
    </a>
  </div>
</div>`.trim();

      return {
        permittedFullText: false,
        contentToStore: safeContent,
        summaryToStore: sanitizedSummary,
        contentRights: 'fair_use_summary',
        dedupHash,
        complianceNotice: `Fair use summary enforced. Full text omitted to protect copyright of ${story.publisher}. Canonical link preserved.`,
      };
    }
  }
}
