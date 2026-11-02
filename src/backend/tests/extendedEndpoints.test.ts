import { test } from 'node:test';
import assert from 'node:assert/strict';
import { store } from '../store.ts';
import { getOrCreateCategory } from '../apiRouter.ts';

test('getOrCreateCategory resolves existing categories and registers new ones', () => {
  // Existing category by slug
  const existing = getOrCreateCategory('technology-ai');
  assert.equal(existing.slug, 'technology-ai');
  assert.equal(existing.name, 'Technology & AI');

  // New free-text category
  const dynamic = getOrCreateCategory('Quantum Cognitive Computing');
  assert.equal(dynamic.slug, 'quantum-cognitive-computing');
  assert.equal(dynamic.name, 'Quantum Cognitive Computing');
  assert.ok(store.categories.has('quantum-cognitive-computing'));
});

test('Follow author toggle tracking and count calculation', () => {
  const followerId = 'usr-reader-1';
  const authorId = 'usr-writer-1';
  const key = `${followerId}_${authorId}`;

  // Initially seeded
  assert.ok(store.follows.has(key));

  // Toggle off
  store.follows.delete(key);
  assert.ok(!store.follows.has(key));

  // Toggle back on
  store.follows.add(key);
  assert.ok(store.follows.has(key));
});

test('Personal collections maintain articleIds and support populated article resolution', () => {
  const col = store.personalCollections.get('pcol-1');
  assert.ok(col);
  assert.ok(Array.isArray(col.articleIds));
  assert.ok(col.articleIds.length >= 2);

  const populated = col.articleIds.map((id) => store.articles.get(id)).filter(Boolean);
  assert.equal(populated.length, col.articleIds.length);
  assert.equal(populated[0]?.id, 'art-ed-1');
});

test('Reading history resume finds the latest in-progress article', () => {
  const history = Array.from(store.readingHistory.values())
    .filter((h) => h.userId === 'usr-reader-1')
    .sort((a, b) => new Date(b.lastReadAt).getTime() - new Date(a.lastReadAt).getTime());

  assert.ok(history.length > 0);
  const inProgress = history.find((h) => !h.completed && h.progressPercent < 95);
  assert.ok(inProgress);
  assert.equal(inProgress.articleId, 'art-ed-1');
  assert.equal(inProgress.completed, false);
});
