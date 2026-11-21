import React from 'react';
import { Filter, RotateCcw, ArrowUpDown, Table, BarChart2 } from 'lucide-react';
import { BacklinkSearchBar } from './BacklinkSearchBar';

export const BacklinkFilterBar = ({
  search,
  onSearchChange,
  linkType,
  onLinkTypeChange,
  provider,
  onProviderChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  onResetFilters,
  activeFilterCount = 0,
  activeTab = 'table',
  onTabChange
}) => {
  return (
    <div className="surface-card rounded-2xl p-4 border border-white/[0.06] space-y-3.5 shadow-card">
      {/* Top Row: Search and View Mode Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <BacklinkSearchBar value={search} onChange={onSearchChange} />

        {/* View Mode Toggle */}
        <div className="flex items-center bg-[#101318] p-1 rounded-xl border border-white/[0.08] self-start md:self-auto flex-shrink-0">
          <button
            onClick={() => onTabChange('table')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'table'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Table View</span>
          </button>
          <button
            onClick={() => onTabChange('analysis')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'analysis'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Analysis</span>
          </button>
        </div>
      </div>

      {/* Bottom Row: Filter Dropdowns and Reset */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/[0.04] text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Link Type Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-text-muted">Type:</span>
            <select
              value={linkType}
              onChange={(e) => onLinkTypeChange(e.target.value)}
              className="bg-[#101318] border border-white/[0.08] text-text-primary rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500/50 cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="dofollow">Dofollow</option>
              <option value="nofollow">Nofollow</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>

          {/* Provider Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-text-muted">Provider:</span>
            <select
              value={provider}
              onChange={(e) => onProviderChange(e.target.value)}
              className="bg-[#101318] border border-white/[0.08] text-text-primary rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500/50 cursor-pointer"
            >
              <option value="all">All Providers</option>
              <option value="moz">Moz API</option>
              <option value="dataforseo">DataForSEO</option>
              <option value="manual">Manual</option>
            </select>
          </div>

          {/* Sort By Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-text-muted">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value)}
              className="bg-[#101318] border border-white/[0.08] text-text-primary rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500/50 cursor-pointer"
            >
              <option value="fetchedAt">Fetched Date</option>
              <option value="sourceDomain">Source Domain</option>
              <option value="anchorText">Anchor Text</option>
              <option value="linkType">Link Equity</option>
              <option value="sourceDomainAuthority">Domain Authority (DA)</option>
              <option value="firstSeen">First Seen</option>
            </select>
          </div>

          {/* Sort Order Toggle Button */}
          <button
            onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#101318] border border-white/[0.08] hover:border-white/[0.15] text-text-muted hover:text-text-primary transition-all text-xs"
            title={`Toggle Sort Direction (Currently: ${sortOrder.toUpperCase()})`}
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-mono uppercase">{sortOrder}</span>
          </button>
        </div>

        {/* Clear Filters Button (Visible when filters are active) */}
        {activeFilterCount > 0 && (
          <button
            onClick={onResetFilters}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-text-muted hover:text-text-primary border border-white/[0.08] transition-all ml-auto"
          >
            <RotateCcw className="w-3 h-3 text-amber-400" />
            <span>Reset Filters</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {activeFilterCount}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
