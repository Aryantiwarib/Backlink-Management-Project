import React, { useState } from 'react';
import {
  ExternalLink,
  Search,
  Filter,
  Download,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  HelpCircle,
  ChevronDown,
  Globe,
  FileText,
  Edit2,
  Check,
  Sparkles
} from 'lucide-react';
import { FloatingGenerateMailButton } from '../outreach/FloatingGenerateMailButton';
import { GenerateMailModal } from '../outreach/GenerateMailModal';

export const SavedProspectsTable = ({
  prospects = [],
  loading = false,
  pagination,
  onPageChange,
  filters,
  onFilterChange,
  onUpdateStatus,
  onDeleteProspect,
  onBulkUpdateStatus,
  onBulkDelete,
  onExportCsv,
  onViewDetails,
  onDraftEmail = null
}) => {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [generateMailOpen, setGenerateMailOpen] = useState(false);
  const [modalProspects, setModalProspects] = useState([]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === prospects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(prospects.map((p) => p.id)));
    }
  };

  const handleBulkStatus = async (status) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setActionLoading(true);
    setBulkStatusOpen(false);
    try {
      await onBulkUpdateStatus(ids, status);
      setSelectedIds(new Set());
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!window.confirm(`Are you sure you want to remove ${ids.length} prospects?`)) return;
    setActionLoading(true);
    try {
      await onBulkDelete(ids);
      setSelectedIds(new Set());
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'qualified':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Qualified
          </span>
        );
      case 'reviewed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Clock className="w-3 h-3" />
            Reviewed
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        );
      case 'saved':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Saved
          </span>
        );
    }
  };

  const getScoreBadge = (score) => {
    if (score === null || score === undefined) {
      return <span className="text-text-muted font-mono text-[11px]">N/A</span>;
    }
    const color =
      score >= 75
        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
        : score >= 50
        ? 'text-blue-400 bg-blue-500/10 border-blue-500/20'
        : 'text-amber-400 bg-amber-500/10 border-amber-500/20';

    return (
      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold font-mono border ${color}`}>
        {score}/100
      </span>
    );
  };

  return (
    <div className="rounded-2xl bg-[#15191E] border border-white/[0.08] overflow-hidden space-y-0">
      {/* Search and Filters Toolbar */}
      <div className="p-4 sm:p-5 border-b border-white/[0.08] space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => onFilterChange('search', e.target.value)}
              placeholder="Search by domain, URL, notes, or keyword..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#0D1117] border border-white/[0.08] text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Filter dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status filter */}
            <select
              value={filters.status}
              onChange={(e) => onFilterChange('status', e.target.value)}
              className="bg-[#0D1117] border border-white/[0.08] rounded-xl px-2.5 py-2 text-xs text-text-primary focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Statuses</option>
              <option value="saved">Saved</option>
              <option value="reviewed">Reviewed</option>
              <option value="qualified">Qualified</option>
              <option value="rejected">Rejected</option>
            </select>

            {/* Source filter */}
            <select
              value={filters.source}
              onChange={(e) => onFilterChange('source', e.target.value)}
              className="bg-[#0D1117] border border-white/[0.08] rounded-xl px-2.5 py-2 text-xs text-text-primary focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Sources</option>
              <option value="competitor">Competitor Backlinks</option>
              <option value="keyword">Keyword Discovery</option>
              <option value="directory">Directory</option>
              <option value="manual">Manual Entry</option>
            </select>

            {/* Sort selector */}
            <select
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split('-');
                onFilterChange('sortBy', sb);
                onFilterChange('sortOrder', so);
              }}
              className="bg-[#0D1117] border border-white/[0.08] rounded-xl px-2.5 py-2 text-xs text-text-primary focus:outline-none focus:border-emerald-500"
            >
              <option value="opportunityScore-desc">Opportunity Score (High to Low)</option>
              <option value="domainAuthority-desc">Domain Authority (High to Low)</option>
              <option value="createdAt-desc">Recently Saved</option>
              <option value="prospectDomain-asc">Domain Name (A-Z)</option>
            </select>

            {/* Export CSV button */}
            <button
              onClick={onExportCsv}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-text-secondary hover:text-text-primary transition-colors"
              title="Export saved prospects to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        </div>

        {/* Bulk Action Bar when items selected */}
        {selectedIds.size > 0 && (
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-emerald-300">
              {selectedIds.size} prospects selected
            </span>

            <div className="flex items-center gap-2">
              {/* Generate Mail button */}
              <button
                type="button"
                onClick={() => {
                  const selected = prospects.filter((p) => selectedIds.has(p.id || p._id));
                  setModalProspects(selected);
                  setGenerateMailOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-colors shadow-md shadow-emerald-500/20 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate Mail ({selectedIds.size})</span>
              </button>

              {/* Change status menu */}
              <div className="relative">
                <button
                  onClick={() => setBulkStatusOpen(!bulkStatusOpen)}
                  disabled={actionLoading}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors font-medium text-xs"
                >
                  <span>Change Status</span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                {bulkStatusOpen && (
                  <div className="absolute right-0 mt-1 w-36 rounded-xl bg-[#15191E] border border-white/[0.1] shadow-2xl p-1 z-50 text-xs">
                    {['saved', 'reviewed', 'qualified', 'rejected'].map((st) => (
                      <button
                        key={st}
                        onClick={() => handleBulkStatus(st)}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/[0.05] capitalize text-text-primary"
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Bulk delete */}
              <button
                onClick={handleBulkDelete}
                disabled={actionLoading}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors font-medium text-xs border border-rose-500/20"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </button>

              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-text-muted hover:text-text-primary text-[11px] underline ml-2"
              >
                Deselect all
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/[0.06] bg-[#101419] text-text-muted">
              <th className="py-3 px-4 w-10">
                <input
                  type="checkbox"
                  checked={prospects.length > 0 && selectedIds.size === prospects.length}
                  onChange={selectAll}
                  disabled={prospects.length === 0}
                  className="rounded border-white/[0.2] bg-[#0D1117] text-emerald-500 focus:ring-0 cursor-pointer"
                />
              </th>
              <th className="py-3 px-4 font-medium">Domain / Website</th>
              <th className="py-3 px-4 font-medium">Status</th>
              <th className="py-3 px-4 font-medium">Opportunity Score</th>
              <th className="py-3 px-4 font-medium">Authority</th>
              <th className="py-3 px-4 font-medium">Source</th>
              <th className="py-3 px-4 font-medium">Notes</th>
              <th className="py-3 px-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-text-muted">
                  <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin mx-auto mb-2" />
                  Loading prospects pipeline...
                </td>
              </tr>
            ) : prospects.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-text-muted">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center mx-auto mb-3 text-text-muted">
                    <Globe className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h4 className="text-sm font-semibold text-text-primary">No Saved Prospects</h4>
                  <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
                    {filters.search || filters.status !== 'all' || filters.source !== 'all'
                      ? 'No prospects match your active search and filter criteria.'
                      : 'You have not saved any prospects yet. Switch to the Discovery tab to find high-value link candidates.'}
                  </p>
                </td>
              </tr>
            ) : (
              prospects.map((prospect) => {
                const isSelected = selectedIds.has(prospect.id);

                return (
                  <tr
                    key={prospect.id}
                    className={`hover:bg-white/[0.015] transition-colors ${
                      isSelected ? 'bg-emerald-500/[0.03]' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(prospect.id)}
                        className="rounded border-white/[0.2] bg-[#0D1117] text-emerald-500 focus:ring-0 cursor-pointer"
                      />
                    </td>

                    {/* Domain & URL */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-text-muted shrink-0" />
                        <div className="truncate max-w-xs">
                          <button
                            type="button"
                            onClick={() => onViewDetails(prospect)}
                            className="font-medium text-text-primary hover:text-emerald-400 transition-colors text-left truncate block"
                          >
                            {prospect.prospectDomain}
                          </button>
                          <a
                            href={prospect.prospectUrl || `https://${prospect.prospectDomain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-text-muted hover:text-text-secondary truncate flex items-center gap-1"
                          >
                            <span className="truncate">{prospect.prospectUrl}</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-60 shrink-0" />
                          </a>
                        </div>
                      </div>
                    </td>

                    {/* Status with inline change selector */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <select
                        value={prospect.status}
                        onChange={(e) => onUpdateStatus(prospect.id || prospect._id, e.target.value)}
                        className="bg-[#0D1117] border border-white/[0.08] rounded-lg px-2 py-1 text-[11px] font-medium text-text-primary focus:outline-none focus:border-emerald-500 cursor-pointer capitalize"
                      >
                        <option value="saved">Saved</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="qualified">Qualified</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </td>

                    {/* Opportunity Score */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onViewDetails(prospect)}
                        className="hover:opacity-80 transition-opacity"
                        title="Click to view score breakdown"
                      >
                        {getScoreBadge(prospect.opportunityScore)}
                      </button>
                    </td>

                    {/* Authority */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {prospect.domainAuthority !== null ? (
                        <div className="font-mono text-text-primary font-semibold">
                          DA {prospect.domainAuthority}
                        </div>
                      ) : (
                        <span className="text-text-muted font-mono text-[11px]">N/A</span>
                      )}
                    </td>

                    {/* Source */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-text-secondary capitalize">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/[0.04] border border-white/[0.06] text-text-muted">
                        {prospect.source}
                      </span>
                    </td>

                    {/* Notes preview */}
                    <td className="py-3.5 px-4">
                      {prospect.notes ? (
                        <div
                          onClick={() => onViewDetails(prospect)}
                          className="truncate max-w-[180px] text-[11px] text-text-muted hover:text-text-primary cursor-pointer"
                          title={prospect.notes}
                        >
                          "{prospect.notes}"
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onViewDetails(prospect)}
                          className="text-[11px] text-text-muted hover:text-emerald-400 flex items-center gap-1"
                        >
                          <Edit2 className="w-2.5 h-2.5" />
                          <span>Add note</span>
                        </button>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {onDraftEmail && (
                          <button
                            type="button"
                            onClick={() => onDraftEmail(prospect)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 text-[11px] font-medium transition-colors"
                            title="Generate personalized outreach email"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Pitch</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onViewDetails(prospect)}
                          className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary hover:text-text-primary text-[11px] transition-colors"
                        >
                          Details
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteProspect(prospect.id || prospect._id)}
                          className="p-1 rounded-lg text-text-muted hover:text-rose-400 hover:bg-white/[0.04] transition-colors"
                          title="Delete prospect"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {pagination && pagination.totalPages > 1 && (
        <div className="p-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-text-muted bg-[#101419]">
          <span>
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} prospects)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
      {/* Floating Action Button when 1+ prospects are selected */}
      <FloatingGenerateMailButton
        selectedCount={selectedIds.size}
        onClick={() => {
          const selected = prospects.filter((p) => selectedIds.has(p.id || p._id));
          setModalProspects(selected);
          setGenerateMailOpen(true);
        }}
      />

      {/* Generate Mail Modal */}
      {generateMailOpen && (
        <GenerateMailModal
          isOpen={generateMailOpen}
          onClose={() => {
            setGenerateMailOpen(false);
            setModalProspects([]);
          }}
          selectedProspects={
            modalProspects.length > 0
              ? modalProspects
              : prospects.filter((p) => selectedIds.has(p.id || p._id))
          }
        />
      )}
    </div>
  );
};

export default SavedProspectsTable;
