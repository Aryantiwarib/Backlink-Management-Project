import React, { useState } from 'react';
import {
  Users,
  Plus,
  X,
  Search,
  Sparkles,
  ArrowRight,
  Globe,
  HelpCircle
} from 'lucide-react';

export const CompetitorDiscoveryForm = ({ onDiscover, loading, disabled }) => {
  const [domainInput, setDomainInput] = useState('');
  const [competitorList, setCompetitorList] = useState([]);
  const [limit, setLimit] = useState(30);

  const handleAddDomain = () => {
    if (!domainInput.trim()) return;
    const parts = domainInput
      .split(/[\s,]+/)
      .map((d) => d.trim().toLowerCase().replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0])
      .filter((d) => d && !competitorList.includes(d));

    if (parts.length > 0) {
      setCompetitorList((prev) => [...prev, ...parts]);
      setDomainInput('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddDomain();
    }
  };

  const handleRemove = (domainToRemove) => {
    setCompetitorList((prev) => prev.filter((d) => d !== domainToRemove));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let finalList = [...competitorList];
    if (domainInput.trim()) {
      const extra = domainInput.trim().toLowerCase().replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0];
      if (extra && !finalList.includes(extra)) {
        finalList.push(extra);
        setCompetitorList(finalList);
        setDomainInput('');
      }
    }
    if (finalList.length > 0) {
      onDiscover({ competitorDomains: finalList, limit });
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-[#15191E] border border-white/[0.08] space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">Competitor Backlink Discovery</h3>
            <p className="text-xs text-text-muted">
              Analyze websites linking to top industry competitors to uncover proven backlink candidates.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-text-muted self-end sm:self-center">
          <span>Max links / competitor:</span>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="bg-[#0D1117] border border-white/[0.08] rounded-xl px-2.5 py-1 text-xs text-text-primary focus:outline-none focus:border-emerald-500"
          >
            <option value={15}>15 links</option>
            <option value={30}>30 links (Recommended)</option>
            <option value={50}>50 links</option>
          </select>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Input box */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Globe className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled || loading}
              placeholder="Enter competitor domain (e.g. semrush.com, ahrefs.com) and press Enter"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0D1117] border border-white/[0.08] text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50"
            />
          </div>

          <button
            type="button"
            onClick={handleAddDomain}
            disabled={!domainInput.trim() || disabled || loading}
            className="px-3.5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-text-secondary hover:text-text-primary transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Domain</span>
          </button>

          <button
            type="submit"
            disabled={loading || disabled || (competitorList.length === 0 && !domainInput.trim())}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold text-xs transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Crawling Competitors...</span>
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5" />
                <span>Discover Opportunities</span>
              </>
            )}
          </button>
        </div>

        {/* Competitor domain tags */}
        {competitorList.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] text-text-muted font-medium">Selected Competitors:</span>
            {competitorList.map((comp) => (
              <span
                key={comp}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-text-primary"
              >
                <span>{comp}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(comp)}
                  className="text-text-muted hover:text-rose-400 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={() => setCompetitorList([])}
              className="text-[11px] text-text-muted hover:text-rose-400 underline ml-2 transition-colors"
            >
              Clear all
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default CompetitorDiscoveryForm;
