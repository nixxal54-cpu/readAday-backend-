import React, { useState, useEffect } from 'react';
import { HighlightAndNote, ReadingBookmark, ReadingHistory, Article } from '../backend/types.ts';
import { Bookmark, HighlightingIcon, Lock, Sparkles, FolderPlus, Trash2, BookOpen, Clock } from 'lucide-react';

interface ReaderFeaturesViewProps {
  activeUserId: string;
  onSelectArticle: (article: Article) => void;
}

export const ReaderFeaturesView: React.FC<ReaderFeaturesViewProps> = ({ activeUserId, onSelectArticle }) => {
  const [activeTab, setActiveTab] = useState<'highlights' | 'bookmarks' | 'history' | 'collections'>('highlights');
  const [highlights, setHighlights] = useState<HighlightAndNote[]>([]);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [personalCollections, setPersonalCollections] = useState<any[]>([]);

  // New Highlight Form
  const [highlightText, setHighlightText] = useState('');
  const [privateNote, setPrivateNote] = useState('');
  const [selectedColor, setSelectedColor] = useState<'amber' | 'emerald' | 'cyan' | 'rose' | 'violet'>('amber');
  const [targetArticleId, setTargetArticleId] = useState('art-ed-1');

  // New Collection Form
  const [colName, setColName] = useState('');
  const [colDesc, setColDesc] = useState('');

  const fetchReaderData = async () => {
    try {
      // 1. Highlights
      const resH = await fetch('/api/reader/highlights', {
        headers: { 'x-readaday-user-id': activeUserId },
      });
      const dataH = await resH.json();
      setHighlights(dataH.highlights || []);

      // 2. Bookmarks
      const resB = await fetch('/api/reader/bookmarks', {
        headers: { 'x-readaday-user-id': activeUserId },
      });
      const dataB = await resB.json();
      setBookmarks(dataB.bookmarks || []);

      // 3. History
      const resHist = await fetch('/api/reader/history', {
        headers: { 'x-readaday-user-id': activeUserId },
      });
      const dataHist = await resHist.json();
      setHistory(dataHist.history || []);

      // 4. Personal Collections
      const resC = await fetch('/api/reader/collections', {
        headers: { 'x-readaday-user-id': activeUserId },
      });
      const dataC = await resC.json();
      setPersonalCollections(dataC.collections || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchReaderData();
  }, [activeUserId]);

  const handleCreateHighlight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!highlightText) return;

    try {
      const res = await fetch('/api/reader/highlights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-readaday-user-id': activeUserId,
        },
        body: JSON.stringify({
          articleId: targetArticleId,
          highlightText,
          privateNote,
          color: selectedColor,
        }),
      });
      if (res.ok) {
        setHighlightText('');
        setPrivateNote('');
        fetchReaderData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteHighlight = async (id: string) => {
    try {
      const res = await fetch(`/api/reader/highlights/${id}`, {
        method: 'DELETE',
        headers: { 'x-readaday-user-id': activeUserId },
      });
      if (res.ok) fetchReaderData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!colName) return;

    try {
      const res = await fetch('/api/reader/collections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-readaday-user-id': activeUserId,
        },
        body: JSON.stringify({
          name: colName,
          description: colDesc,
          articleIds: ['art-ed-1'],
        }),
      });
      if (res.ok) {
        setColName('');
        setColDesc('');
        fetchReaderData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateProgress = async (articleId: string, progress: number) => {
    try {
      await fetch('/api/reader/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-readaday-user-id': activeUserId,
        },
        body: JSON.stringify({
          articleId,
          progressPercent: progress,
          scrollPosition: progress / 100,
          completed: progress >= 95,
          durationSeconds: 30,
        }),
      });
      fetchReaderData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Privacy Notice Banner */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-slate-200">Strict Row-Level Security Privacy Isolation</h3>
            <p className="text-[11px] text-slate-400">
              Private notes, bookmarks, and reading history are strictly bound to your authenticated user ID.
              Other readers or editors cannot access your private marginalia.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('highlights')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-lg capitalize transition-all ${
            activeTab === 'highlights'
              ? 'bg-amber-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          Highlights & Private Notes ({highlights.length})
        </button>

        <button
          onClick={() => setActiveTab('bookmarks')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-lg capitalize transition-all ${
            activeTab === 'bookmarks'
              ? 'bg-amber-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          Saved Bookmarks ({bookmarks.length})
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-lg capitalize transition-all ${
            activeTab === 'history'
              ? 'bg-amber-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          Reading Progress & History ({history.length})
        </button>

        <button
          onClick={() => setActiveTab('collections')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-lg capitalize transition-all ${
            activeTab === 'collections'
              ? 'bg-amber-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          Personal Collections ({personalCollections.length})
        </button>
      </div>

      {/* HIGHLIGHTS TAB */}
      {activeTab === 'highlights' && (
        <div className="space-y-6">
          {/* New Highlight / Marginalia Form */}
          <form onSubmit={handleCreateHighlight} className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3 max-w-2xl">
            <h4 className="text-xs font-semibold text-amber-400">Add Highlight & Private Note</h4>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Target Article</label>
              <select
                value={targetArticleId}
                onChange={(e) => setTargetArticleId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 p-2 rounded"
              >
                <option value="art-ed-1">The Sanctuary of Solitary Thought</option>
                <option value="art-ed-2">Beyond the Token Horizon: Latent Reasoning</option>
                <option value="art-com-1">The Art of the Margin</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Highlighted Excerpt</label>
              <input
                type="text"
                required
                placeholder="Paste or type excerpt from article..."
                value={highlightText}
                onChange={(e) => setHighlightText(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 p-2 rounded"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Private Reflection (Strictly Confidential)</label>
              <textarea
                rows={2}
                placeholder="Your personal critique, synthesis, or thought..."
                value={privateNote}
                onChange={(e) => setPrivateNote(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 p-2 rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] text-slate-400">Color:</span>
                {(['amber', 'emerald', 'cyan', 'rose', 'violet'] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedColor(c)}
                    className={`w-5 h-5 rounded-full border ${
                      c === 'amber' ? 'bg-amber-400' :
                      c === 'emerald' ? 'bg-emerald-400' :
                      c === 'cyan' ? 'bg-cyan-400' :
                      c === 'rose' ? 'bg-rose-400' : 'bg-purple-400'
                    } ${selectedColor === c ? 'ring-2 ring-white' : 'opacity-60'}`}
                  />
                ))}
              </div>

              <button
                type="submit"
                className="text-xs px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded"
              >
                Save Private Note
              </button>
            </div>
          </form>

          {/* Highlights List */}
          <div className="space-y-3">
            {highlights.map((h) => (
              <div key={h.id} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-start justify-between">
                  <blockquote className="font-serif italic text-sm text-slate-200 border-l-2 border-amber-400 pl-3">
                    "{h.highlightText}"
                  </blockquote>
                  <button
                    onClick={() => handleDeleteHighlight(h.id)}
                    className="text-slate-500 hover:text-rose-400 p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {h.privateNote && (
                  <div className="mt-2 text-xs bg-slate-950 p-3 rounded-lg border border-slate-800/80 text-amber-200/90 flex items-start space-x-2">
                    <Lock className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-500 font-mono block">Private Note (Encrypted User Row):</span>
                      <p className="mt-0.5">{h.privateNote}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BOOKMARKS TAB */}
      {activeTab === 'bookmarks' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bookmarks.map((b) => (
            <div
              key={b.id}
              onClick={() => onSelectArticle(b.article)}
              className="p-4 rounded-xl bg-slate-900/40 hover:bg-slate-900 border border-slate-800 cursor-pointer space-y-2 transition-all"
            >
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>{b.article.categoryName}</span>
                <span>{b.article.readingTimeMinutes} min read</span>
              </div>
              <h4 className="font-serif font-bold text-slate-100 text-sm">{b.article.title}</h4>
              <p className="text-xs text-slate-400 line-clamp-2">{b.article.summary}</p>
            </div>
          ))}
        </div>
      )}

      {/* READING HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {history.map((h) => (
            <div key={h.id} className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-serif font-bold text-slate-100 text-sm">{h.article.title}</h4>
                <span className="text-xs font-mono text-amber-400 font-bold">{h.progressPercent}% Read</span>
              </div>

              {/* Progress Bar & Slider */}
              <div className="space-y-1">
                <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all"
                    style={{ width: `${h.progressPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>Duration: {Math.floor(h.readDurationSeconds / 60)}m {h.readDurationSeconds % 60}s</span>
                  <span>{h.completed ? 'Finished' : 'In Progress'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-400">Adjust Reading Position:</span>
                <div className="flex space-x-1.5">
                  {[25, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => handleUpdateProgress(h.articleId, pct)}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                        h.progressPercent === pct
                          ? 'bg-amber-500 text-slate-950 border-amber-500'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PERSONAL COLLECTIONS TAB */}
      {activeTab === 'collections' && (
        <div className="space-y-6">
          <form onSubmit={handleCreateCollection} className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3 max-w-xl">
            <h4 className="text-xs font-semibold text-slate-300">Create Personal Reading List</h4>
            <input
              type="text"
              required
              placeholder="List Name (e.g. Cognitive Systems Deep Dive)"
              value={colName}
              onChange={(e) => setColName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 p-2 rounded"
            />
            <input
              type="text"
              placeholder="Optional description"
              value={colDesc}
              onChange={(e) => setColDesc(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 p-2 rounded"
            />
            <button
              type="submit"
              className="text-xs px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded"
            >
              Save List
            </button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {personalCollections.map((col) => (
              <div key={col.id} className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
                <span className="text-[10px] text-emerald-400 font-mono">Private User List</span>
                <h4 className="font-serif font-bold text-slate-100 text-sm mt-1">{col.name}</h4>
                <p className="text-xs text-slate-400 mt-1">{col.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
