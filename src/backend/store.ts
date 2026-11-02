/**
 * readAday In-Memory Backend Data Store
 * Simulates normalized PostgreSQL tables with fast indexed lookup,
 * seeded with rich real-world editorial stories, news items, and community essays.
 */

import {
  Article,
  Category,
  Topic,
  TopicRelationship,
  UserProfile,
  CuratedCollection,
  ReadingBookmark,
  ReadingHistory,
  HighlightAndNote,
  PersonalCollection,
  WriterApplication,
  Comment,
  ContentReport,
  NewsSource,
} from './types.ts';

export class BackendStore {
  public users: Map<string, UserProfile> = new Map();
  public categories: Map<string, Category> = new Map();
  public topics: Map<string, Topic> = new Map();
  public topicRelationships: TopicRelationship[] = [];
  public articles: Map<string, Article> = new Map();
  public curatedCollections: Map<string, CuratedCollection> = new Map();
  public readingBookmarks: Map<string, ReadingBookmark> = new Map(); // key: `${userId}_${articleId}`
  public readingHistory: Map<string, ReadingHistory> = new Map(); // key: `${userId}_${articleId}`
  public highlightsAndNotes: Map<string, HighlightAndNote> = new Map();
  public personalCollections: Map<string, PersonalCollection> = new Map();
  public writerApplications: Map<string, WriterApplication> = new Map();
  public comments: Map<string, Comment> = new Map();
  public likes: Set<string> = new Set(); // `${userId}_${articleId}`
  public follows: Set<string> = new Set(); // `${followerId}_${authorId}`
  public contentReports: Map<string, ContentReport> = new Map();
  public newsSources: Map<string, NewsSource> = new Map();

  constructor() {
    this.seedInitialData();
  }

  public seedInitialData() {
    // 1. Users representing key roles
    const seedUsers: UserProfile[] = [
      {
        id: 'usr-admin-1',
        email: 'admin@readaday.internal',
        fullName: 'Alexander Wright',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        role: 'admin',
        bio: 'Editor-in-Chief & Lead Architect at readAday.',
        settings: {
          emailNotifications: true,
          readingTheme: 'dark',
          fontSize: 16,
          preferredCategories: ['focus-cognition', 'technology-ai'],
        },
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
      {
        id: 'usr-editor-1',
        email: 'editor@readaday.internal',
        fullName: 'Claire St. John',
        avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80',
        role: 'editor',
        bio: 'Senior Literary & Technology Editor. Curator of Deep Reading collections.',
        settings: {
          emailNotifications: true,
          readingTheme: 'sepia',
          fontSize: 17,
          preferredCategories: ['literature-essays', 'philosophy-culture'],
        },
        createdAt: '2026-09-05T00:00:00Z',
        updatedAt: '2026-09-05T00:00:00Z',
      },
      {
        id: 'usr-writer-1',
        email: 'writer.marcus@independent.io',
        fullName: 'Marcus Aurel Chen',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
        role: 'writer',
        bio: 'Independent essayist exploring cognitive science, philosophy of mind, and the craftsmanship of writing.',
        settings: {
          emailNotifications: true,
          readingTheme: 'dark',
          fontSize: 15,
          preferredCategories: ['focus-cognition'],
        },
        createdAt: '2026-09-12T00:00:00Z',
        updatedAt: '2026-09-12T00:00:00Z',
      },
      {
        id: 'usr-reader-1',
        email: 'dev.reader@readaday.com',
        fullName: 'Devon Vance',
        avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
        role: 'reader',
        bio: 'Voracious non-fiction reader, researcher in computational neuroscience.',
        settings: {
          emailNotifications: false,
          readingTheme: 'dark',
          fontSize: 16,
          preferredCategories: ['technology-ai', 'science-cosmos'],
        },
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
      },
    ];
    seedUsers.forEach((u) => this.users.set(u.id, u));

    // 2. Categories
    const seedCategories: Category[] = [
      {
        id: 'cat-1',
        slug: 'focus-cognition',
        name: 'Focus & Cognition',
        description: 'Neuroscience of attention, deep work regimes, and mental clarity.',
        icon: 'Brain',
        displayOrder: 1,
      },
      {
        id: 'cat-2',
        slug: 'technology-ai',
        name: 'Technology & AI',
        description: 'Machine intelligence, neural architectures, and software craftsmanship.',
        icon: 'Cpu',
        displayOrder: 2,
      },
      {
        id: 'cat-3',
        slug: 'literature-essays',
        name: 'Literature & Essays',
        description: 'Long-form narrative, literary journalism, and critical essays.',
        icon: 'BookOpen',
        displayOrder: 3,
      },
      {
        id: 'cat-4',
        slug: 'science-cosmos',
        name: 'Science & Cosmos',
        description: 'Quantum foundations, astrophysics, evolutionary biology, and ecology.',
        icon: 'Sparkles',
        displayOrder: 4,
      },
      {
        id: 'cat-5',
        slug: 'philosophy-culture',
        name: 'Philosophy & Culture',
        description: 'Epistemology, ethical dilemmas, phenomenology, and historical perspective.',
        icon: 'Compass',
        displayOrder: 5,
      },
    ];
    seedCategories.forEach((c) => this.categories.set(c.id, c));

    // 3. Topics
    const seedTopics: Topic[] = [
      { id: 'top-1', slug: 'deep-work', name: 'Deep Work', categoryId: 'cat-1' },
      { id: 'top-2', slug: 'neuroplasticity', name: 'Neuroplasticity', categoryId: 'cat-1' },
      { id: 'top-3', slug: 'transformers-llm', name: 'Transformers & LLMs', categoryId: 'cat-2' },
      { id: 'top-4', slug: 'cognitive-architecture', name: 'Cognitive Architecture', categoryId: 'cat-2' },
      { id: 'top-5', slug: 'marginalia-reading', name: 'Marginalia & Active Reading', categoryId: 'cat-3' },
      { id: 'top-6', slug: 'quantum-foundations', name: 'Quantum Foundations', categoryId: 'cat-4' },
      { id: 'top-7', slug: 'stoic-epistemology', name: 'Stoic Epistemology', categoryId: 'cat-5' },
    ];
    seedTopics.forEach((t) => this.topics.set(t.id, t));

    // 4. Topic Relationships (The Rabbit Hole Graph Engine)
    this.topicRelationships = [
      {
        id: 'rel-1',
        sourceTopicSlug: 'deep-work',
        targetTopicSlug: 'neuroplasticity',
        sourceTopicName: 'Deep Work',
        targetTopicName: 'Neuroplasticity',
        affinityScore: 0.88,
        relationshipType: 'prerequisite',
        rationale: 'Deep cognitive states depend upon myelination and sustained synaptic potentiation.',
      },
      {
        id: 'rel-2',
        sourceTopicSlug: 'neuroplasticity',
        targetTopicSlug: 'cognitive-architecture',
        sourceTopicName: 'Neuroplasticity',
        targetTopicName: 'Cognitive Architecture',
        affinityScore: 0.92,
        relationshipType: 'deep_dive',
        rationale: 'Biological neural adaptations directly inform biomimetic computational architectures.',
      },
      {
        id: 'rel-3',
        sourceTopicSlug: 'cognitive-architecture',
        targetTopicSlug: 'transformers-llm',
        sourceTopicName: 'Cognitive Architecture',
        targetTopicName: 'Transformers & LLMs',
        affinityScore: 0.85,
        relationshipType: 'related',
        rationale: 'Attention mechanisms mathematically represent dynamic focus and memory retrieval.',
      },
      {
        id: 'rel-4',
        sourceTopicSlug: 'deep-work',
        targetTopicSlug: 'marginalia-reading',
        sourceTopicName: 'Deep Work',
        targetTopicName: 'Marginalia & Active Reading',
        affinityScore: 0.82,
        relationshipType: 'related',
        rationale: 'Active marginalia serves as an externalized working memory scratchpad.',
      },
      {
        id: 'rel-5',
        sourceTopicSlug: 'cognitive-architecture',
        targetTopicSlug: 'stoic-epistemology',
        sourceTopicName: 'Cognitive Architecture',
        targetTopicName: 'Stoic Epistemology',
        affinityScore: 0.74,
        relationshipType: 'broader',
        rationale: 'Rational judgment boundaries in Epictetus parallel deliberate agency filters.',
      },
      {
        id: 'rel-6',
        sourceTopicSlug: 'quantum-foundations',
        targetTopicSlug: 'cognitive-architecture',
        sourceTopicName: 'Quantum Foundations',
        targetTopicName: 'Cognitive Architecture',
        affinityScore: 0.68,
        relationshipType: 'deep_dive',
        rationale: 'Quantum cognition models non-commuting decision spaces and contextual beliefs.',
      },
    ];

    // 5. Seed Articles - STRICTLY PARTITIONED (Editorial, News, Community)
    const seedArticles: Article[] = [
      // EDITORIAL (Commissioned, in-depth, original readAday long-reads)
      {
        id: 'art-ed-1',
        contentType: 'editorial',
        status: 'published',
        title: 'The Sanctuary of Solitary Thought: An Architectural Defense of Deep Reading',
        slug: 'sanctuary-solitary-thought',
        summary: 'In an attention-fragmented world, deliberate immersion in long-form writing is no longer mere leisure—it is our primary cognitive firewall.',
        content: `
<h2>The Dissolution of Attentional Continuity</h2>
<p>Modern information diets are characterized by chronic micro-interruptions. When our cognitive environment shifts from deliberate, structured paragraphs to hyperlinked notifications, our working memory experiences continuous fragmentation.</p>

<p>Deep reading functions as an architectural shelter. When you engage with a 5,000-word treatise, your prefrontal cortex sustains an unbroken mental model. You are not merely consuming facts; you are co-constructing a coherent internal universe with the author.</p>

<h2>Synaptic Myelination and Quiet Environments</h2>
<p>Neurobiological research confirms that deep attentional focus triggers the production of myelin, the insulating lipid sheath that wraps around neuronal axons. The thicker the myelin sheath, the faster and cleaner electrical impulses travel through that cognitive circuit.</p>

<p>Every uninterrupted hour spent synthesizing complex ideas strengthens our capacity for original thought. Conversely, intermittent grazing trains our brain to anticipate interruption, diminishing our threshold for intellectual discomfort.</p>

<blockquote>"To read deeply is to refuse the tyranny of the urgent in favor of the enduring."</blockquote>
        `.trim(),
        coverImageUrl: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=1200&q=80',
        authorId: 'usr-editor-1',
        authorName: 'Claire St. John',
        authorAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80',
        categoryId: 'cat-1',
        categoryName: 'Focus & Cognition',
        categorySlug: 'focus-cognition',
        tags: ['deep-work', 'neuroplasticity', 'reading', 'cognition'],
        readingTimeMinutes: 7,
        publishedAt: '2026-10-24T09:00:00Z',
        isFeatured: true,
        curationNotes: 'Lead editorial piece for the Deep Focus quarterly issue.',
        contentRights: 'original_reporting',
        fullContentPermitted: true,
        viewCount: 2480,
        likeCount: 684,
        bookmarkCount: 412,
        commentCount: 48,
        createdAt: '2026-10-20T10:00:00Z',
        updatedAt: '2026-10-24T09:00:00Z',
      },
      {
        id: 'art-ed-2',
        contentType: 'editorial',
        status: 'published',
        title: 'Beyond the Token Horizon: How Latent Reasoning Redefines Software Architecture',
        slug: 'beyond-token-horizon-latent-reasoning',
        summary: 'A definitive investigation into how autoregressive models are graduating from syntax autocomplete to autonomous semantic graph synthesis.',
        content: `
<h2>The Shift to Latent Semantic Space</h2>
<p>Early large language models operated essentially on surface statistical correlations. However, test-time compute scaling and multi-step verification loops have fundamentally altered the paradigm.</p>

<p>Software engineers now design systems around probability distributions and verification contracts rather than deterministic branch hierarchies. We explore the architectural principles required to build reliable systems atop probabilistic primitives.</p>
        `.trim(),
        coverImageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
        authorId: 'usr-admin-1',
        authorName: 'Alexander Wright',
        authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        categoryId: 'cat-2',
        categoryName: 'Technology & AI',
        categorySlug: 'technology-ai',
        tags: ['transformers-llm', 'cognitive-architecture', 'systems-design'],
        readingTimeMinutes: 11,
        publishedAt: '2026-10-26T14:30:00Z',
        isFeatured: true,
        contentRights: 'original_reporting',
        fullContentPermitted: true,
        viewCount: 3910,
        likeCount: 1120,
        bookmarkCount: 840,
        commentCount: 72,
        createdAt: '2026-10-25T11:00:00Z',
        updatedAt: '2026-10-26T14:30:00Z',
      },
      {
        id: 'art-ed-3',
        contentType: 'editorial',
        status: 'draft',
        title: 'The Epistemology of Silence: What Wittgenstein Knew About Noise',
        slug: 'epistemology-of-silence-wittgenstein',
        summary: 'Whereof one cannot speak, thereof one must be silent. How early 20th-century linguistic philosophy illuminates modern media overload.',
        content: '<p>Draft in progress examining the Tractatus Logico-Philosophicus in the context of algorithmically generated chatter...</p>',
        authorId: 'usr-editor-1',
        authorName: 'Claire St. John',
        categoryId: 'cat-5',
        categoryName: 'Philosophy & Culture',
        categorySlug: 'philosophy-culture',
        tags: ['stoic-epistemology', 'philosophy', 'language'],
        readingTimeMinutes: 5,
        contentRights: 'original_reporting',
        fullContentPermitted: true,
        viewCount: 0,
        likeCount: 0,
        bookmarkCount: 0,
        commentCount: 0,
        createdAt: '2026-10-30T10:00:00Z',
        updatedAt: '2026-10-30T10:00:00Z',
      },

      // NEWS (Ingested with strict copyright compliance, fair-use summary or licensed full text)
      {
        id: 'art-news-1',
        contentType: 'news',
        status: 'published',
        title: 'Open Frontier Lab Open-Sources 128k Multi-Modal Reasoning Weights',
        slug: 'open-frontier-lab-128k-reasoning-release',
        summary: 'A consortium of academic researchers has published fully permissive weights for a high-efficiency reasoning model with linear attention scaling.',
        content: `
<div class="readaday-news-summary">
  <p class="summary-lead">A consortium of international machine learning researchers announced the public release of OpenFrontier-14B, an open-weights multimodal model featuring constant-memory linear attention across context lengths exceeding 128,000 tokens.</p>
  <div class="publisher-attribution-box p-4 border rounded bg-slate-900/60 mt-4">
    <p class="text-sm text-slate-400">
      <strong>Source Attribution:</strong> Ingested via <em>TechCrunch Wire</em> under fair-use summary standards. In compliance with readAday copyright policy, full proprietary article text is not reproduced without direct syndication agreement.
    </p>
    <a href="https://techcrunch.com/2026/10/28/open-frontier-weights-release" target="_blank" rel="noopener noreferrer" class="mt-2 inline-block text-amber-400 hover:underline text-sm font-medium">
      Read full original coverage on TechCrunch &rarr;
    </a>
  </div>
</div>
        `.trim(),
        coverImageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
        authorId: 'usr-admin-1',
        authorName: 'TechCrunch Wire',
        categoryId: 'cat-2',
        categoryName: 'Technology & AI',
        categorySlug: 'technology-ai',
        tags: ['transformers-llm', 'ai', 'open-source'],
        readingTimeMinutes: 3,
        publishedAt: '2026-10-28T16:15:00Z',
        sourcePublisher: 'TechCrunch Wire',
        originalUrl: 'https://techcrunch.com/2026/10/28/open-frontier-weights-release',
        contentRights: 'fair_use_summary',
        dedupHash: 'hash_9a4f21b7',
        fullContentPermitted: false,
        lastSyncedAt: '2026-10-28T16:20:00Z',
        viewCount: 1820,
        likeCount: 312,
        bookmarkCount: 145,
        commentCount: 19,
        createdAt: '2026-10-28T16:20:00Z',
        updatedAt: '2026-10-28T16:20:00Z',
      },
      {
        id: 'art-news-2',
        contentType: 'news',
        status: 'published',
        title: 'CERN Detects Anomalous Muon Magnetic Precession in Precision Collision Run',
        slug: 'cern-anomalous-muon-magnetic-precession',
        summary: 'Preliminary measurements from the High-Luminosity LHC run suggest a 4.2-sigma tension with Standard Model quantum electrodynamics predictions.',
        content: `
<div class="readaday-news-summary">
  <p class="summary-lead">Physicists analyzing the latest multi-detector runs at CERN have documented an unexpected deviation in the anomalous magnetic moment of muons, potentially opening a doorway toward supersymmetric or dark sector particle candidates.</p>
  <div class="publisher-attribution-box p-4 border rounded bg-slate-900/60 mt-4">
    <p class="text-sm text-slate-400">
      <strong>Source Attribution:</strong> Ingested via <em>Ars Technica Science</em> under fair-use summary standards. Full reporting linked directly.
    </p>
    <a href="https://arstechnica.com/science/2026/10/cern-muon-anomaly" target="_blank" rel="noopener noreferrer" class="mt-2 inline-block text-amber-400 hover:underline text-sm font-medium">
      Read full original coverage on Ars Technica &rarr;
    </a>
  </div>
</div>
        `.trim(),
        coverImageUrl: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=1200&q=80',
        authorId: 'usr-admin-1',
        authorName: 'Ars Technica Science',
        categoryId: 'cat-4',
        categoryName: 'Science & Cosmos',
        categorySlug: 'science-cosmos',
        tags: ['quantum-foundations', 'physics', 'cern'],
        readingTimeMinutes: 4,
        publishedAt: '2026-10-29T11:00:00Z',
        sourcePublisher: 'Ars Technica Science',
        originalUrl: 'https://arstechnica.com/science/2026/10/cern-muon-anomaly',
        contentRights: 'fair_use_summary',
        dedupHash: 'hash_83bc3101',
        fullContentPermitted: false,
        lastSyncedAt: '2026-10-29T11:05:00Z',
        viewCount: 1240,
        likeCount: 290,
        bookmarkCount: 160,
        commentCount: 22,
        createdAt: '2026-10-29T11:05:00Z',
        updatedAt: '2026-10-29T11:05:00Z',
      },

      // COMMUNITY (Submitted by approved writers, vetted by editorial moderation)
      {
        id: 'art-com-1',
        contentType: 'community',
        status: 'published',
        title: 'The Art of the Margin: How Pen Marks in 19th-Century Hardcovers Changed My Thinking',
        slug: 'art-of-the-margin-marginalia-reflections',
        summary: 'Reading second-hand volumes is a dialogue across centuries. Here is what 500 hand-penciled annotations taught me about intellectual humility.',
        content: `
<h2>The Ink Ghost in the Margin</h2>
<p>When you purchase an old copy of William James's <em>The Principles of Psychology</em> from a damp cellar bookstore, you are rarely the sole inhabitant of that volume.</p>

<p>In my 1918 edition, an anonymous student had drawn fierce ink asterisks beside James's chapter on the Stream of Consciousness. Beside the passage where James notes that "consciousness is a continuous river," the previous reader had scribbled: <em>"Then what is the bridge?"</em></p>

<p>That single scribbled question remained in my thoughts for two months. Marginalia transforms passive consumption into active interrogation.</p>
        `.trim(),
        coverImageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1200&q=80',
        authorId: 'usr-writer-1',
        authorName: 'Marcus Aurel Chen',
        authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
        categoryId: 'cat-3',
        categoryName: 'Literature & Essays',
        categorySlug: 'literature-essays',
        tags: ['marginalia-reading', 'books', 'philosophy'],
        readingTimeMinutes: 6,
        publishedAt: '2026-10-27T18:00:00Z',
        contentRights: 'original_reporting',
        fullContentPermitted: true,
        viewCount: 1540,
        likeCount: 480,
        bookmarkCount: 260,
        commentCount: 35,
        createdAt: '2026-10-25T15:00:00Z',
        updatedAt: '2026-10-27T18:00:00Z',
      },
      {
        id: 'art-com-2',
        contentType: 'community',
        status: 'pending_review',
        title: 'Building a Micro-Operating System on RISC-V: Notes on Bare Metal Minimalism',
        slug: 'micro-os-riscv-bare-metal-notes',
        summary: 'A practitioner log detailing bootloaders, page table configuration, and context switching in 1,200 lines of Rust.',
        content: '<p>A technical essay submitted for community editorial review...</p>',
        authorId: 'usr-writer-1',
        authorName: 'Marcus Aurel Chen',
        authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
        categoryId: 'cat-2',
        categoryName: 'Technology & AI',
        categorySlug: 'technology-ai',
        tags: ['systems-design', 'hardware', 'rust'],
        readingTimeMinutes: 12,
        contentRights: 'original_reporting',
        fullContentPermitted: true,
        viewCount: 0,
        likeCount: 0,
        bookmarkCount: 0,
        commentCount: 0,
        createdAt: '2026-10-31T09:00:00Z',
        updatedAt: '2026-10-31T09:00:00Z',
      },
    ];
    seedArticles.forEach((a) => this.articles.set(a.id, a));

    // 6. Curated Editorial Collections
    const seedCollections: CuratedCollection[] = [
      {
        id: 'col-1',
        title: 'Cognitive Architecture & The Unbroken Mind',
        slug: 'cognitive-architecture-unbroken-mind',
        description: 'A hand-curated anthology on attentional preservation, neural plasticity, and deliberate learning.',
        coverImageUrl: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=800&q=80',
        createdBy: 'usr-editor-1',
        isEditorialChoice: true,
        articleIds: ['art-ed-1', 'art-com-1'],
        createdAt: '2026-10-28T00:00:00Z',
      },
      {
        id: 'col-2',
        title: 'Frontiers of Synthetic Intelligence',
        slug: 'frontiers-synthetic-intelligence',
        description: 'The definitive collection exploring the intersection of reasoning models and cognitive theory.',
        coverImageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
        createdBy: 'usr-admin-1',
        isEditorialChoice: true,
        articleIds: ['art-ed-2', 'art-news-1'],
        createdAt: '2026-10-29T00:00:00Z',
      },
    ];
    seedCollections.forEach((c) => this.curatedCollections.set(c.id, c));

    // 7. Seed Bookmarks & Reading Progress for Devon Vance (usr-reader-1)
    this.readingBookmarks.set('usr-reader-1_art-ed-1', {
      id: 'bm-1',
      userId: 'usr-reader-1',
      articleId: 'art-ed-1',
      createdAt: '2026-10-25T10:00:00Z',
    });
    this.readingBookmarks.set('usr-reader-1_art-com-1', {
      id: 'bm-2',
      userId: 'usr-reader-1',
      articleId: 'art-com-1',
      createdAt: '2026-10-28T12:00:00Z',
    });

    this.readingHistory.set('usr-reader-1_art-ed-1', {
      id: 'hist-1',
      userId: 'usr-reader-1',
      articleId: 'art-ed-1',
      progressPercent: 85,
      scrollPosition: 0.85,
      completed: false,
      readDurationSeconds: 420,
      lastReadAt: '2026-10-28T11:30:00Z',
    });

    // 8. Highlights & Private Notes (Protected by RLS)
    this.highlightsAndNotes.set('hn-1', {
      id: 'hn-1',
      userId: 'usr-reader-1',
      articleId: 'art-ed-1',
      highlightText: 'Deep reading functions as an architectural shelter.',
      color: 'amber',
      startOffset: 240,
      endOffset: 295,
      privateNote: 'Relates to Cal Newports hypothesis on attentional spaces. Must re-read Deep Work Chapter 3.',
      createdAt: '2026-10-28T11:15:00Z',
      updatedAt: '2026-10-28T11:15:00Z',
    });

    // 9. Personal Reading Collections
    this.personalCollections.set('pcol-1', {
      id: 'pcol-1',
      userId: 'usr-reader-1',
      name: 'Weekend Research Sprint',
      description: 'Articles on attentional focus and active marginalia.',
      isPrivate: true,
      articleIds: ['art-ed-1', 'art-com-1'],
      createdAt: '2026-10-28T12:05:00Z',
    });
    this.personalCollections.set('pcol-admin-1', {
      id: 'pcol-admin-1',
      userId: 'usr-admin-1',
      name: 'Essential Deep Dives',
      description: 'Curated personal reading on architectural cognition and machine reasoning.',
      isPrivate: false,
      articleIds: ['art-ed-1', 'art-ed-2'],
      createdAt: '2026-10-30T10:00:00Z',
    });

    // Seed follow relationships
    this.follows.add('usr-reader-1_usr-writer-1');
    this.follows.add('usr-admin-1_usr-writer-1');

    // 10. Writer Applications
    this.writerApplications.set('app-1', {
      id: 'app-1',
      userId: 'usr-reader-1',
      userName: 'Devon Vance',
      userEmail: 'dev.reader@readaday.com',
      sampleUrls: ['https://github.com/vance-research', 'https://substack.com/@vance'],
      bio: 'Postdoctoral fellow studying biological neural pathways and computational graph heuristics.',
      topics: ['neuroplasticity', 'cognitive-architecture'],
      status: 'pending',
      createdAt: '2026-10-31T08:00:00Z',
    });

    // 11. Comments
    this.comments.set('comm-1', {
      id: 'comm-1',
      articleId: 'art-ed-1',
      userId: 'usr-writer-1',
      userName: 'Marcus Aurel Chen',
      userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      userRole: 'writer',
      content: 'The point regarding synaptic myelination mirrors what Csíkszentmihályi described as psychic energy concentration. Essential essay.',
      status: 'active',
      createdAt: '2026-10-25T11:20:00Z',
    });

    // 12. News Sources
    this.newsSources.set('src-1', {
      id: 'src-1',
      name: 'TechCrunch Wire',
      rssUrl: 'https://techcrunch.com/feed/',
      categorySlug: 'technology-ai',
      licenseType: 'fair_use_summary',
      isActive: true,
      fetchIntervalMinutes: 30,
      lastFetchedAt: '2026-10-31T07:30:00Z',
      totalIngested: 42,
    });
    this.newsSources.set('src-2', {
      id: 'src-2',
      name: 'Ars Technica Science',
      rssUrl: 'https://feeds.arstechnica.com/arstechnica/science',
      categorySlug: 'science-cosmos',
      licenseType: 'fair_use_summary',
      isActive: true,
      fetchIntervalMinutes: 60,
      lastFetchedAt: '2026-10-31T07:00:00Z',
      totalIngested: 28,
    });
    this.newsSources.set('src-3', {
      id: 'src-3',
      name: 'readAday Syndicate Dispatch',
      rssUrl: 'https://syndicate.readaday.internal/wire.xml',
      categorySlug: 'technology-ai',
      licenseType: 'licensed_full',
      isActive: true,
      fetchIntervalMinutes: 15,
      lastFetchedAt: '2026-10-31T08:15:00Z',
      totalIngested: 12,
    });
  }
}

// Global singleton instance
export const store = new BackendStore();
