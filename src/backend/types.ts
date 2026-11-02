/**
 * readAday Core Backend Types & Schemas
 */

export type UserRole = 'reader' | 'writer' | 'editor' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string;
  role: UserRole;
  bio?: string;
  website?: string;
  settings: {
    emailNotifications: boolean;
    readingTheme: 'dark' | 'sepia' | 'light';
    fontSize: number;
    preferredCategories: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export type ContentType = 'editorial' | 'news' | 'community' | 'discover' | 'books';

export type ContentIdentity = ContentType;

export type ContentProviderId =
  | 'gdelt'
  | 'guardian'
  | 'blogger'
  | 'rss'
  | 'devto'
  | 'hashnode'
  | 'arxiv'
  | 'openalex'
  | 'gutendex'
  | 'wikipedia';

export type ArticleStatus = 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived' | 'scheduled';

export type ContentRights = 'licensed_full' | 'fair_use_summary' | 'original_reporting' | 'syndicated' | 'snippet_only';

export interface ProviderSyncLog {
  id: string;
  providerId: ContentProviderId;
  status: 'success' | 'partial' | 'failed' | 'rate_limited';
  fetchedCount: number;
  ingestedCount: number;
  duplicateCount: number;
  errorMessage?: string;
  durationMs: number;
  timestamp: string;
}

export interface ProviderHealth {
  providerId: ContentProviderId;
  name: string;
  contentIdentity: ContentIdentity;
  status: 'healthy' | 'degraded' | 'down';
  responseTimeMs: number;
  requiresApiKey: boolean;
  isApiKeyConfigured: boolean;
  lastCheckedAt: string;
  lastSyncAt?: string;
  errorMessage?: string;
}

export interface Article {
  id: string;
  contentType: ContentType;
  status: ArticleStatus;
  title: string;
  slug: string;
  summary: string;
  content: string; // Rich text / markdown / HTML
  coverImageUrl?: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  tags: string[];
  readingTimeMinutes: number;
  publishedAt?: string;
  scheduledFor?: string;
  isFeatured?: boolean;
  curationNotes?: string;
  // News engine & copyright rights metadata
  sourcePublisher?: string;
  originalUrl?: string;
  contentRights?: ContentRights;
  dedupHash?: string;
  fullContentPermitted: boolean;
  lastSyncedAt?: string;
  // Engagement counters
  viewCount: number;
  likeCount: number;
  bookmarkCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  displayOrder: number;
}

export interface Topic {
  id: string;
  slug: string;
  name: string;
  categoryId: string;
  description?: string;
}

export type RelationshipType = 'broader' | 'narrower' | 'related' | 'prerequisite' | 'deep_dive';

export interface TopicRelationship {
  id: string;
  sourceTopicSlug: string;
  targetTopicSlug: string;
  sourceTopicName: string;
  targetTopicName: string;
  affinityScore: number; // 0.1 to 1.0
  relationshipType: RelationshipType;
  rationale: string;
}

export interface CuratedCollection {
  id: string;
  title: string;
  slug: string;
  description: string;
  coverImageUrl?: string;
  createdBy: string;
  isEditorialChoice: boolean;
  articleIds: string[];
  createdAt: string;
}

export interface ReadingBookmark {
  id: string;
  userId: string;
  articleId: string;
  createdAt: string;
}

export interface ReadingHistory {
  id: string;
  userId: string;
  articleId: string;
  progressPercent: number; // 0 to 100
  scrollPosition: number;
  completed: boolean;
  readDurationSeconds: number;
  lastReadAt: string;
}

export interface HighlightAndNote {
  id: string;
  userId: string;
  articleId: string;
  highlightText: string;
  color: 'amber' | 'emerald' | 'cyan' | 'rose' | 'violet';
  startOffset?: number;
  endOffset?: number;
  privateNote: string; // Strictly private - RLS isolates this to userId
  createdAt: string;
  updatedAt: string;
}

export interface PersonalCollection {
  id: string;
  userId: string;
  name: string;
  description: string;
  isPrivate: boolean;
  articleIds: string[];
  createdAt: string;
}

export interface WriterApplication {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  sampleUrls: string[];
  bio: string;
  topics: string[];
  status: 'pending' | 'approved' | 'rejected';
  reviewerNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  articleId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  userRole: UserRole;
  parentId?: string;
  content: string;
  status: 'active' | 'flagged' | 'hidden';
  createdAt: string;
}

export interface ContentReport {
  id: string;
  reporterId: string;
  targetType: 'article' | 'comment' | 'user';
  targetId: string;
  targetTitle?: string;
  reason: 'copyright' | 'misinformation' | 'spam' | 'harassment' | 'other';
  details: string;
  status: 'pending' | 'reviewed' | 'dismissed' | 'actioned';
  reviewedBy?: string;
  createdAt: string;
}

export interface NewsSource {
  id: string;
  name: string;
  rssUrl: string;
  categorySlug: string;
  licenseType: ContentRights;
  isActive: boolean;
  fetchIntervalMinutes: number;
  lastFetchedAt?: string;
  totalIngested: number;
}

export interface RabbitHoleNode {
  articleId: string;
  title: string;
  slug: string;
  summary: string;
  contentType: ContentType;
  categoryName: string;
  tags: string[];
  depth: number;
  affinityScore: number;
  connectionReason: string;
}
