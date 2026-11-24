import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Rocket,
  CheckCircle2,
  Clock,
  Archive,
  PauseCircle,
  Play,
  Edit2,
  Trash2,
  ChevronRight,
  Target,
  Link2
} from 'lucide-react';

export const CampaignTable = ({
  campaigns = [],
  loading = false,
  onEdit,
  onStatusChange,
  onDelete
}) => {
  const navigate = useNavigate();

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Active
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <PauseCircle className="w-3 h-3" />
            Paused
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </span>
        );
      case 'archived':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/[0.04] text-text-muted border border-white/[0.08]">
            <Archive className="w-3 h-3" />
            Archived
          </span>
        );
      case 'draft':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Clock className="w-3 h-3" />
            Draft
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="p-12 rounded-2xl bg-[#15191E] border border-white/[0.08] text-center text-text-muted text-xs">
        <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin mx-auto mb-3" />
        <span>Loading outreach campaigns...</span>
      </div>
    );
  }

  if (!campaigns || campaigns.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl bg-[#15191E] border border-white/[0.08] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/[0.06] bg-[#101419] text-text-muted">
              <th className="py-3.5 px-4 font-medium">Campaign</th>
              <th className="py-3.5 px-4 font-medium">Type</th>
              <th className="py-3.5 px-4 font-medium">Status</th>
              <th className="py-3.5 px-4 font-medium">Assigned Targets</th>
              <th className="py-3.5 px-4 font-medium">Goal Progress</th>
              <th className="py-3.5 px-4 font-medium">Duration</th>
              <th className="py-3.5 px-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {campaigns.map((campaign) => {
              const target = campaign.targetBacklinks || 0;
              const acquired = campaign.acquiredBacklinksCount || 0;
              const assigned = campaign.assignedProspectsCount || 0;
              const progress = campaign.progressPercentage ?? (target > 0 ? Math.min(100, Math.round((acquired / target) * 100)) : 0);

              return (
                <tr
                  key={campaign.id}
                  className="hover:bg-white/[0.015] transition-colors group"
                >
                  {/* Name & Description */}
                  <td className="py-3.5 px-4 max-w-xs">
                    <button
                      type="button"
                      onClick={() => navigate(`/campaigns/${campaign.id}`)}
                      className="font-bold text-text-primary hover:text-emerald-400 transition-colors text-left truncate block"
                      title={campaign.name}
                    >
                      {campaign.name}
                    </button>
                    {campaign.description && (
                      <div className="text-[11px] text-text-muted truncate mt-0.5">
                        {campaign.description}
                      </div>
                    )}
                  </td>

                  {/* Type */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-semibold bg-white/[0.04] text-text-secondary border border-white/[0.06]">
                      {campaign.campaignType}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {getStatusBadge(campaign.status)}
                  </td>

                  {/* Assigned Prospects */}
                  <td className="py-3.5 px-4 whitespace-nowrap font-mono font-semibold text-text-primary">
                    {assigned} prospects
                  </td>

                  {/* Progress & Target */}
                  <td className="py-3.5 px-4 min-w-[140px]">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono text-text-primary font-semibold">
                          {acquired} / {target > 0 ? target : 'Open'}
                        </span>
                        <span className="text-text-muted font-mono">{progress}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#0D1117] overflow-hidden border border-white/[0.06]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                          style={{ width: `${Math.max(2, Math.min(100, progress))}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Dates */}
                  <td className="py-3.5 px-4 whitespace-nowrap text-[11px] text-text-muted">
                    {campaign.startDate ? new Date(campaign.startDate).toLocaleDateString() : 'N/A'}
                    {campaign.endDate ? ` - ${new Date(campaign.endDate).toLocaleDateString()}` : ''}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {campaign.status === 'active' && (
                        <button
                          onClick={() => onStatusChange(campaign.id, 'paused')}
                          className="p-1.5 rounded-lg text-text-muted hover:text-amber-400 hover:bg-white/[0.04] transition-colors"
                          title="Pause Campaign"
                        >
                          <PauseCircle className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {campaign.status === 'paused' && (
                        <button
                          onClick={() => onStatusChange(campaign.id, 'active')}
                          className="p-1.5 rounded-lg text-text-muted hover:text-emerald-400 hover:bg-white/[0.04] transition-colors"
                          title="Resume Campaign"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {campaign.status !== 'archived' && (
                        <button
                          onClick={() => onStatusChange(campaign.id, 'archived')}
                          className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/[0.04] transition-colors"
                          title="Archive Campaign"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => onEdit(campaign)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/[0.04] transition-colors"
                        title="Edit Campaign"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onDelete(campaign.id, campaign.name)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-rose-400 hover:bg-white/[0.04] transition-colors"
                        title="Delete Campaign"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => navigate(`/campaigns/${campaign.id}`)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/20 transition-all ml-1"
                      >
                        <span>Manage</span>
                        <ChevronRight className="w-3 h-3" />
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

export default CampaignTable;
