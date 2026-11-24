import React, { useState } from 'react';
import {
  ExternalLink,
  Globe,
  Trash2,
  Calendar,
  Clock,
  CheckCircle2,
  ChevronDown,
  Edit2,
  Check,
  Mail,
  AlertCircle
} from 'lucide-react';

const OUTREACH_OPTIONS = [
  { id: 'uncontacted', label: 'Uncontacted' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'follow_up_due', label: 'Follow-up Due' },
  { id: 'replied', label: 'Replied' },
  { id: 'negotiating', label: 'Negotiating' },
  { id: 'link_acquired', label: 'Link Acquired' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'unresponsive', label: 'Unresponsive' }
];

export const CampaignProspectTable = ({
  assignments = [],
  loading = false,
  onUpdateStatus,
  onUpdateAssignment,
  onRemoveAssignment,
  onBulkUpdateStatus,
  onOpenProspectSelector
}) => {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [editNotes, setEditNotes] = useState('');
  const [editFollowUp, setEditFollowUp] = useState('');
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const getAssignmentId = (a) => String(a?._id || a?.id || a || '');

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
    const allIds = assignments.map(getAssignmentId).filter(Boolean);
    const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  const handleBulkStatusChange = async (status) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkStatusOpen(false);
    await onBulkUpdateStatus(ids, status);
    setSelectedIds(new Set());
  };

  const startEdit = (assignment) => {
    setEditingAssignment(assignment);
    setEditNotes(assignment.notes || '');
    setEditFollowUp(
      assignment.followUpAt ? new Date(assignment.followUpAt).toISOString().split('T')[0] : ''
    );
  };

  const handleSaveEdit = async () => {
    if (!editingAssignment) return;
    setSavingEdit(true);
    try {
      await onUpdateAssignment(editingAssignment.id, {
        notes: editNotes,
        followUpAt: editFollowUp ? new Date(editFollowUp) : null
      });
      setEditingAssignment(null);
    } finally {
      setSavingEdit(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'link_acquired':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'negotiating':
        return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
      case 'replied':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'contacted':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'follow_up_due':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'rejected':
      case 'unresponsive':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'uncontacted':
      default:
        return 'bg-white/[0.04] text-text-muted border-white/[0.08]';
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

  if (loading) {
    return (
      <div className="p-12 rounded-2xl bg-[#15191E] border border-white/[0.08] text-center text-text-muted text-xs">
        <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin mx-auto mb-2" />
        <span>Loading campaign prospects...</span>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="p-10 rounded-2xl bg-[#15191E] border border-white/[0.08] text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center mx-auto text-text-muted">
          <Globe className="w-6 h-6 text-emerald-400" />
        </div>
        <h4 className="text-sm font-semibold text-text-primary">No Prospects Assigned Yet</h4>
        <p className="text-xs text-text-muted max-w-md mx-auto leading-relaxed">
          Select vetted link candidates from your Phase 9 Saved Prospects Pipeline to begin outreach and track link acquisitions.
        </p>
        <button
          onClick={onOpenProspectSelector}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold text-xs shadow-md shadow-emerald-500/20 transition-all"
        >
          <span>Select Prospects from Pipeline</span>
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-[#15191E] border border-white/[0.08] overflow-hidden space-y-0">
      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="p-3 bg-emerald-500/10 border-b border-emerald-500/20 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-emerald-300">
            {selectedIds.size} assigned prospects selected
          </span>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setBulkStatusOpen(!bulkStatusOpen)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors font-medium text-xs"
              >
                <span>Update Outreach Status</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {bulkStatusOpen && (
                <div className="absolute right-0 mt-1 w-44 rounded-xl bg-[#15191E] border border-white/[0.1] shadow-2xl p-1 z-50 text-xs">
                  {OUTREACH_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => handleBulkStatusChange(opt.id)}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/[0.05] text-text-primary"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-[11px] text-text-muted hover:text-text-primary underline ml-2"
            >
              Deselect all
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/[0.06] bg-[#101419] text-text-muted">
              <th className="py-3 px-4 w-10">
                <input
                  type="checkbox"
                  checked={
                    assignments.length > 0 &&
                    assignments.every((a) => selectedIds.has(getAssignmentId(a)))
                  }
                  onChange={selectAll}
                  disabled={assignments.length === 0}
                  className="rounded border-white/[0.2] bg-[#0D1117] text-emerald-500 focus:ring-0 cursor-pointer disabled:cursor-not-allowed"
                />
              </th>
              <th className="py-3 px-4 font-medium">Domain / Landing URL</th>
              <th className="py-3 px-4 font-medium">Opportunity</th>
              <th className="py-3 px-4 font-medium">Outreach Status</th>
              <th className="py-3 px-4 font-medium">Contact / Follow-Up</th>
              <th className="py-3 px-4 font-medium">Campaign Notes</th>
              <th className="py-3 px-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {assignments.map((assignment) => {
              const aId = getAssignmentId(assignment);
              const isSelected = selectedIds.has(aId);
              const prospect = assignment.prospect || {};

              return (
                <tr
                  key={aId}
                  className={`hover:bg-white/[0.015] transition-colors ${
                    isSelected ? 'bg-emerald-500/[0.03]' : ''
                  }`}
                >
                  <td className="py-3.5 px-4">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(aId)}
                      className="rounded border-white/[0.2] bg-[#0D1117] text-emerald-500 focus:ring-0 cursor-pointer"
                    />
                  </td>

                  {/* Domain & URL */}
                  <td className="py-3.5 px-4 max-w-xs">
                    <div className="flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-text-muted shrink-0" />
                      <div className="truncate">
                        <span className="font-semibold text-text-primary block truncate">
                          {prospect.prospectDomain || 'Unknown Domain'}
                        </span>
                        <a
                          href={prospect.prospectUrl || `https://${prospect.prospectDomain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-text-muted hover:text-emerald-400 inline-flex items-center gap-1 truncate"
                        >
                          <span className="truncate">{prospect.prospectUrl}</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                        </a>
                      </div>
                    </div>
                  </td>

                  {/* Score & DA */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getScoreBadge(prospect.opportunityScore)}
                      <span className="font-mono text-text-secondary font-medium">
                        {prospect.domainAuthority !== null ? `DA ${prospect.domainAuthority}` : 'N/A'}
                      </span>
                    </div>
                  </td>

                  {/* Outreach Status Selector */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <select
                      value={assignment.outreachStatus}
                      onChange={(e) => onUpdateStatus(assignment.id, e.target.value)}
                      className={`border rounded-lg px-2.5 py-1 text-[11px] font-semibold focus:outline-none cursor-pointer bg-[#0D1117] ${getStatusBadge(
                        assignment.outreachStatus
                      )}`}
                    >
                      {OUTREACH_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id} className="bg-[#15191E] text-text-primary">
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Contact / Follow-up info */}
                  <td className="py-3.5 px-4 whitespace-nowrap text-[11px] text-text-muted">
                    {prospect.contactEmail && (
                      <div className="flex items-center gap-1 text-text-secondary mb-0.5">
                        <Mail className="w-3 h-3 text-emerald-400" />
                        <span>{prospect.contactEmail}</span>
                      </div>
                    )}
                    {assignment.followUpAt && (
                      <div className="flex items-center gap-1 text-amber-300">
                        <Calendar className="w-3 h-3" />
                        <span>Due {new Date(assignment.followUpAt).toLocaleDateString()}</span>
                      </div>
                    )}
                    {!prospect.contactEmail && !assignment.followUpAt && (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>

                  {/* Campaign Notes */}
                  <td className="py-3.5 px-4 max-w-[200px]">
                    {assignment.notes ? (
                      <div
                        onClick={() => startEdit(assignment)}
                        className="text-[11px] text-text-secondary truncate cursor-pointer hover:text-text-primary"
                        title={assignment.notes}
                      >
                        "{assignment.notes}"
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(assignment)}
                        className="text-[11px] text-text-muted hover:text-emerald-400 flex items-center gap-1"
                      >
                        <Edit2 className="w-2.5 h-2.5" />
                        <span>Add notes</span>
                      </button>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => startEdit(assignment)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/[0.04] transition-colors"
                        title="Edit Notes & Schedule Follow-Up"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() =>
                          onRemoveAssignment(
                            assignment.id,
                            prospect.prospectDomain || 'prospect'
                          )
                        }
                        className="p-1.5 rounded-lg text-text-muted hover:text-rose-400 hover:bg-white/[0.04] transition-colors"
                        title="Remove from campaign (preserves Phase 9 prospect)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Edit Notes & Follow-up Drawer/Modal */}
      {editingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#15191E] border border-white/[0.1] rounded-3xl p-5 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <h4 className="font-bold text-text-primary">
                  {editingAssignment.prospect?.prospectDomain}
                </h4>
                <p className="text-[11px] text-text-muted">Campaign Outreach Details</p>
              </div>
              <button
                onClick={() => setEditingAssignment(null)}
                className="p-1 rounded-lg text-text-muted hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-text-muted block mb-1">
                  Follow-Up Date
                </label>
                <input
                  type="date"
                  value={editFollowUp}
                  onChange={(e) => setEditFollowUp(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0D1117] border border-white/[0.08] text-xs text-text-primary focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-text-muted block mb-1">
                  Campaign Outreach Notes
                </label>
                <textarea
                  rows={4}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Record editorial angles, response feedback, pricing terms, or follow-up notes..."
                  className="w-full p-3 rounded-xl bg-[#0D1117] border border-white/[0.08] text-xs text-text-primary focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
              <button
                onClick={() => setEditingAssignment(null)}
                className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] text-text-secondary text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-xs shadow-md shadow-emerald-500/20"
              >
                {savingEdit ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignProspectTable;
