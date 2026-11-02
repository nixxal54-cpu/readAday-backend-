import React, { useState } from 'react';
import { Terminal, Play, CheckCircle2, ChevronRight, Copy } from 'lucide-react';

interface EndpointDef {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  category: string;
  description: string;
  sampleBody?: any;
}

const ENDPOINTS: EndpointDef[] = [
  {
    method: 'GET',
    path: '/api/articles?feed=editorial&limit=5',
    category: 'Content',
    description: 'Fetch strictly separated Editorial articles with pagination & zero contamination check.',
  },
  {
    method: 'GET',
    path: '/api/articles?feed=news&limit=5',
    category: 'Content',
    description: 'Fetch Latest News wire feed with copyright rights status & publisher attribution.',
  },
  {
    method: 'GET',
    path: '/api/articles?feed=community&limit=5',
    category: 'Content',
    description: 'Fetch independent community essays submitted by verified writers.',
  },
  {
    method: 'GET',
    path: '/api/discovery/rabbit-hole?articleId=art-ed-1&depth=3',
    category: 'Discovery',
    description: 'Traverse topic relationship graph to return a multi-depth Rabbit Hole trail.',
  },
  {
    method: 'GET',
    path: '/api/discovery/recommendations',
    category: 'Discovery',
    description: 'Generate personalized article recommendations tailored to user reading history.',
  },
  {
    method: 'GET',
    path: '/api/reader/highlights',
    category: 'Reader',
    description: 'Retrieve private reading highlights and encrypted marginalia (RLS isolated).',
  },
  {
    method: 'GET',
    path: '/api/reader/history',
    category: 'Reader',
    description: 'Fetch reading progress percentages, scroll positions, and duration metrics.',
  },
  {
    method: 'GET',
    path: '/api/editorial/dashboard',
    category: 'Editorial',
    description: 'Retrieve editor queues: pending reviews, scheduled items, writer applications.',
  },
  {
    method: 'GET',
    path: '/api/news/sources',
    category: 'News Engine',
    description: 'List authorized RSS wire sources with license categories.',
  },
  {
    method: 'POST',
    path: '/api/news/ingest',
    category: 'News Engine',
    description: 'Trigger automated RSS ingestion with deduplication and copyright compliance.',
    sampleBody: {},
  },
  {
    method: 'GET',
    path: '/api/system/schema',
    category: 'System',
    description: 'Inspect PostgreSQL tables, enums, indexes, and foreign keys.',
  },
  {
    method: 'GET',
    path: '/api/system/rls-test',
    category: 'Security',
    description: 'Execute live Row-Level Security policy suite across reader, writer, editor roles.',
  },
];

interface ApiExplorerViewProps {
  activeUserId: string;
}

export const ApiExplorerView: React.FC<ApiExplorerViewProps> = ({ activeUserId }) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointDef>(ENDPOINTS[0]);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseData, setResponseData] = useState<any>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleExecute = async () => {
    setIsLoading(true);
    setResponseStatus(null);
    setResponseData(null);
    const start = performance.now();

    try {
      const res = await fetch(selectedEndpoint.path, {
        method: selectedEndpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'x-readaday-user-id': activeUserId,
        },
        body: selectedEndpoint.sampleBody ? JSON.stringify(selectedEndpoint.sampleBody) : undefined,
      });

      const elapsed = Math.round(performance.now() - start);
      setLatencyMs(elapsed);
      setResponseStatus(res.status);

      const data = await res.json();
      setResponseData(data);
    } catch (err: any) {
      setResponseStatus(500);
      setResponseData({ error: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center space-x-2">
          <Terminal className="h-5 w-5 text-amber-400" />
          <h2 className="text-lg font-serif font-bold text-slate-100">Interactive REST API Explorer</h2>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Execute real HTTP calls against the live readAday backend. Inspect HTTP status, latency,
          and response payloads in real time.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Endpoint Selector List */}
        <div className="lg:col-span-5 space-y-2">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Available Endpoints</h3>
          <div className="space-y-1.5 max-h-[550px] overflow-y-auto pr-1">
            {ENDPOINTS.map((ep, idx) => {
              const isSelected = selectedEndpoint.path === ep.path && selectedEndpoint.method === ep.method;
              return (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedEndpoint(ep);
                    setResponseData(null);
                    setResponseStatus(null);
                  }}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-900 border-amber-500/60 shadow-md'
                      : 'bg-slate-950/60 hover:bg-slate-900/60 border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      ep.method === 'GET' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' :
                      ep.method === 'POST' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                      'bg-amber-500/10 text-amber-400'
                    }`}>
                      {ep.method}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{ep.category}</span>
                  </div>
                  <div className="text-xs font-mono text-slate-200 mt-1 truncate">{ep.path}</div>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{ep.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Request & Response Playground */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-blue-500/20 text-blue-400">
                  {selectedEndpoint.method}
                </span>
                <span className="font-mono text-xs text-slate-200 break-all">{selectedEndpoint.path}</span>
              </div>

              <button
                onClick={handleExecute}
                disabled={isLoading}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all shrink-0"
              >
                <Play className="h-3 w-3 fill-current" />
                <span>{isLoading ? 'Calling...' : 'Send Request'}</span>
              </button>
            </div>

            <p className="text-xs text-slate-400">{selectedEndpoint.description}</p>
          </div>

          {/* Response Inspector */}
          <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
            <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
              <span className="font-mono text-slate-400">Response Payload</span>
              {responseStatus !== null && (
                <div className="flex items-center space-x-3 font-mono text-[11px]">
                  <span className={`px-2 py-0.5 rounded font-bold ${
                    responseStatus >= 200 && responseStatus < 300
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-rose-500/10 text-rose-400'
                  }`}>
                    HTTP {responseStatus}
                  </span>
                  <span className="text-slate-500">{latencyMs} ms</span>
                </div>
              )}
            </div>

            <pre className="p-4 text-xs font-mono text-slate-300 max-h-[420px] overflow-auto leading-relaxed">
              {isLoading ? (
                <span className="text-slate-500">Executing request to live backend...</span>
              ) : responseData ? (
                JSON.stringify(responseData, null, 2)
              ) : (
                <span className="text-slate-600">// Click "Send Request" to test this endpoint.</span>
              )}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
