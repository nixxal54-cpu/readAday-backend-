import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hasPermission,
  validateStateTransition,
  validateArticleCreation,
} from '../logic/rbacWorkflow.ts';
import { Article } from '../types.ts';

const baseArticle: Article = {
  id: 'art-draft-1',
  contentType: 'community',
  status: 'draft',
  title: 'Draft Essay',
  slug: 'draft-essay',
  summary: 'A short draft.',
  content: 'Draft content goes here.',
  authorId: 'writer-123',
  authorName: 'Alex Writer',
  categoryId: 'cat-lit',
  categoryName: 'Literature',
  categorySlug: 'literature',
  tags: ['essay'],
  readingTimeMinutes: 3,
  fullContentPermitted: true,
  viewCount: 0,
  likeCount: 0,
  bookmarkCount: 0,
  commentCount: 0,
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
};

test('RBAC role permissions: readers cannot publish or submit reviews', () => {
  assert.equal(hasPermission('reader', 'article:publish'), false);
  assert.equal(hasPermission('reader', 'article:submit_review'), false);
  assert.equal(hasPermission('writer', 'article:submit_review'), true);
  assert.equal(hasPermission('writer', 'article:publish'), false); // writers cannot directly publish!
  assert.equal(hasPermission('editor', 'article:publish'), true);
  assert.equal(hasPermission('admin', 'admin:settings'), true);
});

test('Article creation validation: reader cannot author articles directly', () => {
  const readerAttempt = validateArticleCreation('community', 'reader');
  assert.equal(readerAttempt.permitted, false);
  assert.ok(readerAttempt.error?.includes('apply to become a writer'));

  const writerEditorialAttempt = validateArticleCreation('editorial', 'writer');
  assert.equal(writerEditorialAttempt.permitted, false);
  assert.ok(writerEditorialAttempt.error?.includes('editors or admins'));

  const writerCommunityAttempt = validateArticleCreation('community', 'writer');
  assert.equal(writerCommunityAttempt.permitted, true);
});

test('State transitions: author can submit draft for review', () => {
  const result = validateStateTransition(baseArticle, 'pending_review', 'writer', 'writer-123');
  assert.equal(result.success, true);
  assert.equal(result.newStatus, 'pending_review');
});

test('Privilege escalation prevention: writer cannot publish directly', () => {
  const pendingArticle: Article = { ...baseArticle, status: 'pending_review' };
  const escalateAttempt = validateStateTransition(pendingArticle, 'published', 'writer', 'writer-123');
  assert.equal(escalateAttempt.success, false);
  assert.ok(escalateAttempt.error?.includes('Privilege escalation blocked'));
});

test('Editor can approve and publish pending article', () => {
  const pendingArticle: Article = { ...baseArticle, status: 'pending_review' };
  const editorPublish = validateStateTransition(pendingArticle, 'published', 'editor', 'editor-456');
  assert.equal(editorPublish.success, true);
  assert.equal(editorPublish.newStatus, 'published');
});

test('Illegal state transitions are prevented', () => {
  // Cannot transition directly from published back to pending_review
  const publishedArticle: Article = { ...baseArticle, status: 'published' };
  const invalidJump = validateStateTransition(publishedArticle, 'pending_review', 'editor', 'editor-456');
  assert.equal(invalidJump.success, false);
  assert.ok(invalidJump.error?.includes('Illegal state transition'));
});
