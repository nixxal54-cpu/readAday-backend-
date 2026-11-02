import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateArticleAffinity, exploreRabbitHole, generateRecommendations } from '../logic/rabbitHole.ts';
import { Article, TopicRelationship } from '../types.ts';

const mockRelationships: TopicRelationship[] = [
  {
    id: 'rel-1',
    sourceTopicSlug: 'deep-work',
    targetTopicSlug: 'neuroscience',
    sourceTopicName: 'Deep Work',
    targetTopicName: 'Neuroscience',
    affinityScore: 0.85,
    relationshipType: 'prerequisite',
    rationale: 'Understanding neural plasticity explains focus thresholds',
  },
  {
    id: 'rel-2',
    sourceTopicSlug: 'neuroscience',
    targetTopicSlug: 'ai',
    sourceTopicName: 'Neuroscience',
    targetTopicName: 'Artificial Intelligence',
    affinityScore: 0.9,
    relationshipType: 'deep_dive',
    rationale: 'Biomimetic architectures in transformer attention',
  },
];

const mockArticles: Article[] = [
  {
    id: 'art-focus',
    contentType: 'editorial',
    status: 'published',
    title: 'The Neuroscience of Flow States',
    slug: 'neuroscience-flow-states',
    summary: 'Dopamine, acetylcholine, and attentional focus.',
    content: 'Long form analysis.',
    authorId: 'auth-1',
    authorName: 'Dr. Aris Thorne',
    categoryId: 'cat-mind',
    categoryName: 'Psychology',
    categorySlug: 'psychology',
    tags: ['deep-work', 'cognition'],
    readingTimeMinutes: 8,
    fullContentPermitted: true,
    viewCount: 100,
    likeCount: 50,
    bookmarkCount: 20,
    commentCount: 5,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  },
  {
    id: 'art-brain',
    contentType: 'editorial',
    status: 'published',
    title: 'Synaptic Plasticity and Learning',
    slug: 'synaptic-plasticity',
    summary: 'How neural circuits rewire during intensive study.',
    content: 'Exploring neurobiology.',
    authorId: 'auth-2',
    authorName: 'Dr. Clara Vance',
    categoryId: 'cat-mind',
    categoryName: 'Psychology',
    categorySlug: 'psychology',
    tags: ['neuroscience', 'cognition'],
    readingTimeMinutes: 10,
    fullContentPermitted: true,
    viewCount: 150,
    likeCount: 60,
    bookmarkCount: 25,
    commentCount: 8,
    createdAt: '2026-10-02T00:00:00Z',
    updatedAt: '2026-10-02T00:00:00Z',
  },
  {
    id: 'art-ai',
    contentType: 'news',
    status: 'published',
    title: 'Bio-inspired Neural Transformers',
    slug: 'bio-inspired-transformers',
    summary: 'New artificial networks emulate cortical layers.',
    content: 'Tech report.',
    authorId: 'auth-3',
    authorName: 'Tech Reporter',
    categoryId: 'cat-tech',
    categoryName: 'Technology',
    categorySlug: 'technology',
    tags: ['ai', 'neuroscience'],
    readingTimeMinutes: 4,
    fullContentPermitted: false,
    viewCount: 300,
    likeCount: 80,
    bookmarkCount: 40,
    commentCount: 15,
    createdAt: '2026-10-03T00:00:00Z',
    updatedAt: '2026-10-03T00:00:00Z',
  },
];

test('calculateArticleAffinity scores shared tags and category appropriately', () => {
  const result = calculateArticleAffinity(mockArticles[0], mockArticles[1], mockRelationships);
  assert.ok(result.score > 0.4);
  assert.ok(result.reason.includes('cognition') || result.reason.includes('Psychology') || result.reason.includes('Topic bridge'));
});

test('exploreRabbitHole traverses multi-step depth trail', () => {
  const result = exploreRabbitHole(mockArticles[0], mockArticles, mockRelationships, 2);
  assert.ok(result.trail.length >= 1);
  assert.equal(result.trail[0].depth, 1);
  // Visited node cannot be the origin
  assert.notEqual(result.trail[0].articleId, mockArticles[0].id);
});

test('generateRecommendations suggests unread related articles', () => {
  const recs = generateRecommendations(['art-focus'], [], mockArticles, mockRelationships, 2);
  assert.ok(recs.length > 0);
  // Never recommends article already read
  assert.equal(recs.some((r) => r.article.id === 'art-focus'), false);
});
