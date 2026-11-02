import React, { useState, useEffect } from 'react';
import { Article, UserRole, CuratedCollection } from '../backend/types.ts';
import { PenTool, CheckCircle, XCircle, Clock, Calendar, Sparkles, FolderPlus, Send, AlertCircle } from 'lucide-react';

interface EditorialDeskProps {
  activeRole: UserRole;
  activeUserId: string;
  onRefreshFeed: () => void;
}

export const EditorialDesk: React.FC<EditorialDeskProps> = ({ activeRole, activeUserId, onRefreshFeed }) => {
  const isPrivileged = activeRole === 'editor' || activeRole === 'admin';
  const isWriter = activeRole === 'writer';

  const [activeTab, setActiveTab] = useState<'create' | 'review' | 'scheduled' | 'collections'>('create');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [collections, setCollections] = useState<CuratedCollection[]>([]);

  // Form State
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [contentType, setContentType] = useState<'editorial' | 'community'>(isPrivileged ? 'editorial' : 'community');
  const [categorySlug, setCategorySlug] = useState('focus-cognition');
  const [tagsInput, setTagsInput] = useState('deep-work, focus');
  const [scheduledFor, setScheduledFor] = useState('');
  const [publishImmediately, setPublishImmediately] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New Collection Form
  const [colTitle, setColTitle] = useState('');
  const [colDesc, setColDesc] = useState('');

  const fetchDashboard = async () => {
    if (!isPrivileged) return;
    try {
      const res = await fetch('/api/editorial/dashboard', {
        headers: { 'x-readaday-user-id': activeUserId },
      });
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCollections = async () => {
    try {
      const res = await fetch('/api/editorial/collections', {
        headers: { 'x-readaday-user-id': activeUserId },
      });
      const data = await res.json();
      setCollections(data.collections || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchCollections();
  }, [activeRole, activeUserId]);

  const handleCreateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);

    const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);

    try {
      const res = await fetch('/api/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-readaday-user-id': activeUserId,
        },
        body: JSON.stringify({
          title,
          summary,
          content,
          contentType: isPrivileged ? contentType : 'community',
          categorySlug,
          tags,
          scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : undefined,
          publishImmediately,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create article');
      }

      setStatusMessage({
        type: 'success',
        text: `Article "${data.article.title}" created with status [${data.article.status.toUpperCase()}].`,
      });

      // Reset form
      setTitle('');
      setSummary('');
      setContent('');
      fetchDashboard();
      onRefreshFeed();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWorkflowTransition = async (articleId: string, targetStatus: string) => {
    try {
      const res = await fetch(`/api/articles/${articleId}/workflow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-readaday-user-id': activeUserId,
        },
        body: JSON.stringify({ targetStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      fetchDashboard();
      onRefreshFeed();
    } catch (err: any) {
      alert(`Workflow error: ${err.message}`);
    }
  };

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!colTitle) return;

    try {
      const res = await fetch('/api/editorial/collections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-readaday-user-id': activeUserId,
        },
        body: JSON.stringify({
          title: colTitle,
          description: colDesc,
          articleIds: ['art-ed-1', 'art-com-1'],
        }),
      });
      if (res.ok) {
        setColTitle('');
        setColDesc('');
        fetchCollections();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isPrivileged && !isWriter) {
    return (
      <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
        <AlertCircle className="h-10 w-10 text-amber-500/80 mx-auto mb-3" />
        <h3 className="text-base font-serif font-bold text-slate-200">Editorial & Writer Desk Access Restricted</h3>
        <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto">
          Your current active role is <strong className="text-emerald-400">Reader</strong>. In readAday, readers cannot create editorial articles or publish to feeds.
        </p>
        <p className="text-xs text-slate-500 mt-2">
          Use the <strong>Role Switcher</strong> in the top header to select <strong>Writer</strong>, <strong>Editor</strong>, or <strong>Admin</strong> to test these workflows.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('create')}
          className={`flex items-center space-x-2 text-xs font-medium px-3.5 py-2 rounded-lg transition-all ${
            activeTab === 'create'
              ? 'bg-amber-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <PenTool className="h-3.5 w-3.5" />
          <span>Write / Create Article</span>
        </button>

        {isPrivileged && (
          <>
            <button
              onClick={() => setActiveTab('review')}
              className={`flex items-center space-x-2 text-xs font-medium px-3.5 py-2 rounded-lg transition-all ${
                activeTab === 'review'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <CheckCircle className="h-3.5 w-3.5" />
              <span>Pending Review Queue</span>
              {dashboardData?.metrics.pendingReviewCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                  {dashboardData.metrics.pendingReviewCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('scheduled')}
              className={`flex items-center space-x-2 text-xs font-medium px-3.5 py-2 rounded-lg transition-all ${
                activeTab === 'scheduled'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Scheduled Publishing</span>
              {dashboardData?.metrics.scheduledCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-blue-500 text-white text-[10px] font-bold">
                  {dashboardData.metrics.scheduledCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('collections')}
              className={`flex items-center space-x-2 text-xs font-medium px-3.5 py-2 rounded-lg transition-all ${
                activeTab === 'collections'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Curated Collections</span>
            </button>
          </>
        )}
      </div>

      {/* CREATE TAB */}
      {activeTab === 'create' && (
        <form onSubmit={handleCreateArticle} className="space-y-4 max-w-3xl bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
          <div>
            <h3 className="text-base font-serif font-bold text-slate-100">
              {isPrivileged ? 'Create Editorial or News Article' : 'Submit Community Article'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {isPrivileged
                ? 'Editors can publish immediately to Editorial feed or set scheduled publishing dates.'
                : 'Writers submit articles for editorial review. Once approved, they appear in Community feed.'}
            </p>
          </div>

          {statusMessage && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center space-x-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              }`}
            >
              <span>{statusMessage.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Content Type</label>
              {isPrivileged ? (
                <select
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 p-2.5 rounded-lg focus:outline-none focus:border-amber-500"
                >
                  <option value="editorial">Editorial (Commissioned / Lead Issue)</option>
                  <option value="community">Community (Independent Essay)</option>
                </select>
              ) : (
                <input
                  type="text"
                  disabled
                  value="Community (Writer Submissions)"
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-400 p-2.5 rounded-lg"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
              <select
                value={categorySlug}
                onChange={(e) => setCategorySlug(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 p-2.5 rounded-lg focus:outline-none focus:border-amber-500"
              >
                <option value="focus-cognition">Focus & Cognition</option>
                <option value="technology-ai">Technology & AI</option>
                <option value="literature-essays">Literature & Essays</option>
                <option value="science-cosmos">Science & Cosmos</option>
                <option value="philosophy-culture">Philosophy & Culture</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Article Title</label>
            <input
              type="text"
              required
              placeholder="e.g. The Neurobiology of Quiet Spaces: Why Silence Rebuilds the Mind"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 p-2.5 rounded-lg focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Summary (1-2 sentences)</label>
            <textarea
              required
              rows={2}
              placeholder="A concise synthesis of the essay's core hypothesis..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 p-2.5 rounded-lg focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Content Body (Rich HTML / Markdown)</label>
            <textarea
              required
              rows={6}
              placeholder="<h2>The Architecture of Thought</h2><p>Begin writing the long-form analysis...</p>"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 p-2.5 rounded-lg font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Tags (comma separated)</label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 p-2.5 rounded-lg focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Publishing Controls for Editors */}
          {isPrivileged && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <span className="text-xs font-semibold text-amber-400 block">Editorial Publishing Controls</span>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={publishImmediately}
                    onChange={(e) => setPublishImmediately(e.target.checked)}
                    className="rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                  />
                  <span>Publish immediately to {contentType} feed</span>
                </label>

                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-400">Or Schedule for:</span>
                  <input
                    type="datetime-local"
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                    className="bg-slate-900 border border-slate-800 text-xs text-slate-300 px-2 py-1 rounded"
                  />
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center justify-center space-x-2 w-full sm:w-auto px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            <span>
              {isSubmitting
                ? 'Processing...'
                : isPrivileged
                ? publishImmediately
                  ? 'Publish Article Live'
                  : scheduledFor
                  ? 'Schedule Article'
                  : 'Save Article as Draft'
                : 'Submit for Editorial Review'}
            </span>
          </button>
        </form>
      )}

      {/* REVIEW QUEUE TAB */}
      {activeTab === 'review' && isPrivileged && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-serif font-bold text-slate-200">
              Community & Writer Review Queue ({dashboardData?.queues.pendingReview?.length || 0})
            </h3>
            <span className="text-xs text-slate-500">Only Editors and Admins have approval authority</span>
          </div>

          {dashboardData?.queues.pendingReview?.length > 0 ? (
            <div className="space-y-3">
              {dashboardData.queues.pendingReview.map((art: Article) => (
                <div
                  key={art.id}
                  className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 uppercase font-mono">
                        {art.contentType}
                      </span>
                      <span className="text-xs text-slate-400">By {art.authorName}</span>
                    </div>
                    <h4 className="font-serif font-bold text-slate-100 text-sm">{art.title}</h4>
                    <p className="text-xs text-slate-400 line-clamp-2 max-w-2xl">{art.summary}</p>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => handleWorkflowTransition(art.id, 'published')}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 font-bold text-xs transition-all border border-emerald-500/30"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>Approve & Publish</span>
                    </button>
                    <button
                      onClick={() => handleWorkflowTransition(art.id, 'rejected')}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white font-medium text-xs transition-all border border-rose-500/30"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl">
              <CheckCircle className="h-8 w-8 text-emerald-500/40 mx-auto mb-2" />
              <p className="text-xs text-slate-400">All submissions have been reviewed. Queue is clear.</p>
            </div>
          )}
        </div>
      )}

      {/* SCHEDULED PUBLISHING TAB */}
      {activeTab === 'scheduled' && isPrivileged && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-serif font-bold text-slate-200">
              Scheduled Articles ({dashboardData?.queues.scheduled?.length || 0})
            </h3>
            <button
              onClick={async () => {
                await fetch('/api/system/scheduler/run-publish', { method: 'POST' });
                fetchDashboard();
                onRefreshFeed();
              }}
              className="text-xs px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium"
            >
              Run Scheduler Worker Now
            </button>
          </div>

          {dashboardData?.queues.scheduled?.length > 0 ? (
            <div className="space-y-3">
              {dashboardData.queues.scheduled.map((art: Article) => (
                <div key={art.id} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-amber-400 font-mono">
                      Scheduled for: {new Date(art.scheduledFor!).toLocaleString()}
                    </div>
                    <h4 className="font-serif font-bold text-slate-100 text-sm mt-0.5">{art.title}</h4>
                  </div>
                  <button
                    onClick={() => handleWorkflowTransition(art.id, 'published')}
                    className="text-xs px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded hover:bg-amber-500 hover:text-slate-950 transition-all font-bold"
                  >
                    Publish Immediately
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl">
              <Calendar className="h-8 w-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400">No articles currently scheduled for future release.</p>
            </div>
          )}
        </div>
      )}

      {/* COLLECTIONS TAB */}
      {activeTab === 'collections' && isPrivileged && (
        <div className="space-y-6">
          <form onSubmit={handleCreateCollection} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h4 className="text-xs font-semibold text-amber-400 flex items-center">
              <FolderPlus className="h-4 w-4 mr-1.5" />
              Curate New Editorial Collection
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Collection Title"
                value={colTitle}
                onChange={(e) => setColTitle(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs text-slate-200 p-2 rounded"
              />
              <input
                type="text"
                placeholder="Description / Theme"
                value={colDesc}
                onChange={(e) => setColDesc(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs text-slate-200 p-2 rounded"
              />
            </div>
            <button
              type="submit"
              className="text-xs px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded"
            >
              Create Curated Anthology
            </button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {collections.map((col) => (
              <div key={col.id} className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
                <span className="text-[10px] text-amber-400 font-mono uppercase tracking-wider">Editorial Choice</span>
                <h4 className="font-serif font-bold text-slate-100 text-base mt-1">{col.title}</h4>
                <p className="text-xs text-slate-400 mt-1">{col.description}</p>
                <div className="mt-3 text-[11px] text-slate-500 font-mono">
                  Contains {col.articleIds.length} curated piece(s)
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
