import React from 'react';
import {
  Globe,
  ExternalLink,
  Calendar,
  Mail,
  CheckCircle2,
  ChevronRight,
  MoreHorizontal
} from 'lucide-react';

const KANBAN_COLUMNS = [
  { id: 'uncontacted', title: 'Uncontacted', color: 'border-white/10 text-text-muted' },
  { id: 'contacted', title: 'Contacted', color: 'border-indigo-500/30 text-indigo-400' },
  { id: 'follow_up_due', title: 'Follow-Up Due', color: 'border-amber-500/30 text-amber-400' },
  { id: 'replied', title: 'Replied', color: 'border-blue-500/30 text-blue-400' },
  { id: 'negotiating', title: 'Negotiating', color: 'border-teal-500/30 text-teal-400' },
  { id: 'link_acquired', title: 'Link Acquired', color: 'border-emerald-500/30 text-emerald-400' },
  { id: 'rejected', title: 'Rejected / Dead', color: 'border-rose-500/30 text-rose-400' }
];

const ALL_STATUSES = [
  'uncontacted',
  'contacted',
  'follow_up_due',
  'replied',
  'negotiating',
  'link_acquired',
  'rejected',
  'unresponsive'
];

export const CampaignKanbanBoard = ({
  assignments = [],
  onUpdateStatus,
  onRemoveAssignment
}) => {
  const getScoreBadge = (score) => {
    if (score === null || score === undefined) return null;
    const color =
      score >= 75
        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
        : score >= 50
        ? 'text-blue-400 bg-blue-500/10 border-blue-500/20'
        : 'text-amber-400 bg-amber-500/10 border-amber-500/20';

    return (
      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono border ${color}`}>
        {score}
      </span>
    );
  };

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-3 min-w-[1200px]">
        {KANBAN_COLUMNS.map((column) => {
          const colAssignments = assignments.filter((a) => {
            if (column.id === 'rejected') {
              return a.outreachStatus === 'rejected' || a.outreachStatus === 'unresponsive';
            }
            return a.outreachStatus === column.id;
          });

          return (
            <div
              key={column.id}
              className="flex-1 min-w-[200px] max-w-[260px] bg-[#12161C] border border-white/[0.06] rounded-2xl p-3 flex flex-col max-h-[75vh]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/[0.06]">
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-bold ${column.color}`}>{column.title}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/[0.04] text-text-muted">
                  {colAssignments.length}
                </span>
              </div>

              {/* Cards list */}
              <div className="space-y-2.5 overflow-y-auto pr-1 flex-1">
                {colAssignments.map((assignment) => {
                  const prospect = assignment.prospect || {};

                  return (
                    <div
                      key={assignment.id}
                      className="p-3 rounded-xl bg-[#171B22] border border-white/[0.06] hover:border-white/[0.14] transition-all space-y-2 group shadow-sm text-xs"
                    >
                      {/* Domain Header */}
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="truncate flex-1">
                          <span className="font-bold text-text-primary block truncate text-[11px]">
                            {prospect.prospectDomain || 'Unknown'}
                          </span>
                          <span className="text-[10px] text-text-muted font-mono block">
                            {prospect.domainAuthority !== null ? `DA ${prospect.domainAuthority}` : 'DA N/A'}
                          </span>
                        </div>
                        {getScoreBadge(prospect.opportunityScore)}
                      </div>

                      {/* Notes snippet */}
                      {assignment.notes && (
                        <p className="text-[10px] text-text-muted italic line-clamp-2 bg-black/20 p-1.5 rounded-lg border border-white/[0.02]">
                          "{assignment.notes}"
                        </p>
                      )}

                      {/* Contact & Follow-up */}
                      {(prospect.contactEmail || assignment.followUpAt) && (
                        <div className="space-y-1 text-[10px] pt-1 border-t border-white/[0.04]">
                          {prospect.contactEmail && (
                            <div className="flex items-center gap-1 text-text-secondary truncate">
                              <Mail className="w-2.5 h-2.5 shrink-0 text-emerald-400" />
                              <span className="truncate">{prospect.contactEmail}</span>
                            </div>
                          )}
                          {assignment.followUpAt && (
                            <div className="flex items-center gap-1 text-amber-300">
                              <Calendar className="w-2.5 h-2.5 shrink-0" />
                              <span>Due {new Date(assignment.followUpAt).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Move to next stage selector */}
                      <div className="pt-1.5 border-t border-white/[0.04] flex items-center justify-between text-[10px]">
                        <span className="text-text-muted">Stage:</span>
                        <select
                          value={assignment.outreachStatus}
                          onChange={(e) => onUpdateStatus(assignment.id, e.target.value)}
                          className="bg-[#0D1117] border border-white/[0.08] rounded px-1.5 py-0.5 text-[10px] text-text-primary focus:outline-none capitalize cursor-pointer"
                        >
                          {ALL_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st.replace(/_/g, ' ')}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}

                {colAssignments.length === 0 && (
                  <div className="py-8 text-center text-text-muted text-[11px] border border-dashed border-white/[0.04] rounded-xl">
                    Empty stage
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CampaignKanbanBoard;
