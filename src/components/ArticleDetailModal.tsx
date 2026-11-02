import React, { useState, useEffect } from 'react';
import { Article, UserRole, Comment } from '../backend/types.ts';
import { X, Clock, Bookmark, ThumbsUp, MessageSquare, Compass, Lock, ExternalLink, Send, Flag } from 'lucide-react';

interface ArticleDetailModalProps {
  article: Article | null;
  onClose: () => void;
  activeUserId: string;
  activeRole: UserRole;
  onOpenRabbitHole: (articleId: string) => void;
}

export const ArticleDetailModal: React.FC<ArticleDetailModalProps> = ({
  article,
  onClose,
  activeUserId,
  activeRole,
  onOpenRabbitHole,
}) => {
  if (!article) return null;

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(article.likeCount);
  const [highlightInput, setHighlightInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [savedNoteMsg, setSavedNoteMsg] = useState(false);

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/community/articles/${article.id}/comments`);
      const data = await res.json();
      setComments(data.comments || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [article.id]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;

    try {
      const res = await fetch(`/api/community/articles/${article.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-readaday-user-id': activeUserId,
        },
        body: JSON.stringify({ content: commentInput }),
      });
      if (res.ok) {
        setCommentInput('');
        fetchComments();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleLike = async () => {
    try {
      const res = await fetch(`/api/community/articles/${article.id}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-readaday-user-id': activeUserId,
        },
      });
      const data = await res.json();
      setIsLiked(data.liked);
      setLikeCount(data.likeCount);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSavePrivateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!highlightInput || !noteInput) return;

    try {
      const res = await fetch('/api/reader/highlights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-readaday-user-id': activeUserId,
        },
        body: JSON.stringify({
          articleId: article.id,
          highlightText: highlightInput,
          privateNote: noteInput,
          color: 'amber',
        }),
      });
      if (res.ok) {
        setHighlightInput('');
        setNoteInput('');
        setSavedNoteMsg(true);
        setTimeout(() => setSavedNoteMsg(false), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
              {article.contentType}
            </span>
            <span className="text-xs text-slate-400 font-mono">&bull;</span>
            <span className="text-xs text-slate-300 font-medium">{article.categoryName}</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                onOpenRabbitHole(article.id);
                onClose();
              }}
              className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 text-xs font-bold transition-all border border-amber-500/40"
            >
              <Compass className="h-3.5 w-3.5" />
              <span>Explore Rabbit Hole &rarr;</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto p-6 space-y-6">
          {/* Article Header */}
          <div className="space-y-3">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-100 leading-tight">
              {article.title}
            </h1>
            <p className="text-sm text-slate-300 italic font-serif leading-relaxed">
              {article.summary}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 pt-2 border-t border-slate-900">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-slate-200">{article.authorName}</span>
                {article.publishedAt && (
                  <>
                    <span>&bull;</span>
                    <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                  </>
                )}
              </div>

              <div className="flex items-center space-x-3">
                <span className="flex items-center space-x-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{article.readingTimeMinutes} min read</span>
                </span>

                <button
                  onClick={handleToggleLike}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs transition-all ${
                    isLiked ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ThumbsUp className="h-3 w-3" />
                  <span>{likeCount}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Cover image if any */}
          {article.coverImageUrl && (
            <div className="w-full h-64 sm:h-80 rounded-xl overflow-hidden bg-slate-900">
              <img src={article.coverImageUrl} alt={article.title} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Article Body Content */}
          <div
            className="prose prose-invert max-w-none text-slate-300 font-serif leading-relaxed space-y-4 text-sm sm:text-base border-b border-slate-900 pb-6"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          {/* Add Private Note & Highlight Section */}
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Lock className="h-4 w-4 text-emerald-400" />
                <h4 className="text-xs font-semibold text-slate-200">Add Private Marginalia (Protected by RLS)</h4>
              </div>
              {savedNoteMsg && (
                <span className="text-[11px] text-emerald-400 font-mono">Note Saved to Encrypted Row!</span>
              )}
            </div>

            <form onSubmit={handleSavePrivateNote} className="space-y-2">
              <input
                type="text"
                required
                placeholder="Selected text excerpt to highlight..."
                value={highlightInput}
                onChange={(e) => setHighlightInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 p-2 rounded"
              />
              <textarea
                rows={2}
                required
                placeholder="Your private reflection or criticism (invisible to other readers)..."
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 p-2 rounded"
              />
              <button
                type="submit"
                className="text-xs px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded"
              >
                Save Private Note
              </button>
            </form>
          </div>

          {/* Comments & Discussion */}
          <div className="space-y-4 pt-2">
            <h4 className="text-sm font-serif font-bold text-slate-200 flex items-center">
              <MessageSquare className="h-4 w-4 mr-1.5 text-amber-400" />
              Community Discussion ({comments.length})
            </h4>

            {/* Comment Post Form */}
            <form onSubmit={handlePostComment} className="flex space-x-2">
              <input
                type="text"
                placeholder="Share thoughtful feedback or analysis..."
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded-lg"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg"
              >
                Post
              </button>
            </form>

            <div className="space-y-2.5">
              {comments.map((comm) => (
                <div key={comm.id} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">{comm.userName}</span>
                    <span className="text-[10px] text-slate-500">{new Date(comm.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-slate-300">{comm.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
