/**
 * Strict Content Feed Separation Logic
 * readAday Core Architecture Requirement #2:
 * "Three strictly separated content types: editorial, news, community.
 *  Never mix the three content types in their respective feeds."
 */

import { Article, ContentType, ArticleStatus } from '../types.ts';

export interface FeedQueryParams {
  feed: ContentType;
  category?: string;
  tag?: string;
  search?: string;
  page?: number;
  limit?: number;
  status?: ArticleStatus;
  userRole?: string;
}

export interface FeedResponse {
  feed: ContentType;
  items: Article[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  validationCheck: {
    isContaminated: boolean;
    unauthorizedTypesFound: string[];
  };
}

/**
 * Filter an array of articles strictly for the requested content feed.
 * Guarantee: Any article whose contentType !== requestedFeed is rejected.
 */
export function filterFeedArticles(articles: Article[], params: FeedQueryParams): FeedResponse {
  const {
    feed,
    category,
    tag,
    search,
    page = 1,
    limit = 10,
    status = 'published',
  } = params;

  // 1. Strict primary separation filter
  const strictlySeparated = articles.filter((article) => {
    // Under no circumstance may an article of another type appear
    if (article.contentType !== feed) {
      return false;
    }

    // Filter by status (default is published for public feeds)
    if (status && article.status !== status) {
      return false;
    }

    // Category filter
    if (category && category !== 'all' && article.categorySlug !== category && article.categoryId !== category) {
      return false;
    }

    // Tag filter
    if (tag && !article.tags.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      return false;
    }

    // Search query
    if (search && search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = article.title.toLowerCase().includes(q);
      const matchSummary = article.summary.toLowerCase().includes(q);
      const matchAuthor = article.authorName.toLowerCase().includes(q);
      const matchTags = article.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchSummary && !matchAuthor && !matchTags) {
        return false;
      }
    }

    return true;
  });

  // Sort by publishedAt or createdAt descending
  strictlySeparated.sort((a, b) => {
    const timeA = new Date(a.publishedAt || a.createdAt).getTime();
    const timeB = new Date(b.publishedAt || b.createdAt).getTime();
    return timeB - timeA;
  });

  // 2. Pagination
  const total = strictlySeparated.length;
  const startIndex = (page - 1) * limit;
  const items = strictlySeparated.slice(startIndex, startIndex + limit);
  const totalPages = Math.ceil(total / limit) || 1;

  // 3. Mathematical feed purity verification (Zero Contamination Check)
  const unauthorized = items
    .filter((item) => item.contentType !== feed)
    .map((item) => item.contentType);

  return {
    feed,
    items,
    total,
    page,
    limit,
    totalPages,
    validationCheck: {
      isContaminated: unauthorized.length > 0,
      unauthorizedTypesFound: Array.from(new Set(unauthorized)),
    },
  };
}

/**
 * Asserts that a list of articles contains only items belonging to target feed.
 * Throws an error if cross-contamination is detected.
 */
export function assertFeedPurity(articles: Article[], expectedFeed: ContentType): boolean {
  for (const article of articles) {
    if (article.contentType !== expectedFeed) {
      throw new Error(
        `CRITICAL FEED CONTAMINATION: Expected exclusively '${expectedFeed}', but found '${article.contentType}' (ID: ${article.id}, Title: "${article.title}")`
      );
    }
  }
  return true;
}
