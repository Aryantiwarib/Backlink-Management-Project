import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Search,
  Target,
  Globe,
  Award,
  Sparkles,
  CheckCircle2,
  BookmarkPlus,
  Mail,
  Filter
} from 'lucide-react';
import { prospectApi } from '../../api/prospectService';

export const CampaignProspectSelectorModal = ({
  websiteId,
  campaignName,
  isOpen,
  onClose,
  onAssign,
  alreadyAssignedProspectIds = []
}) => {
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [initialNote, setInitialNote] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState('');

  const getProspectId = (p) => String(p?._id || p?.id || p || '');

  const assignedSet = new Set(
    (alreadyAssignedProspectIds || [])
      .map((p) => String(p?._id || p?.id || p || ''))
      .filter(Boolean)
  );

  const loadPipelineProspects = useCallback(async () => {
    if (!websiteId) return;
    setLoading(true);
    setError('');
    try {
      const data = await prospectApi.getSavedProspects(websiteId, {
        limit: 100,
        search: search.trim() || undefined,
        status: statusFilter,
        sortBy: 'opportunityScore',
        sortOrder: 'desc'
      });
      setProspects(data.prospects || []);
    } catch (err) {
      setError(err?.message || 'Failed to load saved prospects');
    } finally {
      setLoading(false);
    }
  }, [websiteId, search, statusFilter]);

  // Reset modal state only when opening the modal
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set());
      setInitialNote('');
      setError('');
      setSearch('');
      setStatusFilter('all');
    }
  }, [isOpen]);

  // Load or filter pipeline prospects without clearing selections
  useEffect(() => {
    if (isOpen) {
      loadPipelineProspects();
    }
  }, [isOpen, loadPipelineProspects]);

  if (!isOpen) return null;

  const availableProspects = prospects.filter((p) => {
    const pId = getProspectId(p);
    return pId && !assignedSet.has(pId);
  });

  const toggleSelect = (rawId) => {
    const id = String(rawId);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const availableIds = availableProspects.map(getProspectId).filter(Boolean);
    const allAvailableSelected =
      availableIds.length > 0 && availableIds.every((id) => selectedIds.has(id));

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allAvailableSelected) {
        // Deselect all visible available prospects
        availableIds.forEach((id) => next.delete(id));
      } else {
        // Select all visible available prospects
        availableIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleAssign = async () => {
    const ids = Array.from(selectedIds)
      .map((id) => String(id).trim())
      .filter(Boolean);

    if (ids.length === 0) {
      setError('Please select at least one prospect to assign.');
      return;
    }

    setAssigning(true);
    setError('');
    try {
      // Pass both structured payload and positional arguments for complete compatibility
      await onAssign(
        {
          prospectIds: ids,
          notes: initialNote.trim()
        },
        ids,
        initialNote.trim()
      );
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to assign prospects to campaign.');
    } finally {
      setAssigning(false);
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
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border ${color}`}>
        {score}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-[#15191E] border border-white/[0.1] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <BookmarkPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">
                Assign Prospects to "{campaignName}"
              </h3>
              <p className="text-xs text-text-muted">
                Select vetted domains from your Phase 9 Saved Prospects Pipeline.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/[0.04]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-4 border-b border-white/[0.06] bg-[#101419] flex flex-col sm:flex-row gap-2.5 text-xs">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter prospects by domain or notes..."
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#0D1117] border border-white/[0.08] text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#0D1117] border border-white/[0.08] rounded-xl px-2.5 py-2 text-xs text-text-primary focus:outline-none focus:border-teal-500 capitalize"
            >
              <option value="all">All Pipeline Statuses</option>
              <option value="qualified">Qualified (Highest Priority)</option>
              <option value="reviewed">Reviewed</option>
              <option value="saved">Saved</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="p-3 mx-4 mt-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Prospects List / Table */}
        <div className="p-4 overflow-y-auto flex-1 text-xs">
          {loading ? (
            <div className="py-12 text-center text-text-muted">
              <div className="w-5 h-5 border-2 border-teal-500/30 border-t-teal-400 rounded-full animate-spin mx-auto mb-2" />
              <span>Loading saved pipeline prospects...</span>
            </div>
          ) : prospects.length === 0 ? (
            <div className="py-12 text-center text-text-muted space-y-2">
              <p>No saved prospects found matching your filter.</p>
              <p className="text-[11px] text-text-muted">
                Tip: Discover and save high-authority link opportunities in the Link Prospecting tab.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] text-text-muted">
                  <th className="py-2.5 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={
                        availableProspects.length > 0 &&
                        availableProspects.every((p) => selectedIds.has(getProspectId(p)))
                      }
                      onChange={selectAll}
                      disabled={availableProspects.length === 0}
                      className="rounded border-white/[0.2] bg-[#0D1117] text-teal-500 focus:ring-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                  </th>
                  <th className="py-2.5 px-3 font-medium">Domain / Website</th>
                  <th className="py-2.5 px-3 font-medium">Score</th>
                  <th className="py-2.5 px-3 font-medium">DA</th>
                  <th className="py-2.5 px-3 font-medium">Pipeline Status</th>
                  <th className="py-2.5 px-3 font-medium">Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {prospects.map((prospect) => {
                  const pId = getProspectId(prospect);
                  const isAssigned = assignedSet.has(pId);
                  const isSelected = selectedIds.has(pId);

                  return (
                    <tr
                      key={pId}
                      className={`hover:bg-white/[0.015] transition-colors ${
                        isAssigned ? 'opacity-40 bg-white/[0.01]' : ''
                      } ${isSelected ? 'bg-teal-500/[0.04]' : ''}`}
                    >
                      <td className="py-2.5 px-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isAssigned}
                          onChange={() => toggleSelect(pId)}
                          className="rounded border-white/[0.2] bg-[#0D1117] text-teal-500 focus:ring-0 cursor-pointer disabled:cursor-not-allowed"
                        />
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <Globe className="w-3.5 h-3.5 text-text-muted shrink-0" />
                          <div>
                            <span className="font-semibold text-text-primary block truncate max-w-xs">
                              {prospect.prospectDomain}
                            </span>
                            {isAssigned && (
                              <span className="text-[10px] text-amber-400 font-medium">
                                Already assigned to this campaign
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-3">{getScoreBadge(prospect.opportunityScore)}</td>

                      <td className="py-2.5 px-3 font-mono font-medium text-text-secondary">
                        {prospect.domainAuthority !== null ? `DA ${prospect.domainAuthority}` : 'N/A'}
                      </td>

                      <td className="py-2.5 px-3 capitalize text-text-secondary">
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/[0.04] border border-white/[0.06]">
                          {prospect.status}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-text-muted truncate max-w-[140px]">
                        {prospect.contactEmail || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Optional Notes & Action Footer */}
        <div className="p-4 border-t border-white/[0.08] bg-[#101419] space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <input
              type="text"
              value={initialNote}
              onChange={(e) => setInitialNote(e.target.value)}
              placeholder="Optional assignment note or outreach angle..."
              className="flex-1 px-3 py-2 rounded-xl bg-[#0D1117] border border-white/[0.08] text-xs text-text-primary focus:outline-none focus:border-teal-500"
            />

            <div className="flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={assigning}
                className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs text-text-secondary transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleAssign}
                disabled={assigning || selectedIds.size === 0}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white font-semibold text-xs shadow-md shadow-teal-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>
                  {assigning ? 'Assigning...' : `Assign (${selectedIds.size}) to Campaign`}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignProspectSelectorModal;
