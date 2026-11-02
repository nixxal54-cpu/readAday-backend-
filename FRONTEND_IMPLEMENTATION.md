# readAday - Frontend Integration & API Documentation

Complete developer reference for connecting your frontend application to the production **readAday** backend.

- **Production Backend URL**: `https://readaday-backend.onrender.com`
- **Health Check**: `https://readaday-backend.onrender.com/health`
- **API Catalog & Schema**: `https://readaday-backend.onrender.com/api`
- **Database & Auth**: PostgreSQL 16 on Supabase with Row Level Security (RLS)

---

## Table of Contents

1. [Quick Start & Environment Setup](#1-quick-start--environment-setup)
2. [Authentication, User Profiles & Image Storage](#2-authentication-user-profiles--image-storage)
3. [TypeScript Data Models](#3-typescript-data-models)
4. [Complete API Endpoints Reference](#4-complete-api-endpoints-reference)
   - [Content Feeds & Strict Partitioning](#content-feeds--strict-partitioning)
   - [Categories & Topic Tags](#categories--topic-tags)
   - [Articles CRUD & Draft Updates](#articles-crud--draft-updates)
   - [My Submissions & Following Feed](#my-submissions--following-feed)
   - [Author Follow System & Public Author Profiles](#author-follow-system--public-author-profiles)
   - [Library & Collections (Curated & Personal)](#library--collections-curated--personal)
   - [Reading History, Progress & Resume Reading](#reading-history-progress--resume-reading)
   - [Private Highlights & Notes (RLS Protected)](#private-highlights--notes-rls-protected)
   - [The Rabbit Hole Discovery Engine](#the-rabbit-hole-discovery-engine)
   - [News Engine & Copyright Compliance](#news-engine--copyright-compliance)
   - [Community & Writer Applications](#community--writer-applications)
   - [Editorial Dashboard](#editorial-dashboard)
   - [Health & Live System Verification](#health--live-system-verification)
5. [Production TypeScript API Client](#5-production-typescript-api-client)
6. [React Hooks for Common UI Patterns](#6-react-hooks-for-common-ui-patterns)
7. [Error Handling & Security Reference](#7-error-handling--security-reference)

---

## 1. Quick Start & Environment Setup

In your frontend application's `.env.local` (Next.js, Vite, React Native, etc.):

```env
# Backend API Base URL
NEXT_PUBLIC_READADAY_API="https://readaday-backend.onrender.com"
# OR for Vite:
# VITE_READADAY_API="https://readaday-backend.onrender.com"
```

### Request Headers
Every request should include standard JSON headers:

```http
Content-Type: application/json
```

Pass the authenticated Supabase user token in the `Authorization` header:

```http
Authorization: Bearer <SUPABASE_JWT_ACCESS_TOKEN>
```

#### Development & Testing Role Switcher
You can test permissions across all 4 roles by passing the `x-readaday-user-id` header:
- `x-readaday-user-id: usr-admin-1` (Admin)
- `x-readaday-user-id: usr-editor-1` (Editor)
- `x-readaday-user-id: usr-writer-1` (Writer)
- `x-readaday-user-id: usr-reader-1` (Reader)

---

## 2. Authentication, User Profiles & Image Storage

### 1. Get Current User & Reader Stats
```http
GET /api/auth/me
GET /api/auth/profile
```
**Sample Response (HTTP 200):**
```json
{
  "profile": {
    "id": "usr-reader-1",
    "email": "dev.reader@readaday.com",
    "fullName": "Devon Vance",
    "avatarUrl": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
    "role": "reader",
    "bio": "Postdoctoral researcher studying cognitive neuroscience and active marginalia.",
    "website": "https://vance.science",
    "settings": {
      "emailNotifications": true,
      "readingTheme": "dark",
      "fontSize": 16,
      "preferredCategories": ["focus-cognition"]
    },
    "stats": {
      "articlesCount": 0,
      "publishedCount": 0,
      "bookmarksCount": 2,
      "highlightsCount": 1,
      "historyCount": 1,
      "totalReadingMinutes": 7,
      "followerCount": 0,
      "followingCount": 1
    }
  }
}
```

### 2. Update User Profile & Settings
```http
PUT /api/auth/profile
PUT /api/auth/me
Content-Type: application/json

{
  "fullName": "Devon Vance, Ph.D.",
  "bio": "Updated bio highlighting independent publications.",
  "website": "https://vance-research.org",
  "avatarUrl": "https://images.unsplash.com/photo-1534528741775-53994a69daeb",
  "settings": {
    "readingTheme": "sepia",
    "fontSize": 18
  }
}
```
**Response (HTTP 200):**
```json
{
  "success": true,
  "profile": { ...updatedUser }
}
```

### 3. Upload Image (Covers & Inline Rich Text)
Supports base64 data URIs, direct image URLs, or curated fallbacks:
```http
POST /api/storage/upload
Content-Type: application/json

{
  "data": "data:image/jpeg;base64,/9j/4AAQSkZJRg...", // OR "url": "https://my-bucket/image.png"
  "filename": "cover.jpg",
  "type": "cover" // "cover" | "avatar" | "inline"
}
```
**Response (HTTP 200):**
```json
{
  "success": true,
  "url": "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?...",
  "filename": "cover.jpg"
}
```

---

## 3. TypeScript Data Models

Save these in `types/readaday.ts`:

```typescript
export type UserRole = 'reader' | 'writer' | 'editor' | 'admin';

export type ContentType = 'editorial' | 'news' | 'community';

export type ArticleStatus = 
  | 'draft' 
  | 'pending_review' 
  | 'published' 
  | 'rejected' 
  | 'archived' 
  | 'scheduled';

export type ContentRights = 
  | 'licensed_full' 
  | 'fair_use_summary' 
  | 'original_reporting' 
  | 'syndicated' 
  | 'snippet_only';

export interface UserStats {
  articlesCount: number;
  publishedCount: number;
  bookmarksCount: number;
  highlightsCount: number;
  historyCount: number;
  totalReadingMinutes: number;
  followerCount: number;
  followingCount: number;
}

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
  stats?: UserStats;
  createdAt: string;
  updatedAt: string;
}

export interface Article {
  id: string;
  contentType: ContentType;
  status: ArticleStatus;
  title: string;
  slug: string;
  summary: string;
  content: string; // Rich HTML or Markdown
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
  // News engine & copyright rights
  sourcePublisher?: string;
  originalUrl?: string;
  contentRights?: ContentRights;
  dedupHash?: string;
  fullContentPermitted: boolean;
  lastSyncedAt?: string;
  // Metrics
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
  articleCount?: number;
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
  articleCount?: number;
  articles?: Article[];
  createdAt: string;
}

export interface PersonalCollection {
  id: string;
  userId: string;
  name: string;
  description: string;
  isPrivate: boolean;
  articleIds: string[];
  articleCount?: number;
  articles?: Article[];
  createdAt: string;
}

export interface AuthorProfile {
  id: string;
  fullName: string;
  avatarUrl: string;
  bio: string;
  website: string;
  role: UserRole;
  followerCount: number;
  isFollowing: boolean;
  articlesCount: number;
  publishedArticles?: Article[];
}

export interface ReadingHistoryEntry {
  id: string;
  userId: string;
  articleId: string;
  progressPercent: number; // 0 to 100
  scrollPosition: number;
  completed: boolean;
  readDurationSeconds: number;
  lastReadAt: string;
  article?: Article;
}

export interface HighlightAndNote {
  id: string;
  userId: string;
  articleId: string;
  highlightText: string;
  color: 'amber' | 'emerald' | 'cyan' | 'rose' | 'violet';
  startOffset?: number;
  endOffset?: number;
  privateNote: string;
  createdAt: string;
  updatedAt: string;
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

export interface RabbitHoleExplorationResult {
  originArticleId: string;
  originTitle: string;
  originTopic: string;
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
```

---

## 4. Complete API Endpoints Reference

### Content Feeds & Strict Partitioning

> **CRITICAL ARCHITECTURAL RULE**:
> readAday strictly separates **Editorial**, **News**, and **Community** feeds. They are never mixed together. Always specify `?feed=...` in feed queries.

#### 1. Get Isolated Content Feed
```http
GET /api/articles?feed={editorial|news|community}
```
**Query Parameters:**
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `feed` | string | **Yes** | `editorial`, `news`, or `community` |
| `category` | string | No | Filter by category slug |
| `tag` | string | No | Filter by tag |
| `search` | string | No | Full-text query across title, summary, author |
| `page` | number | No | Page number (default: `1`) |
| `limit` | number | No | Page size (default: `10`) |

**Sample Response (HTTP 200):**
```json
{
  "feed": "editorial",
  "items": [
    {
      "id": "art-ed-1",
      "contentType": "editorial",
      "status": "published",
      "title": "The Sanctuary of Solitary Thought: An Architectural Defense of Deep Reading",
      "slug": "sanctuary-solitary-thought",
      "summary": "In an attention-fragmented world, deliberate immersion in long-form writing is no longer mere leisure—it is our primary cognitive firewall.",
      "readingTimeMinutes": 7,
      "categoryName": "Focus & Cognition",
      "categorySlug": "focus-cognition",
      "tags": ["deep-work", "neuroplasticity", "reading", "cognition"],
      "authorName": "Claire St. John",
      "coverImageUrl": "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?...",
      "viewCount": 2480,
      "likeCount": 684,
      "bookmarkCount": 412,
      "commentCount": 48
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

---

### Categories & Topic Tags

#### 2. Get All Categories & Unique Tags
```http
GET /api/categories
```
**Response (HTTP 200):**
```json
{
  "categories": [
    {
      "id": "cat-focus-cognition",
      "slug": "focus-cognition",
      "name": "Focus & Cognition",
      "description": "Deep work, neural architecture, and the mechanics of contemplative attention.",
      "icon": "Brain",
      "displayOrder": 1,
      "articleCount": 2
    },
    {
      "id": "cat-technology-ai",
      "slug": "technology-ai",
      "name": "Technology & AI",
      "description": "Frontiers of computation, synthetic cognition, and human-machine symbiotic design.",
      "icon": "Cpu",
      "displayOrder": 2,
      "articleCount": 2
    }
  ],
  "tags": ["deep-work", "neuroplasticity", "reading", "cognition", "transformers-llm", "synthetic-minds"]
}
```
*Note: Writers can select existing categories or type a free-text category. The backend automatically registers any new category.*

---

### Articles CRUD & Draft Updates

#### 3. Get Single Article (Increments View Count)
```http
GET /api/articles/:id
```
**Response:**
```json
{
  "article": {
    "id": "art-ed-1",
    "title": "The Sanctuary of Solitary Thought: An Architectural Defense of Deep Reading",
    "content": "<h2>The Dissolution of Attentional Continuity</h2><p>...</p>",
    "readingTimeMinutes": 7,
    "viewCount": 2481
  }
}
```

#### 4. Create Article (Writers, Editors, Admins)
```http
POST /api/articles
Content-Type: application/json

{
  "title": "The Neurobiology of Quiet Spaces",
  "summary": "Why silence rebuilds cognitive focus in high-stimulus environments.",
  "content": "<h2>Introduction</h2><p>Article body...</p>",
  "contentType": "community", // "community" for writers; editors/admins can also create "editorial" or "news"
  "categorySlug": "focus-cognition", // Existing slug OR free-text label
  "tags": ["deep-work", "neuroscience"],
  "coverImageUrl": "https://images.unsplash.com/photo-1457369804613-52c61a468e7d",
  "scheduledFor": "2026-11-05T12:00:00Z", // Optional: ISO date string for scheduled release
  "publishImmediately": false             // Only permitted for editor/admin
}
```

#### 5. Edit Existing Draft or Article (Writer or Editor)
```http
PUT /api/articles/:id
Content-Type: application/json

{
  "title": "The Neurobiology of Quiet Spaces (Revised)",
  "summary": "Updated thesis on quiet environments.",
  "content": "<h2>Updated Body</h2><p>New content...</p>",
  "tags": ["neuroscience", "cognition"],
  "categorySlug": "focus-cognition",
  "coverImageUrl": "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c",
  "status": "pending_review" // Authors can submit drafts for review with status: "pending_review"
}
```
**Response (HTTP 200):**
```json
{
  "success": true,
  "article": { ...updatedArticle }
}
```

#### 6. Delete Draft Article
```http
DELETE /api/articles/:id
```
*(Authors can delete their own drafts; Admins can delete any article).*

#### 7. Transition Lifecycle State
```http
POST /api/articles/:id/workflow
Content-Type: application/json

{
  "targetStatus": "published", // "pending_review" | "published" | "rejected" | "scheduled" | "archived"
  "scheduledFor": "2026-11-10T10:00:00Z" // Required only if targetStatus is "scheduled"
}
```

---

### My Submissions & Following Feed

#### 8. Get Current User's Articles / Submissions
Lists all articles created by the authenticated writer across all statuses (`draft`, `pending_review`, `published`, `rejected`), sorted newest first:
```http
GET /api/articles/my-submissions
GET /api/articles/my-articles
GET /api/articles/my-submissions?status=draft
GET /api/articles/my-submissions?status=pending_review
GET /api/articles/my-submissions?status=published
```
**Response (HTTP 200):**
```json
{
  "total": 3,
  "articles": [
    {
      "id": "art-com-1",
      "title": "Notes on Active Marginalia: How Physical Notetaking Alters Memory Consolidation",
      "status": "published",
      "contentType": "community",
      "createdAt": "2026-10-24T14:30:00Z",
      "updatedAt": "2026-10-24T14:30:00Z"
    }
  ]
}
```

#### 9. Get Following Feed
Returns published articles written by authors the current user follows:
```http
GET /api/articles/following
```
**Response (HTTP 200):**
```json
{
  "total": 1,
  "articles": [
    {
      "id": "art-com-1",
      "title": "Notes on Active Marginalia...",
      "authorId": "usr-writer-1",
      "authorName": "Marcus Aurel Chen",
      "status": "published"
    }
  ]
}
```

---

### Author Follow System & Public Author Profiles

#### 10. Toggle Follow / Unfollow Author
```http
POST /api/community/authors/:id/follow
POST /api/authors/:id/follow
```
**Response (HTTP 200):**
```json
{
  "success": true,
  "isFollowing": true,
  "followerCount": 2,
  "authorId": "usr-writer-1"
}
```

#### 11. Explicit Unfollow Author
```http
DELETE /api/community/authors/:id/follow
DELETE /api/authors/:id/follow
```
**Response (HTTP 200):**
```json
{
  "success": true,
  "isFollowing": false,
  "followerCount": 1,
  "authorId": "usr-writer-1"
}
```

#### 12. Check Follow Status
```http
GET /api/community/authors/:id/follow-status
GET /api/authors/:id/follow-status
```
**Response (HTTP 200):**
```json
{
  "isFollowing": true,
  "followerCount": 2
}
```

#### 13. List Authors Followed by Current User
```http
GET /api/community/following
```
**Response (HTTP 200):**
```json
{
  "total": 1,
  "authors": [
    {
      "id": "usr-writer-1",
      "fullName": "Marcus Aurel Chen",
      "avatarUrl": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
      "bio": "Independent essayist exploring cognitive science...",
      "website": "https://marcus.io",
      "role": "writer",
      "followerCount": 2,
      "isFollowing": true,
      "articlesCount": 1
    }
  ]
}
```

#### 14. Get Public Author Profile
```http
GET /api/authors/:id
```
**Response (HTTP 200):**
```json
{
  "author": {
    "id": "usr-writer-1",
    "fullName": "Marcus Aurel Chen",
    "avatarUrl": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
    "bio": "Independent essayist exploring cognitive science...",
    "website": "https://marcus.io",
    "role": "writer",
    "followerCount": 2,
    "isFollowing": true,
    "articlesCount": 1,
    "publishedArticles": [ ... ]
  }
}
```

---

### Library & Collections (Curated & Personal)

Collections always return **both** `articleIds: string[]` and fully populated `articles: Article[]`, with `articleCount: number`.

#### 15. Get Curated Editorial Collections
```http
GET /api/editorial/collections
GET /api/editorial/collections/:id
```
**Response (HTTP 200):**
```json
{
  "collections": [
    {
      "id": "col-1",
      "title": "Architectures of Deep Reading",
      "slug": "architectures-deep-reading",
      "description": "Essential long-form essays exploring attentional restoration and cognitive shelters.",
      "coverImageUrl": "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=800&q=80",
      "isEditorialChoice": true,
      "articleIds": ["art-ed-1", "art-com-1"],
      "articleCount": 2,
      "articles": [ ...populatedArticles ]
    }
  ]
}
```

#### 16. Get Personal Saved Collections (Library Tab)
```http
GET /api/reader/collections
```
**Response (HTTP 200):**
```json
{
  "collections": [
    {
      "id": "pcol-1",
      "userId": "usr-reader-1",
      "name": "Weekend Research Sprint",
      "description": "Articles on attentional focus and active marginalia.",
      "isPrivate": true,
      "articleIds": ["art-ed-1", "art-com-1"],
      "articleCount": 2,
      "articles": [ ...populatedArticles ],
      "createdAt": "2026-10-28T12:05:00Z"
    }
  ]
}
```

#### 17. Create Personal Collection
```http
POST /api/reader/collections
Content-Type: application/json

{
  "name": "Cognitive Science Essentials",
  "description": "Private collection for PhD thesis research.",
  "isPrivate": true,
  "articleIds": ["art-ed-1"]
}
```
**Response (HTTP 201):**
```json
{
  "success": true,
  "collection": {
    "id": "pcol-1730554000000",
    "name": "Cognitive Science Essentials",
    "articleIds": ["art-ed-1"],
    "articleCount": 1,
    "articles": [ ...populatedArticle ]
  }
}
```

#### 18. Add Article to Personal Collection
```http
POST /api/reader/collections/:id/articles
Content-Type: application/json

{
  "articleId": "art-ed-2"
}
```
**Response (HTTP 200):**
```json
{
  "success": true,
  "collection": {
    "id": "pcol-1",
    "articleIds": ["art-ed-1", "art-com-1", "art-ed-2"],
    "articleCount": 3,
    "articles": [ ... ]
  }
}
```

#### 19. Remove Article from Personal Collection
```http
DELETE /api/reader/collections/:id/articles/:articleId
```

#### 20. Update or Delete Personal Collection
```http
PUT /api/reader/collections/:id
Content-Type: application/json
{ "name": "Updated Collection Title", "description": "New description" }

DELETE /api/reader/collections/:id
```

---

### Reading History, Progress & Resume Reading

#### 21. Get Reading History
```http
GET /api/reader/history
```
Returns user's reading history sorted with the most recent articles first:
```json
{
  "history": [
    {
      "id": "hist-1",
      "articleId": "art-ed-1",
      "progressPercent": 85,
      "scrollPosition": 0.85,
      "completed": false,
      "readDurationSeconds": 420,
      "lastReadAt": "2026-10-28T11:30:00Z",
      "article": { ...populatedArticle }
    }
  ]
}
```

#### 22. Get Resume Reading (1-Click Resume)
Returns the most recently accessed in-progress article so the frontend can render an instant "Resume Reading" banner:
```http
GET /api/reader/resume
```
**Response (HTTP 200):**
```json
{
  "resume": {
    "id": "hist-1",
    "articleId": "art-ed-1",
    "progressPercent": 85,
    "scrollPosition": 0.85,
    "completed": false,
    "readDurationSeconds": 420,
    "lastReadAt": "2026-10-28T11:30:00Z",
    "article": {
      "id": "art-ed-1",
      "title": "The Sanctuary of Solitary Thought...",
      "coverImageUrl": "https://..."
    }
  }
}
```
*(If the user has no history, returns `{ "resume": null }`).*

#### 23. Save Reading Progress & Scroll Sync
Call as the user reads or scrolls through an article:
```http
POST /api/reader/history
Content-Type: application/json

{
  "articleId": "art-ed-1",
  "progressPercent": 85,
  "scrollPosition": 0.85,
  "durationSeconds": 30,
  "completed": false
}
```

#### 24. Delete Reading History Items
```http
# Remove single article from history
DELETE /api/reader/history/:articleId

# Clear entire reading history
DELETE /api/reader/history
```

#### 25. Bookmarks (Toggle)
```http
GET /api/reader/bookmarks
POST /api/reader/bookmarks
Content-Type: application/json

{ "articleId": "art-ed-1" }
```
**Response:**
```json
{ "success": true, "isBookmarked": true, "bookmarkCount": 413 }
```

---

### Private Highlights & Notes (RLS Protected)

> **DATA PRIVACY GUARANTEE**:
> `highlights_and_notes` rows are encrypted and isolated per user in PostgreSQL. One reader can never view, update, or delete another reader's private notes.

#### 26. Get Private Highlights & Notes
```http
GET /api/reader/highlights
GET /api/reader/highlights?articleId=:articleId
```

#### 27. Create Highlight & Private Note
```http
POST /api/reader/highlights
Content-Type: application/json

{
  "articleId": "art-ed-1",
  "highlightText": "Deep reading functions as an architectural shelter.",
  "color": "amber", // "amber" | "emerald" | "cyan" | "rose" | "violet"
  "privateNote": "Relates to Cal Newport's hypothesis on attentional spaces.",
  "startOffset": 240,
  "endOffset": 295
}
```

#### 28. Delete Highlight
```http
DELETE /api/reader/highlights/:id
```

---

### The Rabbit Hole Discovery Engine

#### 29. Explore the Rabbit Hole
```http
GET /api/discovery/rabbit-hole?articleId=:id&depth=:depth
```
**Query Parameters:**
- `articleId`: ID of the origin story (e.g. `art-ed-1`)
- `depth`: Step depth between `1` and `5` (default: `3`)

**Sample Response (HTTP 200):**
```json
{
  "originArticleId": "art-ed-1",
  "originTitle": "The Sanctuary of Solitary Thought: An Architectural Defense of Deep Reading",
  "originTopic": "Focus & Cognition",
  "depth": 3,
  "totalTrailLength": 2,
  "trail": [
    {
      "articleId": "art-ed-2",
      "title": "Beyond the Token Horizon: How Latent Reasoning Redefines Software Architecture",
      "slug": "beyond-token-horizon-latent-reasoning",
      "summary": "A definitive investigation into how autoregressive models graduate to autonomous reasoning.",
      "contentType": "editorial",
      "categoryName": "Technology & AI",
      "depth": 1,
      "affinityScore": 0.32,
      "connectionReason": "Topic bridge: Neuroplasticity ↔ Cognitive Architecture (deep_dive)"
    }
  ],
  "connectedTopics": [
    {
      "topicSlug": "neuroplasticity",
      "topicName": "Neuroplasticity",
      "affinity": 0.88,
      "relation": "prerequisite"
    }
  ]
}
```

#### 30. Get Personalized Recommendations
Based on the authenticated user's reading history, scroll depth, and bookmarks:
```http
GET /api/discovery/recommendations
```

#### 31. Get Full Topic Graph
```http
GET /api/discovery/topics
```

---

### News Engine & Copyright Compliance

#### How to Render News Articles
When rendering an article with `contentType === 'news'`:
1. Check `article.contentRights`:
   - If `'fair_use_summary'`: Display the summary with publisher attribution and a canonical backlink to the publisher:
     ```tsx
     <div className="publisher-box">
       <p>Originally reported by <strong>{article.sourcePublisher}</strong>.</p>
       <a href={article.originalUrl} target="_blank" rel="noopener noreferrer">
         Read original coverage on {article.sourcePublisher} &rarr;
       </a>
     </div>
     ```
   - If `'licensed_full'`: Full text is authorized and included directly in `article.content`.

#### 32. Trigger On-Demand News Ingestion
```http
POST /api/news/ingest
Content-Type: application/json

{
  "sourceId": "src-1" // Optional: leave empty to poll all active sources
}
```

---

### Community & Writer Applications

#### 33. Apply for Writer Privileges (Readers)
```http
POST /api/community/apply-writer
Content-Type: application/json

{
  "bio": "Fellow in cognitive science exploring neural plasticity and active reading.",
  "sampleUrls": ["https://substack.com/@username/essay-1"],
  "topics": ["neuroplasticity", "deep-work"]
}
```

#### 34. Review Writer Applications (Editors & Admins)
```http
GET /api/community/applications
PUT /api/community/applications/:id
Content-Type: application/json

{
  "status": "approved", // "approved" | "rejected"
  "reviewerNotes": "Strong portfolio in cognitive architecture."
}
```
*(When approved, the user's role is automatically updated from `reader` to `writer`).*

#### 35. Article Comments & Likes
```http
# List active comments
GET /api/community/articles/:id/comments

# Post comment
POST /api/community/articles/:id/comments
Content-Type: application/json
{ "content": "Compelling argument on synaptic myelination." }

# Toggle like
POST /api/community/articles/:id/like
```

#### 36. Submit Abuse or Copyright Report
```http
POST /api/community/reports
Content-Type: application/json

{
  "targetType": "article", // "article" | "comment"
  "targetId": "art-123",
  "reason": "copyright",   // "copyright" | "misinformation" | "spam" | "harassment"
  "details": "Explanation of concern..."
}
```

---

### Editorial Dashboard

#### 37. Get Editorial Dashboard Metrics & Queues
*(Requires `editor` or `admin` role)*
```http
GET /api/editorial/dashboard
```

---

### Health & Live System Verification

#### 38. Service Health Check (Used by Render & Ping Monitors)
```http
GET /health
```
**Response (HTTP 200):**
```json
{
  "status": "ok",
  "service": "readaday-backend",
  "uptimeSeconds": 2400,
  "timestamp": "2026-11-02T15:00:00.000Z",
  "schedulerRunning": true
}
```

#### 39. Live RLS Security Policy Verification
```http
GET /api/system/rls-test
```
Verifies that Private Note Isolation, Feed Separation, Draft Privacy, Privilege Escalation Protection, and Copyright Compliance all report `PASS`.

---

## 5. Production TypeScript API Client

Drop this file into your frontend application (`lib/readaday.ts`):

```typescript
// lib/readaday.ts
import {
  Article,
  ContentType,
  RabbitHoleExplorationResult,
  HighlightAndNote,
  ReadingHistoryEntry,
  UserProfile,
  Category,
  CuratedCollection,
  PersonalCollection,
  AuthorProfile,
} from '../types/readaday';

const API_BASE = process.env.NEXT_PUBLIC_READADAY_API || 'https://readaday-backend.onrender.com';

class ReadadayClient {
  private token: string | null = null;
  private devUserId: string | null = null;

  public setToken(token: string | null) {
    this.token = token;
  }

  // Set testing role identity (e.g. 'usr-reader-1', 'usr-writer-1', 'usr-editor-1', 'usr-admin-1')
  public setDevUserId(userId: string | null) {
    this.devUserId = userId;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (this.devUserId) {
      headers['x-readaday-user-id'] = this.devUserId;
    }

    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}: ${res.statusText}`);
    }
    return data;
  }

  // --- AUTH & PROFILES ---
  public async getProfile() {
    return this.request<{ profile: UserProfile }>('/api/auth/profile');
  }

  public async updateProfile(data: { fullName?: string; bio?: string; website?: string; avatarUrl?: string; settings?: any }) {
    return this.request<{ success: boolean; profile: UserProfile }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public async uploadImage(data: { data?: string; url?: string; filename?: string; type?: 'cover' | 'avatar' | 'inline' }) {
    return this.request<{ success: boolean; url: string; filename: string }>('/api/storage/upload', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // --- CONTENT FEEDS ---
  public async getFeed(feed: ContentType, params: { category?: string; tag?: string; search?: string; page?: number; limit?: number } = {}) {
    const query = new URLSearchParams({
      feed,
      category: params.category || '',
      tag: params.tag || '',
      search: params.search || '',
      page: String(params.page || 1),
      limit: String(params.limit || 10),
    });
    return this.request<{ feed: ContentType; items: Article[]; total: number; totalPages: number }>(`/api/articles?${query.toString()}`);
  }

  public async getCategories() {
    return this.request<{ categories: Category[]; tags: string[] }>('/api/categories');
  }

  public async getArticle(id: string) {
    return this.request<{ article: Article }>(`/api/articles/${id}`);
  }

  public async createArticle(data: Partial<Article> & { title: string; content: string; contentType: ContentType; categorySlug?: string }) {
    return this.request<{ success: boolean; article: Article }>('/api/articles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async updateArticle(id: string, data: Partial<Article>) {
    return this.request<{ success: boolean; article: Article }>(`/api/articles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public async deleteArticle(id: string) {
    return this.request<{ success: boolean; message: string }>(`/api/articles/${id}`, {
      method: 'DELETE',
    });
  }

  public async getMySubmissions(status = 'all') {
    return this.request<{ total: number; articles: Article[] }>(`/api/articles/my-submissions?status=${status}`);
  }

  public async getFollowingFeed() {
    return this.request<{ total: number; articles: Article[] }>('/api/articles/following');
  }

  // --- AUTHOR FOLLOW SYSTEM ---
  public async getAuthorProfile(id: string) {
    return this.request<{ author: AuthorProfile }>(`/api/authors/${id}`);
  }

  public async toggleFollowAuthor(authorId: string) {
    return this.request<{ success: boolean; isFollowing: boolean; followerCount: number; authorId: string }>(`/api/community/authors/${authorId}/follow`, {
      method: 'POST',
    });
  }

  public async unfollowAuthor(authorId: string) {
    return this.request<{ success: boolean; isFollowing: boolean; followerCount: number; authorId: string }>(`/api/community/authors/${authorId}/follow`, {
      method: 'DELETE',
    });
  }

  public async getFollowStatus(authorId: string) {
    return this.request<{ isFollowing: boolean; followerCount: number }>(`/api/community/authors/${authorId}/follow-status`);
  }

  public async getFollowingAuthors() {
    return this.request<{ total: number; authors: AuthorProfile[] }>('/api/community/following');
  }

  // --- COLLECTIONS ---
  public async getCuratedCollections() {
    return this.request<{ collections: CuratedCollection[] }>('/api/editorial/collections');
  }

  public async getPersonalCollections() {
    return this.request<{ collections: PersonalCollection[] }>('/api/reader/collections');
  }

  public async getPersonalCollection(id: string) {
    return this.request<{ collection: PersonalCollection }>(`/api/reader/collections/${id}`);
  }

  public async createPersonalCollection(data: { name: string; description?: string; isPrivate?: boolean; articleIds?: string[] }) {
    return this.request<{ success: boolean; collection: PersonalCollection }>('/api/reader/collections', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async updatePersonalCollection(id: string, data: Partial<PersonalCollection>) {
    return this.request<{ success: boolean; collection: PersonalCollection }>(`/api/reader/collections/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public async deletePersonalCollection(id: string) {
    return this.request<{ success: boolean; message: string }>(`/api/reader/collections/${id}`, {
      method: 'DELETE',
    });
  }

  public async addArticleToPersonalCollection(collectionId: string, articleId: string) {
    return this.request<{ success: boolean; collection: PersonalCollection }>(`/api/reader/collections/${collectionId}/articles`, {
      method: 'POST',
      body: JSON.stringify({ articleId }),
    });
  }

  public async removeArticleFromPersonalCollection(collectionId: string, articleId: string) {
    return this.request<{ success: boolean; collection: PersonalCollection }>(`/api/reader/collections/${collectionId}/articles/${articleId}`, {
      method: 'DELETE',
    });
  }

  // --- DISCOVERY ENGINE ---
  public async exploreRabbitHole(articleId: string, depth = 3) {
    return this.request<RabbitHoleExplorationResult>(`/api/discovery/rabbit-hole?articleId=${articleId}&depth=${depth}`);
  }

  public async getRecommendations() {
    return this.request<{ recommendations: Array<{ article: Article; matchScore: number; reason: string }> }>('/api/discovery/recommendations');
  }

  // --- READER FEATURES ---
  public async getReadingHistory() {
    return this.request<{ history: ReadingHistoryEntry[] }>('/api/reader/history');
  }

  public async resumeReading() {
    return this.request<{ resume: ReadingHistoryEntry | null }>('/api/reader/resume');
  }

  public async syncReadingProgress(data: { articleId: string; progressPercent: number; scrollPosition?: number; durationSeconds?: number; completed?: boolean }) {
    return this.request<{ success: boolean; entry: any }>('/api/reader/history', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async deleteHistoryItem(articleId: string) {
    return this.request<{ success: boolean }>((`/api/reader/history/${articleId}`), {
      method: 'DELETE',
    });
  }

  public async clearReadingHistory() {
    return this.request<{ success: boolean }>('/api/reader/history', {
      method: 'DELETE',
    });
  }

  public async getBookmarks() {
    return this.request<{ bookmarks: Array<{ id: string; articleId: string; article: Article }> }>('/api/reader/bookmarks');
  }

  public async toggleBookmark(articleId: string) {
    return this.request<{ success: boolean; isBookmarked: boolean; bookmarkCount: number }>('/api/reader/bookmarks', {
      method: 'POST',
      body: JSON.stringify({ articleId }),
    });
  }

  public async getHighlights(articleId?: string) {
    const query = articleId ? `?articleId=${articleId}` : '';
    return this.request<{ highlights: HighlightAndNote[] }>(`/api/reader/highlights${query}`);
  }

  public async saveHighlight(data: { articleId: string; highlightText: string; privateNote: string; color?: string; startOffset?: number; endOffset?: number }) {
    return this.request<{ success: boolean; highlight: HighlightAndNote }>('/api/reader/highlights', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async deleteHighlight(id: string) {
    return this.request<{ success: boolean }>(`/api/reader/highlights/${id}`, {
      method: 'DELETE',
    });
  }

  // --- COMMUNITY ---
  public async postComment(articleId: string, content: string) {
    return this.request<{ success: boolean }>((`/api/community/articles/${articleId}/comments`), {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  public async toggleLike(articleId: string) {
    return this.request<{ success: boolean; liked: boolean; likeCount: number }>(`/api/community/articles/${articleId}/like`, {
      method: 'POST',
    });
  }
}

export const readaday = new ReadadayClient();
```

---

## 6. React Hooks for Common UI Patterns

### Hook 1: Fetching Strictly Separated Content Feed

```tsx
// hooks/useArticleFeed.ts
import { useState, useEffect } from 'react';
import { readaday } from '../lib/readaday';
import { Article, ContentType } from '../types/readaday';

export function useArticleFeed(feed: ContentType, category = 'all') {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    readaday.getFeed(feed, { category: category !== 'all' ? category : undefined })
      .then((res) => {
        if (isMounted) setArticles(res.items);
      })
      .catch((err) => {
        if (isMounted) setError(err.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [feed, category]);

  return { articles, loading, error };
}
```

### Hook 2: Resume Reading Banner

```tsx
// hooks/useResumeReading.ts
import { useState, useEffect } from 'react';
import { readaday } from '../lib/readaday';
import { ReadingHistoryEntry } from '../types/readaday';

export function useResumeReading() {
  const [resumeItem, setResumeItem] = useState<ReadingHistoryEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    readaday.resumeReading()
      .then((res) => setResumeItem(res.resume))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return { resumeItem, loading };
}
```

### Hook 3: Follow Author Toggle

```tsx
// hooks/useAuthorFollow.ts
import { useState } from 'react';
import { readaday } from '../lib/readaday';

export function useAuthorFollow(authorId: string, initialFollowing = false, initialCount = 0) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [followerCount, setFollowerCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    try {
      const res = await readaday.toggleFollowAuthor(authorId);
      setIsFollowing(res.isFollowing);
      setFollowerCount(res.followerCount);
    } catch (err) {
      console.error('Failed to toggle follow:', err);
    } finally {
      setLoading(false);
    }
  };

  return { isFollowing, followerCount, toggle, loading };
}
```

---

## 7. Error Handling & Security Reference

| HTTP Status | Error Type | Scenario & Frontend Resolution |
| :--- | :--- | :--- |
| **`400 Bad Request`** | Input Validation Error | Missing fields, title $< 5$ chars, or invalid category. The body contains `{ errors: [{ field, message }] }`. |
| **`401 Unauthorized`** | Missing or Expired Token | User is unauthenticated. Redirect to sign-in modal. |
| **`403 Forbidden`** | Privilege Escalation Block | Reader attempting to publish an article or writer attempting to approve a submission. Guide user to apply for higher role. |
| **`403 Forbidden`** | Draft Privacy Policy | A reader tried to access a draft belonging to someone else. Only authors or editors may view unreviewed drafts. |
| **`404 Not Found`** | Missing Resource | Article, author, collection, or comment ID does not exist. |
| **`500 Server Error`** | System Failure | Check `https://readaday-backend.onrender.com/health` to confirm server status. |
