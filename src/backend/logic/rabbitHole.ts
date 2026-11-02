/**
 * Discovery Engine & "Rabbit Hole" Topic Graph
 * readAday Core Architecture Requirement #7:
 * "Build a foundation for topic relationships and the Rabbit Hole feature.
 *  Connect related articles through shared topics, tags and categories.
 *  Provide APIs for related-content recommendations."
 */

import { Article, TopicRelationship, RabbitHoleNode } from '../types.ts';

export interface RabbitHoleExplorationResult {
  originArticleId?: string;
  originTitle?: string;
  originTopic?: string;
  depth: number;
  totalTrailLength: number;
  trail: RabbitHoleNode[];
  connectedTopics: Array<{
    topicSlug: string;
    topicName: string;
    affinity: number;
    relation: string;
  }>;
}

/**
 * Calculate multi-dimensional similarity between two articles:
 * 1. Shared tags (Jaccard coefficient with weight 0.4)
 * 2. Same category (weight 0.25)
 * 3. Topic relationship graph proximity (weight 0.35)
 */
export function calculateArticleAffinity(
  articleA: Article,
  articleB: Article,
  relationships: TopicRelationship[]
): { score: number; reason: string } {
  if (articleA.id === articleB.id) {
    return { score: 1.0, reason: 'Identical article' };
  }

  // 1. Tag overlap (Jaccard)
  const tagsA = new Set(articleA.tags.map((t) => t.toLowerCase()));
  const tagsB = new Set(articleB.tags.map((t) => t.toLowerCase()));
  const sharedTags: string[] = [];
  tagsA.forEach((tag) => {
    if (tagsB.has(tag)) sharedTags.push(tag);
  });
  const unionTagsCount = new Set([...tagsA, ...tagsB]).size;
  const tagSimilarity = unionTagsCount > 0 ? sharedTags.length / unionTagsCount : 0;

  // 2. Category match
  const categoryMatch = articleA.categorySlug === articleB.categorySlug ? 1.0 : 0.0;

  // 3. Topic graph relationship match
  let topicAffinity = 0;
  let topicRationale = '';
  for (const rel of relationships) {
    const aHasSource = tagsA.has(rel.sourceTopicSlug) || articleA.categorySlug === rel.sourceTopicSlug;
    const bHasTarget = tagsB.has(rel.targetTopicSlug) || articleB.categorySlug === rel.targetTopicSlug;
    const aHasTarget = tagsA.has(rel.targetTopicSlug) || articleA.categorySlug === rel.targetTopicSlug;
    const bHasSource = tagsB.has(rel.sourceTopicSlug) || articleB.categorySlug === rel.sourceTopicSlug;

    if ((aHasSource && bHasTarget) || (aHasTarget && bHasSource)) {
      if (rel.affinityScore > topicAffinity) {
        topicAffinity = rel.affinityScore;
        topicRationale = `${rel.sourceTopicName} &harr; ${rel.targetTopicName} (${rel.relationshipType})`;
      }
    }
  }

  const finalScore = (tagSimilarity * 0.4) + (categoryMatch * 0.25) + (topicAffinity * 0.35);

  let reason = '';
  if (sharedTags.length > 0) {
    reason = `Shared tags: ${sharedTags.slice(0, 3).join(', ')}`;
  } else if (topicRationale) {
    reason = `Topic bridge: ${topicRationale}`;
  } else if (categoryMatch) {
    reason = `Same category: ${articleA.categoryName}`;
  } else {
    reason = `Curated reading affinity`;
  }

  return {
    score: Math.min(1.0, Math.round(finalScore * 100) / 100),
    reason,
  };
}

/**
 * Explore the "Rabbit Hole" starting from an article up to a given depth.
 * Follows topic graph pathways into deeper subtopics and cross-domain connections.
 */
export function exploreRabbitHole(
  originArticle: Article,
  allArticles: Article[],
  relationships: TopicRelationship[],
  requestedDepth: number = 3
): RabbitHoleExplorationResult {
  const depth = Math.min(Math.max(1, requestedDepth), 5);
  const visited = new Set<string>([originArticle.id]);
  const trail: RabbitHoleNode[] = [];

  let currentPool = [originArticle];

  for (let currentDepth = 1; currentDepth <= depth; currentDepth++) {
    const candidates: Array<{
      article: Article;
      score: number;
      reason: string;
      parentTitle: string;
    }> = [];

    for (const parent of currentPool) {
      for (const candidate of allArticles) {
        if (visited.has(candidate.id) || candidate.status !== 'published') continue;

        const { score, reason } = calculateArticleAffinity(parent, candidate, relationships);
        if (score > 0.15) {
          candidates.push({
            article: candidate,
            score,
            reason: `${reason} (via "${parent.title.slice(0, 30)}...")`,
            parentTitle: parent.title,
          });
        }
      }
    }

    if (candidates.length === 0) break;

    // Sort by affinity score
    candidates.sort((a, b) => b.score - a.score);

    // Pick top candidate for this depth step
    const best = candidates[0];
    visited.add(best.article.id);

    trail.push({
      articleId: best.article.id,
      title: best.article.title,
      slug: best.article.slug,
      summary: best.article.summary,
      contentType: best.article.contentType,
      categoryName: best.article.categoryName,
      tags: best.article.tags,
      depth: currentDepth,
      affinityScore: best.score,
      connectionReason: best.reason,
    });

    currentPool = [best.article];
  }

  // Find related topics directly linked from origin article's tags & category
  const originTags = new Set(originArticle.tags.map((t) => t.toLowerCase()));
  const connectedTopics = relationships
    .filter((rel) => originTags.has(rel.sourceTopicSlug) || rel.sourceTopicSlug === originArticle.categorySlug)
    .map((rel) => ({
      topicSlug: rel.targetTopicSlug,
      topicName: rel.targetTopicName,
      affinity: rel.affinityScore,
      relation: rel.relationshipType,
    }));

  return {
    originArticleId: originArticle.id,
    originTitle: originArticle.title,
    originTopic: originArticle.categoryName,
    depth,
    totalTrailLength: trail.length,
    trail,
    connectedTopics,
  };
}

/**
 * Generate personalized recommendations based on reading history & bookmarks.
 */
export function generateRecommendations(
  userHistoryArticleIds: string[],
  userBookmarkArticleIds: string[],
  allArticles: Article[],
  relationships: TopicRelationship[],
  limit: number = 6
): Array<{ article: Article; matchScore: number; reason: string }> {
  const interactedIds = new Set([...userHistoryArticleIds, ...userBookmarkArticleIds]);
  const userInteractedArticles = allArticles.filter((a) => interactedIds.has(a.id));

  // If no user history, return highest engagement published articles
  if (userInteractedArticles.length === 0) {
    const published = allArticles.filter((a) => a.status === 'published');
    published.sort((a, b) => (b.likeCount + b.viewCount * 0.1) - (a.likeCount + a.viewCount * 0.1));
    return published.slice(0, limit).map((article) => ({
      article,
      matchScore: 0.75,
      reason: 'Popular in the readAday community',
    }));
  }

  const scoredCandidates: Array<{ article: Article; matchScore: number; reason: string }> = [];

  for (const candidate of allArticles) {
    if (interactedIds.has(candidate.id) || candidate.status !== 'published') continue;

    let maxScore = 0;
    let bestReason = '';

    for (const interacted of userInteractedArticles) {
      const { score, reason } = calculateArticleAffinity(interacted, candidate, relationships);
      if (score > maxScore) {
        maxScore = score;
        bestReason = `${reason} (similar to "${interacted.title.slice(0, 35)}...")`;
      }
    }

    if (maxScore > 0.1) {
      scoredCandidates.push({
        article: candidate,
        matchScore: maxScore,
        reason: bestReason,
      });
    }
  }

  scoredCandidates.sort((a, b) => b.matchScore - a.matchScore);
  return scoredCandidates.slice(0, limit);
}
