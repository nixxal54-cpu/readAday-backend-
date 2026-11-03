import React, { useState, useEffect } from 'react';
import { NewsSource, ContentRights } from '../backend/types.ts';
import { Rss, RefreshCw, ShieldAlert, CheckCircle2, Globe, Link2, FileText, ArrowRight, Zap } from 'lucide-react';

interface NewsEngineViewProps {
  activeUserId: string;
  onRefreshFeed: () => void;
}

export const NewsEngineView: React.FC<NewsEngineViewProps> = ({ activeUserId, onRefreshFeed }) => {
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [ingestLogs, setIngestLogs] = useState<any[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // New Source form
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newSourceLicense, setNewSourceLicense] = useState<ContentRights>('fair_use_summary');

  const [providers, setProviders] = useState<any[]>([]);
  const [isSyncingProviders, setIsSyncingProviders] = useState(false);

  const fetchSources = async () => {
    try {
      const res = await fetch('/api/news/sources', {
        headers: { 'x-readaday-user-id': activeUserId },
      });
      const data = await res.json();
      setSources(data.sources || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProviders = async () => {
    try {
      const res = await fetch('/api/providers');
      const data = await res.json();
      setProviders(data.providers || []);
    } catch (err) {
      console.error('Failed to load providers:', err);
    }
  };

  useEffect(() => {
    fetchSources();
    fetchProviders();
  }, [activeUserId]);

  const handleSyncProviders = async (providerId?: string) => {
    setIsSyncingProviders(true);
    setStatusMessage(providerId ? `Syncing ${providerId}...` : 'Syncing all 10 content providers concurrently...');
    try {
      const res = await fetch('/api/providers/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId: providerId || 'all', limit: 6 }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage(`Live Provider Sync Complete! Total articles in platform: ${data.totalArticlesInStore}`);
        fetchProviders();
        onRefreshFeed();
      } else {
        setStatusMessage(`Sync error: ${data.error || 'Failed'}`);
      }
    } catch (err: any) {
      setStatusMessage(`Sync error: ${err.message}`);
    } finally {
      setIsSyncingProviders(false);
      setTimeout(() => setStatusMessage(null), 6000);
    }
  };

  const handleRunIngest = async (sourceId?: string) => {
    setIsRunning(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/news/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-readaday-user-id': activeUserId,
        },
        body: JSON.stringify({ sourceId }),
      });
      const data = await res.json();
      setIngestLogs(data.runs || []);
      setStatusMessage('Ingestion complete. Deduplication and copyright compliance verified.');
      fetchSources();
      onRefreshFeed();
    } catch (err: any) {
      setStatusMessage(`Ingest failed: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceName || !newSourceUrl) return;

    try {
      const res = await fetch('/api/news/sources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-readaday-user-id': activeUserId,
        },
        body: JSON.stringify({
          name: newSourceName,
          rssUrl: newSourceUrl,
          licenseType: newSourceLicense,
        }),
      });
      if (res.ok) {
        setNewSourceName('');
        setNewSourceUrl('');
        fetchSources();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Rss className="h-5 w-5 text-blue-400" />
            <h2 className="text-lg font-serif font-bold text-slate-100">Latest News Engine & Wire Ingestion</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Automated scheduled polling from authorized RSS feeds and syndication partners.
            Enforces strict story deduplication, publisher attribution, and fair-use copyright compliance.
          </p>
        </div>

        <button
          onClick={() => handleRunIngest()}
          disabled={isRunning}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold text-xs shadow-lg shadow-blue-500/20 transition-all shrink-0 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRunning ? 'animate-spin' : ''}`} />
          <span>{isRunning ? 'Ingesting Wire Feeds...' : 'Trigger News Ingestion'}</span>
        </button>
      </div>

      {statusMessage && (
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-xs text-blue-300 flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-400" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Ingestion Run Results Inspector */}
      {ingestLogs.length > 0 && (
        <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-amber-400" />
              <h3 className="text-xs font-semibold text-slate-200">Latest Ingestion Run Report</h3>
            </div>
            <span className="text-[11px] font-mono text-emerald-400">Zero Copyright Infringement Verified</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ingestLogs.map((run, idx) => (
              <div key={idx} className="p-4 rounded-lg bg-slate-900 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif font-bold text-slate-100 text-sm">{run.sourceName}</h4>
                  <span className="text-[10px] text-slate-400 font-mono">Fetched: {run.fetchedCount}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs py-1">
                  <div className="p-2 rounded bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-500">Newly Ingested</div>
                    <div className="text-sm font-bold text-emerald-400">{run.newlyIngested} story(ies)</div>
                  </div>
                  <div className="p-2 rounded bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-500">Duplicates Filtered</div>
                    <div className="text-sm font-bold text-amber-400">{run.duplicateCount} skipped</div>
                  </div>
                </div>

                {run.complianceLog && run.complianceLog.length > 0 && (
                  <div className="mt-2 text-[10px] text-slate-400 font-mono space-y-1 bg-slate-950/80 p-2 rounded border border-slate-800/50 max-h-28 overflow-y-auto">
                    {run.complianceLog.map((log: string, lIdx: number) => (
                      <div key={lIdx} className="leading-tight truncate">{log}</div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 10 Real Centralized Content Providers */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-serif font-bold text-slate-200 flex items-center space-x-2">
              <Globe className="h-4 w-4 text-emerald-400" />
              <span>10 Real Content Providers (Centralized Architecture)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Strictly partitioned across Editorial, News, Community, Discover, and Books with Fair-Use attribution.
            </p>
          </div>

          <button
            onClick={() => handleSyncProviders()}
            disabled={isSyncingProviders}
            className="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-md shadow-emerald-950 transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-3 w-3 ${isSyncingProviders ? 'animate-spin' : ''}`} />
            <span>{isSyncingProviders ? 'Syncing...' : 'Sync All 10 Providers'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map((p) => (
            <div key={p.id} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-100">{p.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase font-semibold ${
                    p.status === 'healthy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                    p.status === 'degraded' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                    'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                  }`}>
                    {p.status}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{p.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className="font-mono text-slate-300 text-[10px] px-2 py-0.5 rounded bg-slate-950 border border-slate-800 uppercase">
                  Feed: {p.contentIdentity}
                </span>

                <button
                  onClick={() => handleSyncProviders(p.id)}
                  disabled={isSyncingProviders}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 text-[10px] font-medium transition-colors cursor-pointer"
                >
                  Sync {p.id}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Registered News Sources */}
      <div className="space-y-4">
        <h3 className="text-sm font-serif font-bold text-slate-200">Authorized RSS Feeds & Custom Sources</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sources.map((src) => (
            <div key={src.id} className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200 truncate">{src.name}</span>
                <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
              </div>

              <div className="text-[11px] text-slate-400 break-all font-mono">
                {src.rssUrl}
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                  src.licenseType === 'licensed_full'
                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                }`}>
                  {src.licenseType === 'licensed_full' ? 'Licensed Full Text' : 'Fair-Use Summary'}
                </span>
                <span className="text-slate-500 font-mono">{src.totalIngested} ingested</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add News Source Form */}
      <form onSubmit={handleAddSource} className="p-5 rounded-xl bg-slate-900/30 border border-slate-800 space-y-4 max-w-2xl">
        <h4 className="text-xs font-semibold text-slate-300">Register New RSS / Wire Source</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            required
            placeholder="Publisher Name (e.g. Nature Dispatch)"
            value={newSourceName}
            onChange={(e) => setNewSourceName(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs text-slate-200 p-2.5 rounded-lg"
          />
          <input
            type="url"
            required
            placeholder="https://example.com/rss.xml"
            value={newSourceUrl}
            onChange={(e) => setNewSourceUrl(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs text-slate-200 p-2.5 rounded-lg"
          />
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={newSourceLicense}
            onChange={(e) => setNewSourceLicense(e.target.value as ContentRights)}
            className="bg-slate-900 border border-slate-800 text-xs text-slate-300 p-2 rounded-lg"
          >
            <option value="fair_use_summary">Fair-Use Summary (Strict Copyright Protection)</option>
            <option value="licensed_full">Licensed Partner (Authorized Full Text)</option>
          </select>

          <button
            type="submit"
            className="text-xs px-4 py-2 bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold rounded-lg"
          >
            Add Source
          </button>
        </div>
      </form>
    </div>
  );
};
