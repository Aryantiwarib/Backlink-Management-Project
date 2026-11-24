import React from 'react';
import {
  Rocket,
  CheckCircle2,
  Clock,
  Archive,
  PauseCircle,
  Play,
  BookmarkPlus,
  Link2,
  Trash2,
  Edit2,
  Activity
} from 'lucide-react';

export const CampaignActivityTimeline = ({ activities = [], loading = false }) => {
  const getActionIcon = (action) => {
    switch (action) {
      case 'campaign_created':
        return {
          icon: Rocket,
          color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        };
      case 'prospects_assigned':
        return {
          icon: BookmarkPlus,
          color: 'bg-teal-500/10 text-teal-400 border-teal-500/20'
        };
      case 'link_acquired':
        return {
          icon: Link2,
          color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 animate-pulse'
        };
      case 'campaign_paused':
        return {
          icon: PauseCircle,
          color: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
        };
      case 'campaign_resumed':
        return {
          icon: Play,
          color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        };
      case 'campaign_completed':
        return {
          icon: CheckCircle2,
          color: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
        };
      case 'campaign_archived':
        return {
          icon: Archive,
          color: 'bg-white/[0.04] text-text-muted border-white/[0.08]'
        };
      case 'prospect_removed':
        return {
          icon: Trash2,
          color: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
        };
      case 'outreach_status_updated':
      case 'campaign_updated':
      default:
        return {
          icon: Activity,
          color: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
        };
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-text-muted">
        <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin mx-auto mb-2" />
        <span>Loading activity history...</span>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-text-muted border border-dashed border-white/[0.06] rounded-2xl">
        No campaign events recorded yet.
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-white/[0.06]">
      {activities.map((activity, index) => {
        const { icon: Icon, color } = getActionIcon(activity.action);
        const dateObj = new Date(activity.createdAt);

        return (
          <div key={activity.id || index} className="relative flex items-start gap-3 text-xs">
            {/* Timeline node icon */}
            <div
              className={`absolute -left-6 p-1 rounded-full border ${color} shrink-0 bg-[#101419] z-10`}
            >
              <Icon className="w-3 h-3" />
            </div>

            {/* Event Content */}
            <div className="p-3.5 rounded-2xl bg-[#15191E] border border-white/[0.06] flex-1 space-y-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
                <span className="font-semibold text-text-primary">
                  {activity.description}
                </span>
                <span className="text-text-muted font-mono shrink-0">
                  {dateObj.toLocaleDateString()} {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                <div className="text-[10px] text-text-muted font-mono bg-black/20 px-2 py-1 rounded-lg border border-white/[0.02] inline-block mt-1">
                  {activity.action}
                  {activity.metadata.domain ? ` • ${activity.metadata.domain}` : ''}
                  {activity.metadata.newStatus ? ` • status: ${activity.metadata.newStatus}` : ''}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CampaignActivityTimeline;
