import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDedupHash, evaluateContentRights } from '../logic/copyrightRights.ts';

test('Deduplication hash normalizes URLs and title variations', () => {
  const hash1 = generateDedupHash(
    'Breakthrough in Quantum Computing',
    'https://example.com/news/quantum-breakthrough?utm_source=twitter&utm_medium=social'
  );
  const hash2 = generateDedupHash(
    'Breakthrough in Quantum Computing!',
    'https://example.com/news/quantum-breakthrough/'
  );
  assert.equal(hash1, hash2);
});

test('Fair use compliance: never stores full text without licensed rights', () => {
  const input = {
    title: 'Major Tech Corporation Unveils New Processor',
    originalUrl: 'https://newsoutlet.com/processor-launch',
    publisher: 'Tech Daily',
    summary: 'The new silicon promises 30% battery efficiency gains.',
    rawFullContent: 'Four thousand words of proprietary copyrighted journalism...',
    licenseType: 'fair_use_summary' as const,
  };

  const decision = evaluateContentRights(input);
  assert.equal(decision.permittedFullText, false);
  assert.equal(decision.contentRights, 'fair_use_summary');
  assert.equal(decision.contentToStore.includes('Four thousand words of proprietary'), false);
  assert.equal(decision.contentToStore.includes('Originally published by <em>Tech Daily</em>'), true);
  assert.equal(decision.contentToStore.includes('https://newsoutlet.com/processor-launch'), true);
});

test('Licensed partner content allows full text storage with attribution', () => {
  const input = {
    title: 'Syndicated Economic Analysis 2026',
    originalUrl: 'https://licensedpartner.org/economy',
    publisher: 'Financial Syndicate Network',
    summary: 'Macroeconomic quarterly indicators.',
    rawFullContent: '<p>Complete licensed financial analysis under syndication treaty.</p>',
    licenseType: 'licensed_full' as const,
  };

  const decision = evaluateContentRights(input);
  assert.equal(decision.permittedFullText, true);
  assert.equal(decision.contentRights, 'licensed_full');
  assert.equal(decision.contentToStore, input.rawFullContent);
});
