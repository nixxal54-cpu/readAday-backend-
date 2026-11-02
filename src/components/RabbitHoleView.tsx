import React, { useState, useEffect } from 'react';
import { RabbitHoleNode, Article, TopicRelationship } from '../backend/types.ts';
import { Compass, GitCommit, Sparkles, ArrowDown, ChevronRight, Layers, Tag, BookmarkCheck } from 'lucide-react';

interface RabbitHoleViewProps {
  activeUserId: string;
  onSelectArticle: (article: Article) => void;
}

export const RabbitHoleView: React.FC<RabbitHoleViewProps> = ({ activeUserId, onSelectArticle }) => {
  const [depth, setDepth] = useState(3);
  const [selectedArticleId, setSelectedArticleId] = useState('art-ed-1');
  const [rabbitHoleData, setRabbitHoleData] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [topicsData, setTopicsData] = useState<{ topics: any[]; relationships: TopicRelationship[] }>({
    topics: [],
    relationships: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [allArticles, setAllArticles] = useState<Article[]>([]);

  const fetchArticlesList = async () => {
    try {
      const res = await fetch('/api/articles?feed=editorial&limit=20', {
        headers: { 'x-readaday-user-id': activeUserId },
      });
      const data = await res.json();
      setAllArticles(data.items || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRabbitHole = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/discovery/rabbit-hole?articleId=${selectedArticleId}&depth=${depth}`, {
        headers: { 'x-readaday-user-id': activeUserId },
      });
      const data = await res.json();
      setRabbitHoleData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const res = await fetch('/api/discovery/recommendations', {
        headers: { 'x-readaday-user-id': activeUserId },
      });
      const data = await res.json();
      setRecommendations(data.recommendations || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTopics = async () => {
    try {
      const res = await fetch('/api/discovery/topics');
      const data = await res.json();
      setTopicsData(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchArticlesList();
    fetchTopics();
    fetchRecommendations();
  }, [activeUserId]);

  useEffect(() => {
    if (selectedArticleId) {
      fetchRabbitHole();
    }
  }, [selectedArticleId, depth]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Compass className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-serif font-bold text-slate-100">The Rabbit Hole Discovery Engine</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            readAday's signature exploration architecture. Follow ideas deeper into connected subtopics,
            adjacent disciplines, and contextual rabbit holes powered by graph affinity scoring.
          </p>
        </div>

        {/* Depth Selector */}
        <div className="flex items-center space-x-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 font-mono pl-1">Dive Depth:</span>
          {[1, 2, 3, 4, 5].map((d) => (
            <button
              key={d}
              onClick={() => setDepth(d)}
              className={`w-7 h-7 rounded text-xs font-mono font-bold transition-all ${
                depth === d
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Origin Article Selector */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <label className="text-xs text-slate-300 font-medium">Select Origin Story to Begin Dive:</label>
        <select
          value={selectedArticleId}
          onChange={(e) => setSelectedArticleId(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-amber-500 sm:w-96"
        >
          <option value="art-ed-1">The Sanctuary of Solitary Thought (Editorial)</option>
          <option value="art-ed-2">Beyond the Token Horizon: Latent Reasoning (Editorial)</option>
          <option value="art-news-1">Open Frontier Lab 128k Reasoning (News)</option>
          <option value="art-com-1">The Art of the Margin (Community)</option>
        </select>
      </div>

      {/* Main Graph & Trail Flow */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-500 text-xs font-mono">
          Traversing topic graph nodes and computing affinity vectors...
        </div>
      ) : rabbitHoleData ? (
        <div className="space-y-6">
          {/* Origin Card */}
          <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 relative">
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">
              Level 0 &bull; Dive Origin Point
            </span>
            <h3 className="font-serif font-bold text-slate-100 text-lg mt-1">{rabbitHoleData.originTitle}</h3>
            <div className="mt-2 text-xs text-slate-400 flex items-center space-x-2">
              <span className="bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800 font-mono text-amber-300">
                {rabbitHoleData.originTopic}
              </span>
              <span>&bull;</span>
              <span>Starting vector for topic affinity</span>
            </div>
          </div>

          {/* Stepped Rabbit Hole Trail */}
          <div className="space-y-3 relative pl-4 sm:pl-6 border-l-2 border-dashed border-amber-500/30 ml-4 sm:ml-6">
            {rabbitHoleData.trail && rabbitHoleData.trail.length > 0 ? (
              rabbitHoleData.trail.map((node: RabbitHoleNode) => (
                <div
                  key={node.articleId}
                  className="group relative bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/50 p-4 rounded-xl transition-all"
                >
                  {/* Connector Dot */}
                  <div className="absolute -left-[27px] sm:-left-[35px] top-6 w-5 h-5 rounded-full bg-slate-950 border-2 border-amber-400 flex items-center justify-center text-[10px] font-mono font-bold text-amber-400">
                    {node.depth}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-mono uppercase">
                        Depth {node.depth}
                      </span>
                      <span className="text-xs text-slate-400">{node.categoryName}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono text-emerald-400 font-bold">
                        Affinity: {(node.affinityScore * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <h4 className="font-serif font-bold text-slate-100 text-base mt-2 group-hover:text-amber-400 transition-colors">
                    {node.title}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{node.summary}</p>

                  <div className="mt-3 pt-2 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                    <span className="text-slate-400 font-mono flex items-center">
                      <ChevronRight className="h-3 w-3 text-amber-400 mr-1 shrink-0" />
                      {node.connectionReason}
                    </span>

                    <button
                      onClick={() => onSelectArticle(node as any)}
                      className="text-amber-400 hover:underline font-medium text-xs self-end sm:self-auto"
                    >
                      Read this step &rarr;
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-slate-500">
                No deeper connected nodes found at depth {depth}. Try adjusting depth or selecting another article.
              </div>
            )}
          </div>

          {/* Topic Relationships Graph Knowledge Base */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center space-x-2">
              <Layers className="h-4 w-4 text-purple-400" />
              <h3 className="text-xs font-semibold text-slate-200">Semantic Topic Relationship Matrix</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {topicsData.relationships.map((rel) => (
                <div key={rel.id} className="p-3 rounded-lg bg-slate-900 border border-slate-800/80 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">{rel.sourceTopicName} &rarr; {rel.targetTopicName}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 font-mono">
                      {rel.relationshipType}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{rel.rationale}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Personalized Recommendations */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <h3 className="text-xs font-semibold text-slate-200">
                Personalized Recommendations (Based on your Reading History)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  onClick={() => onSelectArticle(rec.article)}
                  className="p-3.5 rounded-xl bg-slate-900/40 hover:bg-slate-900 border border-slate-800 cursor-pointer space-y-1.5 transition-all"
                >
                  <span className="text-[10px] font-mono text-amber-400">Match: {(rec.matchScore * 100).toFixed(0)}%</span>
                  <h5 className="font-serif font-bold text-slate-100 text-xs line-clamp-2">{rec.article.title}</h5>
                  <p className="text-[10px] text-slate-400 line-clamp-1">{rec.reason}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
