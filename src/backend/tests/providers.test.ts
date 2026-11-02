import { test } from 'node:test';
import assert from 'node:assert/strict';
import { providerRegistry } from '../providers/providerRegistry.ts';
import { store } from '../store.ts';
import { filterFeedArticles, assertFeedPurity } from '../logic/feedSeparation.ts';
import { ContentProviderId } from '../types.ts';

test('Provider Registry has all 10 content providers registered with strict content identities', () => {
  const adapters = providerRegistry.getAllAdapters();
  assert.equal(adapters.length, 10, 'Expected exactly 10 registered content provider adapters');

  const expectedProviders: Record<ContentProviderId, string> = {
    gdelt: 'news',
    guardian: 'news',
    blogger: 'editorial',
    rss: 'editorial',
    devto: 'community',
    hashnode: 'community',
    arxiv: 'discover',
    openalex: 'discover',
    gutendex: 'books',
    wikipedia: 'discover',
  };

  for (const [id, expectedIdentity] of Object.entries(expectedProviders)) {
    const adapter = providerRegistry.getAdapter(id as ContentProviderId);
    assert.ok(adapter, `Adapter '${id}' must be present in registry`);
    assert.equal(
      adapter.contentIdentity,
      expectedIdentity,
      `Adapter '${id}' must map to content identity '${expectedIdentity}'`
    );
    assert.ok(adapter.name.length > 0, `Adapter '${id}' must have a valid human-readable name`);
    assert.ok(typeof adapter.fetchContent === 'function', `Adapter '${id}' must provide fetchContent`);
    assert.ok(typeof adapter.healthCheck === 'function', `Adapter '${id}' must provide healthCheck`);
  }
});

test('Copyright Compliance: Never permits full proprietary text without licensed rights', () => {
  const allArticles = Array.from(store.articles.values());

  for (const article of allArticles) {
    if (!article.fullContentPermitted) {
      // Must be fair-use summary or snippet
      assert.ok(
        article.contentRights === 'fair_use_summary' || article.contentRights === 'snippet_only',
        `Article '${article.id}' without full rights must be fair_use_summary or snippet_only`
      );
      assert.ok(
        article.content.includes('readaday-') || article.content.includes('Attribution') || article.content.includes('original'),
        `Article '${article.id}' under fair use must contain source attribution notice`
      );
    } else {
      // Must be licensed, original reporting, or syndicated public domain
      assert.ok(
        article.contentRights === 'licensed_full' ||
        article.contentRights === 'original_reporting' ||
        article.contentRights === 'syndicated',
        `Article '${article.id}' with fullContentPermitted must possess valid license rights`
      );
    }
  }
});

test('Non-Destructive Ingestion: Syncing never overwrites original user/platform articles', async () => {
  const originalArticle = store.articles.get('art-ed-1');
  assert.ok(originalArticle);
  const originalTitle = originalArticle.title;
  const originalAuthor = originalArticle.authorId;

  // Simulate an external adapter attempting to ingest an item with ID 'art-ed-1'
  const mockAdapter = {
    id: 'devto' as ContentProviderId,
    name: 'DEV',
    description: 'test',
    contentIdentity: 'community' as const,
    requiresApiKey: false,
    fetchContent: async () => [
      {
        externalId: 'art-ed-1',
        title: 'OVERWRITE ATTEMPT',
        slug: 'overwrite-attempt',
        summary: 'Should be rejected',
        content: '<p>Malicious overwrite</p>',
        contentType: 'community' as const,
        authorName: 'Attacker',
        categoryName: 'Tech',
        categorySlug: 'tech',
        tags: ['test'],
        sourcePublisher: 'External',
        originalUrl: 'https://example.com/exploit',
        contentRights: 'fair_use_summary' as const,
        fullContentPermitted: false,
        readingTimeMinutes: 1,
        publishedAt: new Date().toISOString(),
      },
    ],
    healthCheck: async () => ({
      providerId: 'devto' as const,
      name: 'DEV',
      contentIdentity: 'community' as const,
      status: 'healthy' as const,
      responseTimeMs: 10,
      requiresApiKey: false,
      isApiKeyConfigured: true,
      lastCheckedAt: new Date().toISOString(),
    }),
  };

  // Temporarily register mock adapter to test safety guard
  providerRegistry.registerAdapter(mockAdapter);
  await providerRegistry.syncProvider('devto');

  // Verify original article was NEVER overwritten
  const preservedArticle = store.articles.get('art-ed-1');
  assert.ok(preservedArticle);
  assert.equal(preservedArticle.title, originalTitle, 'Original title must not be altered');
  assert.equal(preservedArticle.authorId, originalAuthor, 'Original authorId must not be altered');
  assert.notEqual(preservedArticle.title, 'OVERWRITE ATTEMPT');

  // Restore real DEV adapter
  const { DevtoAdapter } = await import('../providers/adapters/devtoAdapter.ts');
  providerRegistry.registerAdapter(new DevtoAdapter());
});

test('Strict 5-Feed Segregation: Zero contamination across Editorial, News, Community, Discover, and Books', () => {
  const allArticles = Array.from(store.articles.values());

  const feeds = ['editorial', 'news', 'community', 'discover', 'books'] as const;

  for (const feed of feeds) {
    const result = filterFeedArticles(allArticles, { feed, status: 'published' });

    // Assert every returned item strictly matches requested feed
    assertFeedPurity(result.items, feed);
    assert.equal(result.validationCheck.isContaminated, false);
    assert.equal(result.validationCheck.unauthorizedTypesFound.length, 0);

    for (const item of result.items) {
      assert.equal(
        item.contentType,
        feed,
        `Item '${item.id}' in feed '${feed}' has incompatible contentType '${item.contentType}'`
      );
    }
  }
});

test('Provider Health Monitoring and Sync Logs audit tracking', () => {
  const healthStatuses = providerRegistry.getHealthStatuses();
  assert.equal(healthStatuses.length, 10, 'Health check must track all 10 providers');

  for (const health of healthStatuses) {
    assert.ok(['healthy', 'degraded', 'down'].includes(health.status));
    assert.ok(typeof health.isApiKeyConfigured === 'boolean');
    assert.ok(health.lastCheckedAt);
  }

  // Record a synthetic sync log in store
  const logId = `test_log_${Date.now()}`;
  store.providerSyncLogs.set(logId, {
    id: logId,
    providerId: 'gutendex',
    status: 'success',
    fetchedCount: 8,
    ingestedCount: 6,
    duplicateCount: 2,
    durationMs: 412,
    timestamp: new Date().toISOString(),
  });

  const logs = providerRegistry.getSyncLogs();
  assert.ok(logs.length > 0);
  assert.ok(logs.some((l) => l.providerId === 'gutendex'));
});

test('Real Provider Normalization: Gutendex public domain books and arXiv scientific research', async () => {
  const books = Array.from(store.articles.values()).filter((a) => a.contentType === 'books');
  assert.ok(books.length >= 2, 'Books feed must have seeded public-domain canon');

  const marcus = books.find((b) => b.id === 'art-book-1' || b.title.includes('Marcus Aurelius'));
  assert.ok(marcus);
  assert.equal(marcus.contentType, 'books');
  assert.equal(marcus.contentRights, 'licensed_full');
  assert.equal(marcus.fullContentPermitted, true);
  assert.ok(marcus.originalUrl?.includes('gutenberg.org'));

  const research = Array.from(store.articles.values()).filter((a) => a.contentType === 'discover');
  assert.ok(research.length >= 2, 'Discover feed must have seeded scientific research');

  const arxivPaper = research.find((r) => r.id === 'art-disc-1' || r.tags.includes('arxiv'));
  assert.ok(arxivPaper);
  assert.equal(arxivPaper.contentType, 'discover');
  assert.equal(arxivPaper.contentRights, 'fair_use_summary');
  assert.equal(arxivPaper.fullContentPermitted, false);
});
