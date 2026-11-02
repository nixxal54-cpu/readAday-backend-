# readAday Backend & Database Architecture

Production-grade PostgreSQL & Supabase backend architecture for **readAday**, the premium digital reading and content discovery platform.

---

## 1. Database Architecture Overview

The database is built on PostgreSQL with Row Level Security (RLS) enabled across all public tables, strict role-based access control, and dedicated indexing for the Rabbit Hole graph discovery engine.

```
                    ┌─────────────────────────┐
                    │       auth.users        │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │     public.profiles     │ (Roles: reader, writer, editor, admin)
                    └────────────┬────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ public.articles  │    │ reading_history  │    │ highlights_notes │
│ (strictly partitioned │ │ & bookmarks      │    │ (STRICT PRIVATE   │
│  editorial, news,│    │                  │    │  USER ISOLATION) │
│  community)      │    └──────────────────┘    └──────────────────┘
└────────┬─────────┘
         │
         ▼
┌─────────────────────────┐
│   topic_relationships   │ ◄─── Foundation for Rabbit Hole Graph Engine
│   & topics / categories │
└─────────────────────────┘
```

---

## 2. Strict Content Feed Separation

readAday enforces complete partition between three content types:
1. **Editorial (`content_type = 'editorial'`)**: In-depth commissioned essays, original investigative pieces, and curated anthologies. Authored exclusively by Editors and Admins.
2. **News (`content_type = 'news'`)**: Ingested wire feeds with copyright rights compliance, fair-use summaries, and canonical source attribution.
3. **Community (`content_type = 'community'`)**: Submitted by approved independent writers, reviewed via editorial moderation queue.

> **Zero Cross-Contamination Rule**:
> Feed queries require explicit `WHERE content_type = :type` filtering, validated by backend integrity assertions. An editorial reader will never see community submissions or automated news wire items in their editorial feed.

---

## 3. Article Workflow Lifecycle

```
   ┌─────────┐
   │  DRAFT  │
   └────┬────┘
        │ (Submit for Review)
        ▼
┌─────────────────┐
│ PENDING_REVIEW  │ ◄─── Editorial Moderation Queue
└───────┬─────────┘
        │
   ┌────┴──────────────┐
   │ (Approve)         │ (Reject)
   ▼                   ▼
┌───────────┐     ┌───────────┐
│ PUBLISHED │     │ REJECTED  │
└─────┬─────┘     └─────┬─────┘
      │ (Archive)       │ (Revise)
      ▼                 ▼
┌───────────┐     ┌───────────┐
│ ARCHIVED  │     │   DRAFT   │
└───────────┘     └───────────┘
```

---

## 4. News Engine & Copyright Rights Protocol

To prevent intellectual property infringement:
- **`licensed_full`**: Only stored in full text when an authorized syndication license or direct publisher agreement exists.
- **`fair_use_summary`**: For standard RSS feeds, readAday truncates to an editorial summary, embeds publisher attribution, and links to the original canonical story URL.
- **Deduplication**: Ingested stories generate a deterministic FNV-1a / SHA-256 hash from the normalized canonical URL and title. Duplicate stories are logged and skipped automatically.

---

## 5. Row Level Security (RLS) Policy Matrix

| Table | SELECT Policy | INSERT Policy | UPDATE Policy | DELETE Policy |
| :--- | :--- | :--- | :--- | :--- |
| `profiles` | Public read | System (via Auth trigger) | Self (`auth.uid() = id`), no self-escalation | Admin only |
| `articles` | Published = public; Draft/Pending = author OR editor/admin | Writer (community only), Editor/Admin (any) | Author (drafts), Editor/Admin (any) | Author (draft only) OR Admin |
| `highlights_and_notes` | **Strict self only (`auth.uid() = user_id`)** | **Strict self only** | **Strict self only** | **Strict self only** |
| `reading_bookmarks` | Self only (`auth.uid() = user_id`) | Self only | Self only | Self only |
| `reading_history` | Self only (`auth.uid() = user_id`) | Self only | Self only | Self only |
| `writer_applications` | Self OR editor/admin | Self (`status = 'pending'`) | Editor/Admin (review) | Admin |
| `comments` | Active = public; flagged = author/editor | Authenticated users | Self OR editor/admin | Self OR editor/admin |
| `content_reports` | Reporter OR editor/admin | Authenticated users | Editor/Admin only | Admin |

---

## 6. Frontend Integration Guide (Supabase JS Client)

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

// 1. Fetch Strict Editorial Feed
export async function getEditorialFeed(category?: string) {
  let query = supabase
    .from('articles')
    .select('id, title, slug, summary, reading_time_minutes, published_at, cover_image_url, author_name, tags')
    .eq('content_type', 'editorial')
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (category && category !== 'all') {
    query = query.eq('category_slug', category);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// 2. Fetch Isolated Private Highlights & Notes
export async function getMyPrivateNotes(articleId: string) {
  const { data, error } = await supabase
    .from('highlights_and_notes')
    .select('*')
    .eq('article_id', articleId);
  // RLS automatically filters only the calling user's rows
  if (error) throw error;
  return data;
}

// 3. Explore Rabbit Hole
export async function fetchRabbitHole(articleId: string, depth = 3) {
  const response = await fetch(`/api/discovery/rabbit-hole?articleId=${articleId}&depth=${depth}`);
  return await response.json();
}
```

---

## 7. Migration Files

- Migration Schema: `/supabase/migrations/20261101000000_readaday_schema.sql`
- Initial Seed Data: `/supabase/seed.sql`
- Edge Functions:
  - `/supabase/functions/ingest-news/index.ts`
  - `/supabase/functions/scheduled-publish/index.ts`
  - `/supabase/functions/rabbit-hole/index.ts`
