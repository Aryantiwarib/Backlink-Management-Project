import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Search, ExternalLink, Link2, Wrench } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import { TableSkeleton } from '../common/SkeletonLoader';

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

export const RecentBacklinksTable = () => {
  const navigate = useNavigate();
  const { recentBacklinks, loadingDashboard, website } = useDashboard();
  const [searchTerm, setSearchTerm] = useState('');

  // Filter records in memory
  const filtered = (recentBacklinks || []).filter((item) => {
    const term = searchTerm.toLowerCase();
    return (
      (item.domain || '').toLowerCase().includes(term) ||
      (item.anchorText || '').toLowerCase().includes(term) ||
      (item.sourceUrl || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="surface-card rounded-2xl p-6">
      {/* Table Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-text-primary tracking-tight">
              Recently Discovered Backlinks
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-white/[0.06] text-text-secondary">
              {recentBacklinks.length} in View
            </span>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Latest backlink records saved in MongoDB for{' '}
            <span className="font-mono text-emerald-400">{website?.domain || 'active website'}</span>
          </p>
        </div>

        {/* Search & View All in SEO Tools */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <div className="relative w-full sm:w-48">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter by domain..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#101318] border border-white/[0.08] rounded-xl pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-emerald-500/40"
            />
          </div>

          <button
            onClick={() => navigate('/seo-tools')}
            className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 px-3.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all flex-shrink-0"
          >
            <span>View All & Manage</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Table Content */}
      {loadingDashboard ? (
        <TableSkeleton rows={5} />
      ) : recentBacklinks.length === 0 ? (
        <div className="py-12 text-center text-xs text-text-muted space-y-3">
          <Link2 className="w-8 h-8 text-text-muted mx-auto opacity-40" />
          <div>
            <p className="font-semibold text-text-secondary text-sm">No Backlinks Stored in Database</p>
            <p className="text-[11px] text-text-muted mt-0.5">
              Backlinks discovered from Moz API or manually added will appear here.
            </p>
          </div>
          <button
            onClick={() => navigate('/seo-tools')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 text-xs font-semibold transition-colors"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Open SEO Tools</span>
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="border-b border-white/[0.06] text-text-muted text-[11px] uppercase tracking-wider font-semibold">
                <th className="pb-3 pr-4">Referring Domain</th>
                <th className="pb-3 px-4">Source Page</th>
                <th className="pb-3 px-4">Anchor Text</th>
                <th className="pb-3 px-4">Authority</th>
                <th className="pb-3 px-4">Type</th>
                <th className="pb-3 pl-4 text-right">Discovered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group cursor-default">
                  {/* Referring Domain */}
                  <td className="py-3.5 pr-4">
                    <div className="flex items-center gap-2.5">
                      <DomainAvatar domain={item.domain} />
                      <div>
                        <div className="font-semibold text-text-primary hover:text-emerald-400 transition-colors flex items-center gap-1">
                          <span>{item.domain}</span>
                          <a
                            href={item.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block"
                          >
                            <ExternalLink className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                          </a>
                        </div>
                        <span className="text-[10px] text-text-muted font-mono">{item.provider || 'moz'}</span>
                      </div>
                    </div>
                  </td>

                  {/* Source Page Path */}
                  <td className="py-3.5 px-4 font-mono text-text-secondary text-[11px] max-w-[200px] truncate">
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-text-primary hover:underline transition-colors"
                      title={item.sourceUrl}
                    >
                      {item.sourcePath}
                    </a>
                  </td>

                  {/* Anchor Text */}
                  <td className="py-3.5 px-4 max-w-[200px] truncate">
                    <span className="px-2 py-0.5 rounded-md bg-white/[0.04] text-text-primary text-[11px] font-medium border border-white/[0.06]">
                      "{item.anchorText}"
                    </span>
                  </td>

                  {/* Domain Rating */}
                  <td className="py-3.5 px-4 font-mono">
                    {item.domainRating !== null ? (
                      <span className="text-emerald-400 font-semibold font-mono">
                        DA {item.domainRating}
                      </span>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>

                  {/* Type */}
                  <td className="py-3.5 px-4">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        item.linkType === 'dofollow'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : item.linkType === 'nofollow'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-white/[0.04] text-text-muted border border-white/[0.06]'
                      }`}
                    >
                      {item.linkType}
                    </span>
                  </td>

                  {/* Acquired Date */}
                  <td className="py-3.5 pl-4 text-right text-text-muted text-[11px] font-mono">
                    {item.acquiredDate}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
