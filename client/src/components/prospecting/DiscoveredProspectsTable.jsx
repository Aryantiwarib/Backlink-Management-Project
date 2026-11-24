import React, { useState } from 'react';
import {
  ExternalLink,
  Plus,
  Check,
  Sparkles,
  Award,
  Globe,
  Info,
  ChevronRight,
  ShieldCheck,
  BookmarkPlus
} from 'lucide-react';

export const DiscoveredProspectsTable = ({
  prospects = [],
  loading = false,
  onSaveProspect,
  onBulkSave,
  onViewDetails
}) => {
  const [selectedDomains, setSelectedDomains] = useState(new Set());
  const [hoveredScoreIndex, setHoveredScoreIndex] = useState(null);
  const [savingDomain, setSavingDomain] = useState(null);
  const [bulkSaving, setBulkSaving] = useState(false);

  const toggleSelect = (domain) => {
    setSelectedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) next.delete(domain);
      else next.add(domain);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedDomains.size === unsavedProspects.length) {
      setSelectedDomains(new Set());
    } else {
      setSelectedDomains(new Set(unsavedProspects.map((p) => p.prospectDomain)));
    }
  };

  const unsavedProspects = prospects.filter((p) => !p.isSaved);

  const handleSingleSave = async (prospect) => {
    setSavingDomain(prospect.prospectDomain);
    try {
      await onSaveProspect(prospect);
    } finally {
      setSavingDomain(null);
    }
  };

  const handleBulkSave = async () => {
    const toSave = prospects.filter((p) => selectedDomains.has(p.prospectDomain));
    if (toSave.length === 0) return;
    setBulkSaving(true);
    try {
      await onBulkSave(toSave);
      setSelectedDomains(new Set());
    } finally {
      setBulkSaving(false);
    }
  };

  const getScoreBadge = (score) => {
    if (score === null || score === undefined) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-white/[0.04] text-text-muted">
          N/A
        </span>
      );
    }
    if (score >= 75) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          {score}/100
        </span>
      );
    }
    if (score >= 50) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
          {score}/100
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
        {score}/100
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-12 rounded-2xl bg-[#15191E] border border-white/[0.08] text-center text-text-muted text-xs">
        <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin mx-auto mb-3" />
        <span>Evaluating and scoring discovered link prospects...</span>
      </div>
    );
  }

  if (!prospects || prospects.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl bg-[#15191E] border border-white/[0.08] overflow-hidden space-y-0">
      {/* Table header bar & Bulk Save CTA */}
      <div className="p-4 sm:p-5 border-b border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <span>Discovered Opportunities</span>
            <span className="px-2 py-0.5 rounded-full bg-white/[0.05] text-text-muted text-xs font-normal">
              {prospects.length} candidates
            </span>
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Select candidates to add to your permanent Saved Prospects pipeline.
          </p>
        </div>

        {selectedDomains.size > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkSave}
              disabled={bulkSaving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold text-xs shadow-md shadow-emerald-500/20 transition-all"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              <span>
                {bulkSaving ? 'Saving...' : `Save Selected (${selectedDomains.size})`}
              </span>
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/[0.06] bg-[#101419] text-text-muted">
              <th className="py-3 px-4 w-10">
                <input
                  type="checkbox"
                  checked={unsavedProspects.length > 0 && selectedDomains.size === unsavedProspects.length}
                  onChange={selectAll}
                  disabled={unsavedProspects.length === 0}
                  className="rounded border-white/[0.2] bg-[#0D1117] text-emerald-500 focus:ring-0 cursor-pointer"
                />
              </th>
              <th className="py-3 px-4 font-medium">Prospect Domain</th>
              <th className="py-3 px-4 font-medium">Discovery Signal</th>
              <th className="py-3 px-4 font-medium">Domain Authority</th>
              <th className="py-3 px-4 font-medium">Link Type</th>
              <th className="py-3 px-4 font-medium">Opportunity Score</th>
              <th className="py-3 px-4 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {prospects.map((prospect, idx) => {
              const isSelected = selectedDomains.has(prospect.prospectDomain);
              const isSavingThis = savingDomain === prospect.prospectDomain;

              return (
                <tr
                  key={prospect.prospectDomain}
                  className={`hover:bg-white/[0.015] transition-colors ${
                    isSelected ? 'bg-emerald-500/[0.03]' : ''
                  }`}
                >
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={prospect.isSaved}
                      onChange={() => toggleSelect(prospect.prospectDomain)}
                      className="rounded border-white/[0.2] bg-[#0D1117] text-emerald-500 focus:ring-0 cursor-pointer disabled:opacity-30"
                    />
                  </td>

                  {/* Domain & URL link */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-text-muted shrink-0" />
                      <div className="truncate max-w-xs">
                        <a
                          href={prospect.prospectUrl || `https://${prospect.prospectDomain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-text-primary hover:text-emerald-400 transition-colors inline-flex items-center gap-1"
                        >
                          <span>{prospect.prospectDomain}</span>
                          <ExternalLink className="w-3 h-3 text-text-muted opacity-60" />
                        </a>
                        {prospect.sampleAnchorText && (
                          <div className="text-[11px] text-text-muted truncate mt-0.5 italic">
                            "{prospect.sampleAnchorText}"
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Discovery Signal */}
                  <td className="py-3 px-4 text-text-secondary">
                    {prospect.competitorDomains?.length > 1 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Links to {prospect.competitorDomains.length} competitors
                      </span>
                    ) : prospect.competitorDomains?.length === 1 ? (
                      <span className="text-[11px] text-text-muted">
                        Links to <span className="text-text-primary font-mono">{prospect.competitorDomains[0]}</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-text-muted capitalize">
                        {prospect.discoveredFrom || prospect.source}
                      </span>
                    )}
                  </td>

                  {/* DA */}
                  <td className="py-3 px-4">
                    {prospect.domainAuthority !== null ? (
                      <span className="font-mono font-semibold text-text-primary">
                        DA {prospect.domainAuthority}
                      </span>
                    ) : (
                      <span className="text-text-muted font-mono text-[11px]">N/A</span>
                    )}
                  </td>

                  {/* Link Type */}
                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded border ${
                        prospect.linkType === 'dofollow'
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 font-semibold'
                          : 'bg-white/[0.04] border-white/[0.08] text-text-muted'
                      }`}
                    >
                      {prospect.linkType || 'unknown'}
                    </span>
                  </td>

                  {/* Opportunity Score with Factor Tooltip */}
                  <td className="py-3 px-4 relative">
                    <div
                      className="inline-block cursor-help"
                      onMouseEnter={() => setHoveredScoreIndex(idx)}
                      onMouseLeave={() => setHoveredScoreIndex(null)}
                      onClick={() => onViewDetails(prospect)}
                    >
                      {getScoreBadge(prospect.opportunityScore)}
                    </div>

                    {/* Breakdown Tooltip */}
                    {hoveredScoreIndex === idx && prospect.opportunityFactors?.length > 0 && (
                      <div className="absolute left-4 top-10 z-50 w-72 p-3 rounded-2xl bg-[#101419] border border-white/[0.1] shadow-2xl text-[11px] space-y-1.5 pointer-events-none">
                        <div className="font-semibold text-text-primary border-b border-white/[0.08] pb-1 flex justify-between">
                          <span>Score Breakdown</span>
                          <span className="text-emerald-400 font-mono">
                            {prospect.opportunityScore}/100
                          </span>
                        </div>
                        {prospect.opportunityFactors.map((f, i) => (
                          <div key={i} className="flex items-center justify-between gap-2">
                            <span className="text-text-muted truncate">{f.factor}:</span>
                            <span
                              className={`font-mono font-semibold ${
                                f.points > 0
                                  ? 'text-emerald-400'
                                  : f.points < 0
                                  ? 'text-rose-400'
                                  : 'text-text-muted'
                              }`}
                            >
                              {f.points > 0 ? `+${f.points}` : f.points}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {prospect.isSaved ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[11px] text-text-muted capitalize">
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>{prospect.savedStatus || 'Saved'}</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSingleSave(prospect)}
                          disabled={isSavingThis}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-emerald-500/10 hover:border-emerald-500/20 text-text-secondary hover:text-emerald-400 border border-white/[0.08] text-xs font-medium transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          <span>{isSavingThis ? 'Saving...' : 'Save'}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onViewDetails(prospect)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/[0.04] transition-colors"
                        title="View details"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DiscoveredProspectsTable;
