import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Search, ExternalLink, Filter, Globe, Sparkles } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import { StatusBadge } from '../common/StatusBadge';
import { TableSkeleton } from '../common/SkeletonLoader';

/**
 * Domain Initial Avatar with deterministic palette
 */
const DomainAvatar = ({ domain }) => {
  const initial = domain ? domain.charAt(0).toUpperCase() : 'W';
  
  // Deterministic subtle tint
  const colors = [
    'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    'bg-blue-500/15 text-blue-400 border-blue-500/20',
    'bg-purple-500/15 text-purple-400 border-purple-500/20',
    'bg-amber-500/15 text-amber-400 border-amber-500/20',
    'bg-teal-500/15 text-teal-400 border-teal-500/20'
  ];
  const charCode = domain.charCodeAt(0) || 0;
  const colorClass = colors[charCode % colors.length];

  return (
    <div className={`w-7 h-7 rounded-lg border flex items-center justify-center font-bold text-xs uppercase flex-shrink-0 ${colorClass}`}>
      {initial}
    </div>
  );
};

/**
 * DR Indicator Meter
 */
const DomainRatingMeter = ({ rating }) => {
  const dr = Number(rating) || 0;
  let barColor = 'bg-amber-400';
  if (dr >= 80) barColor = 'bg-emerald-400';
  else if (dr < 50) barColor = 'bg-rose-400';

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono font-bold text-xs text-text-primary w-5 text-right">{dr}</span>
      <div className="w-12 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${Math.min(dr, 100)}%` }}
        />
      </div>
    </div>
  );
};

export const RecentBacklinksTable = () => {
  const navigate = useNavigate();
  const { recentBacklinks, loadingBacklinks } = useDashboard();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Filter records
  const filtered = (recentBacklinks || []).filter((item) => {
    const matchesSearch =
      item.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.anchorText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sourcePath.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      item.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="surface-card rounded-2xl p-6">
      {/* Table Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-text-primary tracking-tight">
              Recently Acquired Backlinks
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/[0.06] text-text-secondary">
              {filtered.length} Discovered
            </span>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Your latest discovered backlinks.
          </p>
        </div>

        {/* Search, Filter, and View All */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Quick Search Input */}
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

          {/* Status Select */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#101318] border border-white/[0.08] rounded-xl px-2.5 py-1.5 text-xs text-text-secondary focus:outline-none focus:border-emerald-500/40"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="new">New</option>
            <option value="lost">Lost</option>
          </select>

          {/* View All Button */}
          <button
            onClick={() => navigate('/backlinks')}
            className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all flex-shrink-0"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Table Content */}
      {loadingBacklinks ? (
        <TableSkeleton rows={5} />
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-xs text-text-muted">
          No backlinks match the specified search or filter criteria.
        </div>
      ) : (
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="border-b border-white/[0.06] text-text-muted text-[11px] uppercase tracking-wider font-semibold">
                <th className="pb-3 pr-4">Referring Domain</th>
                <th className="pb-3 px-4">Source Page</th>
                <th className="pb-3 px-4">Anchor Text</th>
                <th className="pb-3 px-4">Domain Rating</th>
                <th className="pb-3 px-4">Est. Traffic</th>
                <th className="pb-3 px-4">Status</th>
                <th className="pb-3 pl-4 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-white/[0.02] transition-colors group cursor-default"
                >
                  {/* Referring Domain */}
                  <td className="py-3.5 pr-4">
                    <div className="flex items-center gap-2.5">
                      <DomainAvatar domain={item.domain} />
                      <div>
                        <div className="font-semibold text-text-primary hover:text-emerald-400 transition-colors flex items-center gap-1">
                          {item.domain}
                          <ExternalLink className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <span className="text-[10px] text-text-muted font-mono">
                          {item.type || 'dofollow'}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Source Page */}
                  <td className="py-3.5 px-4 font-mono text-text-secondary text-[11px]">
                    <span className="hover:text-text-primary transition-colors underline-offset-2 decoration-white/20">
                      {item.sourcePath}
                    </span>
                  </td>

                  {/* Anchor Text */}
                  <td className="py-3.5 px-4 max-w-[200px] truncate">
                    <span className="px-2 py-0.5 rounded-md bg-white/[0.04] text-text-primary text-[11px] font-medium border border-white/[0.06]">
                      "{item.anchorText}"
                    </span>
                  </td>

                  {/* Domain Rating */}
                  <td className="py-3.5 px-4">
                    <DomainRatingMeter rating={item.domainRating} />
                  </td>

                  {/* Traffic */}
                  <td className="py-3.5 px-4 font-mono font-medium text-text-secondary">
                    {item.trafficFormatted || item.traffic}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    <StatusBadge status={item.status} size="xs" />
                  </td>

                  {/* Date */}
                  <td className="py-3.5 pl-4 text-right text-text-muted text-[11px]">
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
