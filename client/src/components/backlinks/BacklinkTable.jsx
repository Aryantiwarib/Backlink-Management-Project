import React, { useState } from 'react';
import {
  ExternalLink,
  Copy,
  Check,
  Eye,
  Link2,
  AlertCircle,
  Wrench,
  RotateCcw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';

/**
 * Domain Initial Avatar with deterministic palette
 */
const DomainAvatar = ({ domain }) => {
  const initial = domain ? domain.charAt(0).toUpperCase() : 'W';
  const colors = [
    'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    'bg-blue-500/15 text-blue-400 border-blue-500/20',
    'bg-purple-500/15 text-purple-400 border-purple-500/20',
    'bg-amber-500/15 text-amber-400 border-amber-500/20',
    'bg-teal-500/15 text-teal-400 border-teal-500/20'
  ];
  const charCode = (domain || '').charCodeAt(0) || 0;
  const colorClass = colors[charCode % colors.length];

  return (
    <div
      className={`w-7 h-7 rounded-lg border flex items-center justify-center font-bold text-xs uppercase flex-shrink-0 ${colorClass}`}
    >
      {initial}
    </div>
  );
};

export const BacklinkTable = ({
  backlinks = [],
  loading = false,
  website,
  hasActiveFilters = false,
  onResetFilters,
  onSelectBacklink
}) => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [copiedId, setCopiedId] = useState(null);

  const handleCopy = (text, id, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    addToast('Copied to clipboard', 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper for Link Type badge
  const renderLinkTypeBadge = (type) => {
    switch (type?.toLowerCase()) {
      case 'dofollow':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            dofollow
          </span>
        );
      case 'nofollow':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            nofollow
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-white/[0.04] text-text-muted border border-white/[0.08]">
            {type || 'unknown'}
          </span>
        );
    }
  };

  // 1. Loading Skeleton Rows
  if (loading) {
    return (
      <div className="surface-card rounded-2xl border border-white/[0.06] overflow-hidden shadow-card">
        <div className="p-4 border-b border-white/[0.04] flex items-center justify-between">
          <div className="h-4 w-32 bg-white/[0.05] rounded animate-pulse" />
          <div className="h-4 w-20 bg-white/[0.05] rounded animate-pulse" />
        </div>
        <div className="divide-y divide-white/[0.03]">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4 animate-pulse">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-8 h-8 rounded-lg bg-white/[0.05]" />
                <div className="space-y-1.5 flex-1 max-w-sm">
                  <div className="h-3.5 bg-white/[0.05] rounded w-3/4" />
                  <div className="h-2.5 bg-white/[0.05] rounded w-1/2" />
                </div>
              </div>
              <div className="h-4 w-24 bg-white/[0.05] rounded hidden md:block" />
              <div className="h-5 w-16 bg-white/[0.05] rounded-full" />
              <div className="h-4 w-16 bg-white/[0.05] rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. Empty State: No matches for active filter/search
  if (backlinks.length === 0 && hasActiveFilters) {
    return (
      <div className="surface-card rounded-2xl border border-white/[0.06] p-12 text-center space-y-4 shadow-card">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="max-w-md mx-auto">
          <h3 className="text-sm font-bold text-text-primary">No Matching Backlinks Found</h3>
          <p className="text-xs text-text-muted mt-1 leading-relaxed">
            No backlink records match your search query and active filter parameters.
          </p>
        </div>
        <button
          onClick={onResetFilters}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-text-primary text-xs font-semibold border border-white/[0.1] transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset All Filters</span>
        </button>
      </div>
    );
  }

  // 3. Empty State: Database has zero backlinks recorded for this domain
  if (backlinks.length === 0 && !hasActiveFilters) {
    return (
      <div className="surface-card rounded-2xl border border-white/[0.06] p-12 text-center space-y-4 shadow-card">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
          <Link2 className="w-6 h-6" />
        </div>
        <div className="max-w-md mx-auto">
          <h3 className="text-sm font-bold text-text-primary">
            No Backlinks Stored for {website?.domain || 'this website'}
          </h3>
          <p className="text-xs text-text-muted mt-1 leading-relaxed">
            You haven't synced or imported any backlink records for this website yet. Fetch real metrics from the Moz API in SEO Tools to populate your database.
          </p>
        </div>
        <button
          onClick={() => navigate('/seo-tools')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold transition-all shadow-glow-brand"
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Go to SEO Tools & Sync Moz Data</span>
        </button>
      </div>
    );
  }

  // 4. Data Table
  return (
    <div className="surface-card rounded-2xl border border-white/[0.06] overflow-hidden shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/[0.06] bg-[#0E1116] text-[11px] font-semibold text-text-muted uppercase tracking-wider">
              <th className="py-3.5 px-4">Source Page & Domain</th>
              <th className="py-3.5 px-4">Target Landing Page</th>
              <th className="py-3.5 px-4">Anchor Text</th>
              <th className="py-3.5 px-4 text-center">Type</th>
              <th className="py-3.5 px-4 text-center">Source DA</th>
              <th className="py-3.5 px-4">Fetched</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03] text-xs">
            {backlinks.map((link) => {
              const domain = link.sourceDomain || 'unknown';
              const isCopied = copiedId === link.id;

              return (
                <tr
                  key={link.id}
                  onClick={() => onSelectBacklink(link)}
                  className="hover:bg-white/[0.02] cursor-pointer transition-colors group"
                >
                  {/* Source Page & Domain */}
                  <td className="py-3.5 px-4 max-w-[280px]">
                    <div className="flex items-center gap-2.5">
                      <DomainAvatar domain={domain} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-text-primary group-hover:text-emerald-400 transition-colors truncate">
                            {domain}
                          </span>
                          <a
                            href={link.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-text-muted hover:text-emerald-400 transition-colors flex-shrink-0"
                            title="Open source URL in new tab"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <p
                          className="text-[11px] font-mono text-text-muted truncate mt-0.5"
                          title={link.sourceUrl}
                        >
                          {link.sourceUrl}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Target Landing Page */}
                  <td className="py-3.5 px-4 max-w-[200px]">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="font-mono text-[11px] text-text-secondary truncate block"
                        title={link.targetUrl}
                      >
                        {link.targetUrl.replace(/^https?:\/\/[^/]+/, '') || '/'}
                      </span>
                      <a
                        href={link.targetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-text-muted hover:text-emerald-400 transition-colors flex-shrink-0"
                        title="Open landing page in new tab"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </td>

                  {/* Anchor Text */}
                  <td className="py-3.5 px-4 max-w-[220px]">
                    <div className="flex items-center justify-between gap-1 group/anchor">
                      <span
                        className="text-text-primary font-medium truncate italic"
                        title={link.anchorText || 'No anchor text'}
                      >
                        {link.anchorText ? `"${link.anchorText}"` : <span className="text-text-muted not-italic">No anchor text</span>}
                      </span>
                      {link.anchorText && (
                        <button
                          onClick={(e) => handleCopy(link.anchorText, `anchor-${link.id}`, e)}
                          className="opacity-0 group-hover/anchor:opacity-100 p-1 text-text-muted hover:text-text-primary transition-all flex-shrink-0"
                          title="Copy anchor text"
                        >
                          {copiedId === `anchor-${link.id}` ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Link Equity Type */}
                  <td className="py-3.5 px-4 text-center">
                    {renderLinkTypeBadge(link.linkType)}
                  </td>

                  {/* Source DA */}
                  <td className="py-3.5 px-4 text-center">
                    {link.sourceDomainAuthority !== null && link.sourceDomainAuthority !== undefined ? (
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-text-primary">
                        {link.sourceDomainAuthority}
                      </span>
                    ) : (
                      <span className="text-text-muted font-mono">—</span>
                    )}
                  </td>

                  {/* Fetched Date */}
                  <td className="py-3.5 px-4 whitespace-nowrap text-[11px] text-text-muted font-mono">
                    {new Date(link.fetchedAt).toLocaleDateString()}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectBacklink(link);
                      }}
                      className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-emerald-500/10 text-text-muted hover:text-emerald-400 border border-white/[0.06] hover:border-emerald-500/20 transition-all inline-flex items-center gap-1 text-[11px] font-semibold"
                      title="View Backlink Details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Details</span>
                    </button>
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
