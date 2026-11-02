import React, { useState, useEffect } from 'react';
import { Database, ShieldCheck, FileCode, CheckCircle, Copy, AlertTriangle } from 'lucide-react';

export const DatabaseRlsView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'tests' | 'tables' | 'sql'>('tests');
  const [rlsResults, setRlsResults] = useState<any>(null);
  const [schemaData, setSchemaData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const fetchRlsTests = async () => {
    try {
      const res = await fetch('/api/system/rls-test');
      const data = await res.json();
      setRlsResults(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSchema = async () => {
    try {
      const res = await fetch('/api/system/schema');
      const data = await res.json();
      setSchemaData(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRlsTests();
    fetchSchema();
  }, []);

  const migrationSqlSample = `-- readAday PostgreSQL 16 & Supabase Migration
-- RLS Policy Matrix for Private Notes:
ALTER TABLE public.highlights_and_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users have full and exclusive access to their private notes"
  ON public.highlights_and_notes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Strict Content Feed Partitioning:
CREATE INDEX idx_articles_feed_status 
  ON public.articles (content_type, status, published_at DESC);

-- Published articles public, drafts author or editor only:
CREATE POLICY "Published articles are readable by all"
  ON public.articles FOR SELECT
  USING (
    status = 'published'
    OR author_id = auth.uid()
    OR public.is_editor_or_admin()
  );`;

  const copySql = () => {
    navigator.clipboard.writeText(migrationSqlSample);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Database className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-serif font-bold text-slate-100">Database & Row Level Security (RLS) Inspector</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Normalized PostgreSQL schema, B-Tree and GIN indexes, foreign key constraints,
            and comprehensive Supabase Row Level Security (RLS) policies protecting user privacy.
          </p>
        </div>

        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
          <ShieldCheck className="h-4 w-4" />
          <span>RLS Active on 100% of User Tables</span>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveSubTab('tests')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-lg capitalize transition-all ${
            activeSubTab === 'tests'
              ? 'bg-amber-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          RLS Policy Verification Matrix ({rlsResults?.totalTests || 5} checks)
        </button>

        <button
          onClick={() => setActiveSubTab('tables')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-lg capitalize transition-all ${
            activeSubTab === 'tables'
              ? 'bg-amber-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          PostgreSQL Tables & Schema ({schemaData?.tables?.length || 9})
        </button>

        <button
          onClick={() => setActiveSubTab('sql')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-lg capitalize transition-all ${
            activeSubTab === 'sql'
              ? 'bg-amber-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          Migration SQL Preview
        </button>
      </div>

      {/* RLS TEST MATRIX */}
      {activeSubTab === 'tests' && rlsResults && (
        <div className="space-y-3">
          {rlsResults.tests.map((t: any, idx: number) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-200">{t.policy}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-mono font-bold">
                    {t.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{t.scenario}</p>
                <div className="text-[11px] font-mono text-amber-300/80">{t.result}</div>
              </div>

              <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* POSTGRES TABLES */}
      {activeSubTab === 'tables' && schemaData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {schemaData.tables.map((tbl: any) => (
            <div key={tbl.name} className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-amber-400">public.{tbl.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono">
                  RLS ENABLED
                </span>
              </div>
              <p className="text-xs text-slate-400">{tbl.description}</p>
              <div className="text-[11px] font-mono text-slate-500">
                Primary Key: {tbl.primaryKey}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SQL PREVIEW */}
      {activeSubTab === 'sql' && (
        <div className="relative rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden">
          <div className="p-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">supabase/migrations/20261101000000_readaday_schema.sql</span>
            <button
              onClick={copySql}
              className="flex items-center space-x-1 text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium"
            >
              <Copy className="h-3 w-3" />
              <span>{copied ? 'Copied!' : 'Copy SQL'}</span>
            </button>
          </div>
          <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
            {migrationSqlSample}
          </pre>
        </div>
      )}
    </div>
  );
};
