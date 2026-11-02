import test from 'node:test';
import assert from 'node:assert/strict';
import { filterFeedArticles, assertFeedPurity } from '../logic/feedSeparation.ts';
import { Article } from '../types.ts';

const mockArticles: Article[] = [
  {
    id: 'art-1',
    contentType: 'editorial',
    status: 'published',
    title: 'The Architecture of Deep Focus',
    slug: 'architecture-deep-focus',
    summary: 'How intentional reading environments transform comprehension.',
    content: 'Full editorial piece on cognitive retention.',
    authorId: 'auth-ed',
    authorName: 'Sarah Jenkins',
    categoryId: 'cat-mind',
    categoryName: 'Psychology & Focus',
    categorySlug: 'psychology-focus',
    tags: ['cognition', 'deep-work', 'reading'],
    readingTimeMinutes: 7,
    fullContentPermitted: true,
    viewCount: 140,
    likeCount: 42,
    bookmarkCount: 18,
    commentCount: 5,
    createdAt: '2026-10-20T10:00:00Z',
    updatedAt: '2026-10-20T10:00:00Z',
    publishedAt: '2026-10-20T10:00:00Z',
  },
  {
    id: 'art-2',
    contentType: 'news',
    status: 'published',
    title: 'Open Source Neural Models Achieve Record Inference Speeds',
    slug: 'open-source-neural-models-speed',
    summary: 'Researchers demonstrate 4x token throughput on commodity hardware.',
    content: 'News summary with canonical link.',
    authorId: 'auth-sys',
    authorName: 'Reuters Tech Feed',
    categoryId: 'cat-tech',
    categoryName: 'Technology & AI',
    categorySlug: 'technology-ai',
    tags: ['ai', 'open-source', 'hardware'],
    readingTimeMinutes: 3,
    sourcePublisher: 'Reuters',
    originalUrl: 'https://reuters.com/tech/models',
    contentRights: 'fair_use_summary',
    fullContentPermitted: false,
    viewCount: 310,
    likeCount: 88,
    bookmarkCount: 30,
    commentCount: 12,
    createdAt: '2026-10-21T08:00:00Z',
    updatedAt: '2026-10-21T08:00:00Z',
    publishedAt: '2026-10-21T08:00:00Z',
  },
  {
    id: 'art-3',
    contentType: 'community',
    status: 'published',
    title: 'My Journey Annotating 50 Classic Novels in 1 Year',
    slug: 'annotating-50-classic-novels',
    summary: 'A personal retrospective on marginalia and synthesis.',
    content: 'Community member reflection.',
    authorId: 'user-writer-1',
    authorName: 'Elena Rostova',
    categoryId: 'cat-lit',
    categoryName: 'Literature',
    categorySlug: 'literature',
    tags: ['books', 'classics', 'marginalia'],
    readingTimeMinutes: 9,
    fullContentPermitted: true,
    viewCount: 85,
    likeCount: 29,
    bookmarkCount: 14,
    commentCount: 8,
    createdAt: '2026-10-22T14:00:00Z',
    updatedAt: '2026-10-22T14:00:00Z',
    publishedAt: '2026-10-22T14:00:00Z',
  },
  {
    id: 'art-4',
    contentType: 'editorial',
    status: 'draft',
    title: 'Unpublished Editorial Draft',
    slug: 'unpublished-draft',
    summary: 'Work in progress by editor.',
    content: 'Draft content.',
    authorId: 'auth-ed',
    authorName: 'Sarah Jenkins',
    categoryId: 'cat-mind',
    categoryName: 'Psychology & Focus',
    categorySlug: 'psychology-focus',
    tags: ['draft'],
    readingTimeMinutes: 2,
    fullContentPermitted: true,
    viewCount: 0,
    likeCount: 0,
    bookmarkCount: 0,
    commentCount: 0,
    createdAt: '2026-10-23T10:00:00Z',
    updatedAt: '2026-10-23T10:00:00Z',
  },
];

test('Strict feed separation: editorial feed contains only editorial articles', () => {
  const result = filterFeedArticles(mockArticles, { feed: 'editorial', status: 'published' });
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].id, 'art-1');
  assert.equal(result.validationCheck.isContaminated, false);
  assert.equal(result.validationCheck.unauthorizedTypesFound.length, 0);
  assert.doesNotThrow(() => assertFeedPurity(result.items, 'editorial'));
});

test('Strict feed separation: news feed contains only news articles', () => {
  const result = filterFeedArticles(mockArticles, { feed: 'news', status: 'published' });
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].id, 'art-2');
  assert.equal(result.validationCheck.isContaminated, false);
  assert.doesNotThrow(() => assertFeedPurity(result.items, 'news'));
});

test('Strict feed separation: community feed contains only community articles', () => {
  const result = filterFeedArticles(mockArticles, { feed: 'community', status: 'published' });
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].id, 'art-3');
  assert.equal(result.validationCheck.isContaminated, false);
  assert.doesNotThrow(() => assertFeedPurity(result.items, 'community'));
});

test('Feed purity assertion catches contamination immediately', () => {
  assert.throws(
    () => assertFeedPurity(mockArticles, 'editorial'),
    /CRITICAL FEED CONTAMINATION/
  );
});

test('Draft articles are excluded from public feeds by default', () => {
  const result = filterFeedArticles(mockArticles, { feed: 'editorial', status: 'published' });
  const hasDraft = result.items.some((i) => i.status === 'draft');
  assert.equal(hasDraft, false);
});
