import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Rocket,
  CheckCircle2,
  Clock,
  Archive,
  PauseCircle,
  Play,
  Calendar,
  Target,
  Link2,
  MoreVertical,
  Edit2,
  Trash2,
  ChevronRight
} from 'lucide-react';

export const CampaignCard = ({
  campaign,
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

  const target = campaign.targetBacklinks || 0;
  const acquired = campaign.acquiredBacklinksCount || 0;
  const assigned = campaign.assignedProspectsCount || 0;
  const progress = campaign.progressPercentage ?? (target > 0 ? Math.min(100, Math.round((acquired / target) * 100)) : 0);

  return (
    <div className="rounded-2xl bg-[#15191E] border border-white/[0.08] hover:border-white/[0.16] transition-all p-5 flex flex-col justify-between space-y-4 shadow-sm hover:shadow-lg hover:shadow-black/40 group">
      {/* Top Header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider bg-white/[0.04] text-text-secondary border border-white/[0.06]">
            {campaign.campaignType}
          </span>
          {getStatusBadge(campaign.status)}
        </div>

        <div>
          <h3
            onClick={() => navigate(`/campaigns/${campaign.id}`)}
            className="text-base font-bold text-text-primary hover:text-emerald-400 transition-colors cursor-pointer line-clamp-1"
            title={campaign.name}
          >
            {campaign.name}
          </h3>
          {campaign.description ? (
            <p className="text-xs text-text-muted mt-1 line-clamp-2 leading-relaxed">
              {campaign.description}
            </p>
          ) : (
            <p className="text-xs text-text-muted mt-1 italic">No description provided</p>
          )}
        </div>
      </div>

      {/* Progress & Target Section */}
      <div className="space-y-2.5 pt-2 border-t border-white/[0.04]">
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-muted font-medium flex items-center gap-1">
            <Link2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Link Goal:</span>
          </span>
          <span className="font-semibold text-text-primary font-mono">
            {acquired} / {target > 0 ? target : 'Open'}
            <span className="text-text-muted text-[11px] ml-1">({progress}%)</span>
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 rounded-full bg-[#0D1117] overflow-hidden border border-white/[0.06]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              progress >= 100
                ? 'bg-gradient-to-r from-emerald-400 to-teal-400'
                : 'bg-gradient-to-r from-emerald-500 to-teal-600'
            }`}
            style={{ width: `${Math.max(2, Math.min(100, progress))}%` }}
          />
        </div>

        {/* Key Stats row */}
        <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
          <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <span className="text-text-muted block">Assigned Targets</span>
            <span className="font-bold text-text-primary font-mono text-xs mt-0.5 block">
              {assigned} prospects
            </span>
          </div>

          <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <span className="text-text-muted block">Duration</span>
            <span className="font-medium text-text-secondary truncate block mt-0.5">
              {campaign.startDate ? new Date(campaign.startDate).toLocaleDateString() : 'N/A'}
              {campaign.endDate ? ` - ${new Date(campaign.endDate).toLocaleDateString()}` : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Card Actions Footer */}
      <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {campaign.status === 'active' && (
            <button
              onClick={() => onStatusChange(campaign.id, 'paused')}
              className="p-1.5 rounded-lg text-text-muted hover:text-amber-400 hover:bg-white/[0.04] transition-colors"
              title="Pause Campaign"
            >
              <PauseCircle className="w-4 h-4" />
            </button>
          )}

          {campaign.status === 'paused' && (
            <button
              onClick={() => onStatusChange(campaign.id, 'active')}
              className="p-1.5 rounded-lg text-text-muted hover:text-emerald-400 hover:bg-white/[0.04] transition-colors"
              title="Resume Campaign"
            >
              <Play className="w-4 h-4" />
            </button>
          )}

          {campaign.status !== 'archived' && (
            <button
              onClick={() => onStatusChange(campaign.id, 'archived')}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/[0.04] transition-colors"
              title="Archive Campaign"
            >
              <Archive className="w-4 h-4" />
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
        </div>

        <button
          onClick={() => navigate(`/campaigns/${campaign.id}`)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-emerald-500/10 hover:border-emerald-500/20 text-text-secondary hover:text-emerald-400 border border-white/[0.08] text-xs font-semibold transition-all group-hover:border-emerald-500/30"
        >
          <span>Manage</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default CampaignCard;
