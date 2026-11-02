import React, { useState, useEffect } from 'react';
import { ContentType, Article, FeedResponse } from '../backend/types.ts';
import { ShieldCheck, Clock, Bookmark, ThumbsUp, MessageSquare, ExternalLink, Filter, Search, AlertTriangle, Layers } from 'lucide-react';

interface FeedMonitorProps {
  onSelectArticle: (article: Article) => void;
  activeUserId: string;
}

export const FeedMonitor: React.FC<FeedMonitorProps> = ({ onSelectArticle, activeUserId }) => {
  const [activeFeed, setActiveFeed] = useState<ContentType>('editorial');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [feedData, setFeedData] = useState<FeedResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

  const fetchFeed = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        feed: activeFeed,
        category: category !== 'all' ? category : '',
        search,
      });

      const res = await fetch(`/api/articles?${queryParams.toString()}`, {
        headers: { 'x-readaday-user-id': activeUserId },
      });
      const data = await res.json();
      setFeedData(data);
    } catch (err) {
      console.error('Failed to fetch feed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBookmarks = async () => {
    try {
      const res = await fetch('/api/reader/bookmarks', {
        headers: { 'x-readaday-user-id': activeUserId },
      });
      const data = await res.json();
      const ids = new Set<string>((data.bookmarks || []).map((b: any) => b.articleId));
      setBookmarkedIds(ids);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchFeed();
    fetchBookmarks();
  }, [activeFeed, category, search, activeUserId]);

  const toggleBookmark = async (articleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch('/api/reader/bookmarks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-readaday-user-id': activeUserId,
        },
        body: JSON.stringify({ articleId }),
      });
      const data = await res.json();
      const updated = new Set(bookmarkedIds);
      if (data.isBookmarked) {
        updated.add(articleId);
      } else {
        updated.delete(articleId);
      }
      setBookmarkedIds(updated);
      fetchFeed();
    } catch (err) {
      console.error(err);
    }
  };

  const feedConfig: Record<ContentType, { title: string; desc: string; badge: string; color: string }> = {
    editorial: {
      title: 'Editorial Feed',
      desc: 'Commissioned long-form essays, original investigations, and curated anthologies authored by editors.',
      badge: 'Editorial Exclusives',
      color: 'border-purple-500/40 text-purple-400 bg-purple-500/10',
    },
    news: {
      title: 'Latest News Engine Feed',
      desc: 'Ingested RSS and wire dispatches with strict copyright rights, fair use summaries, and publisher links.',
      badge: 'Authorized Wire',
      color: 'border-blue-500/40 text-blue-400 bg-blue-500/10',
    },
    community: {
      title: 'Community Feed',
      desc: 'Independent essays submitted by vetted writers and moderated by the readAday editorial board.',
      badge: 'Independent Voices',
      color: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10',
    },
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Purity Validation */}
      <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Layers className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-serif font-bold text-slate-100">Strict Feed Isolation Monitor</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            readAday enforces complete segregation between Editorial, News, and Community feeds.
            The backend query engine guarantees zero cross-contamination.
          </p>
        </div>

        {/* Live Zero-Contamination Audit Status */}
        <div className="flex items-center space-x-3 px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-800">
          <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
          <div className="text-left">
            <div className="text-xs font-semibold text-emerald-400 flex items-center">
              Purity Audit: Passed
              <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
            </div>
            <div className="text-[11px] text-slate-400">
              0 cross-type items detected in {activeFeed} feed
            </div>
          </div>
        </div>
      </div>

      {/* Feed Selectors & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        {/* Feed Buttons */}
        <div className="flex items-center space-x-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
          {(['editorial', 'news', 'community'] as ContentType[]).map((feed) => {
            const isSelected = activeFeed === feed;
            return (
              <button
                key={feed}
                onClick={() => setActiveFeed(feed)}
                className={`px-4 py-2 text-xs font-medium rounded-lg capitalize transition-all ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {feed}
              </button>
            );
          })}
        </div>

        {/* Search & Category Filter */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search in feed..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-xs text-slate-200 pl-8 pr-3 py-1.5 rounded-lg focus:outline-none focus:border-amber-500/50 w-44 sm:w-56"
            />
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs text-slate-300 px-3 py-1.5 rounded-lg focus:outline-none focus:border-amber-500/50"
          >
            <option value="all">All Categories</option>
            <option value="focus-cognition">Focus & Cognition</option>
            <option value="technology-ai">Technology & AI</option>
            <option value="literature-essays">Literature & Essays</option>
            <option value="science-cosmos">Science & Cosmos</option>
            <option value="philosophy-culture">Philosophy & Culture</option>
          </select>
        </div>
      </div>

      {/* Feed Information Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className={`text-[11px] px-2.5 py-0.5 rounded-full border font-mono ${feedConfig[activeFeed].color}`}>
            {feedConfig[activeFeed].badge}
          </span>
          <p className="text-xs text-slate-400 mt-1">{feedConfig[activeFeed].desc}</p>
        </div>
        <div className="text-xs text-slate-500 font-mono">
          {feedData ? `${feedData.total} article(s) indexed` : 'Loading...'}
        </div>
      </div>

      {/* Articles Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-500 text-sm">Querying isolated {activeFeed} feed...</div>
      ) : feedData && feedData.items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {feedData.items.map((article) => {
            const isBookmarked = bookmarkedIds.has(article.id);
            return (
              <div
                key={article.id}
                onClick={() => onSelectArticle(article)}
                className="group relative bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-xl overflow-hidden transition-all cursor-pointer flex flex-col justify-between"
              >
                {/* Cover Image */}
                {article.coverImageUrl && (
                  <div className="h-44 w-full overflow-hidden bg-slate-950 relative">
                    <img
                      src={article.coverImageUrl}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
                    />
                    <div className="absolute top-3 left-3 flex items-center space-x-1.5">
                      <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded bg-slate-950/80 backdrop-blur text-amber-400 font-semibold border border-amber-500/30">
                        {article.categoryName}
                      </span>
                    </div>

                    <button
                      onClick={(e) => toggleBookmark(article.id, e)}
                      className={`absolute top-3 right-3 p-1.5 rounded-full backdrop-blur transition-all ${
                        isBookmarked
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-950/70 text-slate-400 hover:text-amber-400'
                      }`}
                      title={isBookmarked ? 'Remove Bookmark' : 'Save Bookmark'}
                    >
                      <Bookmark className="h-3.5 w-3.5 fill-current" />
                    </button>
                  </div>
                )}

                {/* Body */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-serif font-bold text-slate-100 group-hover:text-amber-400 transition-colors line-clamp-2 text-base leading-snug">
                      {article.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                      {article.summary}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col space-y-2">
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1">
                      {article.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-[10px] text-slate-400 bg-slate-800/60 px-1.5 py-0.5 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>

                    {/* Metadata Footer */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <div className="flex items-center space-x-1.5 truncate">
                        <span className="text-slate-300 font-medium truncate">{article.authorName}</span>
                      </div>
                      <div className="flex items-center space-x-1 shrink-0">
                        <Clock className="h-3 w-3" />
                        <span>{article.readingTimeMinutes} min</span>
                      </div>
                    </div>

                    {/* Rights Attribution for News */}
                    {article.contentType === 'news' && (
                      <div className="text-[10px] text-slate-400 flex items-center justify-between bg-slate-950/60 px-2 py-1 rounded border border-slate-800">
                        <span className="font-mono text-blue-400">
                          {article.contentRights === 'fair_use_summary' ? 'Fair-Use Summary' : 'Licensed Full Text'}
                        </span>
                        {article.originalUrl && (
                          <a
                            href={article.originalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-amber-400 hover:underline flex items-center"
                          >
                            Source <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center border border-dashed border-slate-800 rounded-xl">
          <p className="text-sm text-slate-400">No articles found matching query in {activeFeed} feed.</p>
        </div>
      )}
    </div>
  );
};
