import React, { useState } from 'react';
import {
  Sparkles,
  Search,
  Key,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  ExternalLink
} from 'lucide-react';

export const KeywordDiscoveryForm = ({
  onDiscover,
  loading,
  disabled,
  keywordStatus,
  onOpenSetupGuide
}) => {
  const [keyword, setKeyword] = useState('');
  const [limit, setLimit] = useState(20);

  const isConfigured = keywordStatus?.configured;
  const activeEngine = keywordStatus?.activeEngine;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    onDiscover({ keyword: keyword.trim(), limit });
  };

  return (
    <div className="p-5 rounded-2xl bg-[#15191E] border border-white/[0.08] space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">Niche & Topic Keyword Discovery</h3>
            <p className="text-xs text-text-muted">
              Discover active blogs, resource roundups, directories, and tool listings matching your niche.
            </p>
          </div>
        </div>

        {/* Engine status indicator */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          {isConfigured ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-medium text-emerald-400">
              <CheckCircle2 className="w-3 h-3" />
              <span>Search Engine: {activeEngine?.toUpperCase()}</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={onOpenSetupGuide}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] font-medium text-amber-400 hover:bg-amber-500/15 transition-colors"
            >
              <Key className="w-3 h-3" />
              <span>Configure Search API</span>
            </button>
          )}
        </div>
      </div>

      {!isConfigured && (
        <div className="p-3 rounded-xl bg-amber-500/[0.04] border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <div className="space-y-1">
            <p className="font-semibold text-text-primary">Keyword Discovery Provider Not Configured</p>
            <p className="text-[11px] text-text-muted">
              Web search discovery requires a Google Custom Search API key or Serper API key in{' '}
              <code className="text-amber-300 font-mono">server/.env</code>. Competitor Backlink Discovery
              remains fully functional via Moz API.
            </p>
            <button
              type="button"
              onClick={onOpenSetupGuide}
              className="text-[11px] text-emerald-400 hover:underline font-medium inline-flex items-center gap-1"
            >
              <span>View setup instructions</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            disabled={disabled || loading || !isConfigured}
            placeholder={
              isConfigured
                ? 'Enter topic or keyword (e.g. "React development tools", "SaaS marketing blog")'
                : 'Configure a search provider API to enable keyword discovery'
            }
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0D1117] border border-white/[0.08] text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-purple-500 transition-colors disabled:opacity-50"
          />
        </div>

        <button
          type="submit"
          disabled={loading || disabled || !keyword.trim() || !isConfigured}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-semibold text-xs transition-all shadow-md shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Searching Niche...</span>
            </>
          ) : (
            <>
              <Search className="w-3.5 h-3.5" />
              <span>Search Prospects</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default KeywordDiscoveryForm;
