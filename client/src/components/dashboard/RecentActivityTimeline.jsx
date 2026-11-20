import React from 'react';
import { 
  Link2, 
  Link2Off, 
  FileCheck, 
  Rocket, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import { useNavigate } from 'react-router-dom';

/**
 * Returns matching Lucide Icon based on iconType string
 */
const getActivityIcon = (iconType, severity) => {
  switch (iconType) {
    case 'Link2':
      return { Icon: Link2, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    case 'Link2Off':
      return { Icon: Link2Off, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' };
    case 'FileCheck':
      return { Icon: FileCheck, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
    case 'Rocket':
      return { Icon: Rocket, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' };
    case 'CheckCircle2':
      return { Icon: CheckCircle2, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    case 'AlertCircle':
      return { Icon: AlertCircle, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    default:
      return { Icon: Sparkles, color: 'text-gray-400 bg-white/5 border-white/10' };
  }
};

export const RecentActivityTimeline = () => {
  const { activities, loadingActivities } = useDashboard();
  const navigate = useNavigate();

  return (
    <div className="surface-card rounded-2xl p-6 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.04]">
          <div>
            <h2 className="text-base font-bold text-text-primary tracking-tight">
              Recent Activity
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Real-time feed of backlink and content events.
            </p>
          </div>
          <span className="p-1 rounded-md text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5">
            Live Stream
          </span>
        </div>

        {/* Timeline list */}
        {loadingActivities ? (
          <div className="space-y-4 py-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/[0.05]" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-3/4 bg-white/[0.05] rounded" />
                  <div className="h-3 w-1/2 bg-white/[0.05] rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="py-8 text-center text-xs text-text-muted">
            No recent activity recorded yet.
          </div>
        ) : (
          <div className="relative pl-3 before:absolute before:left-6 before:top-3 before:bottom-3 before:w-px before:bg-white/[0.06] space-y-4">
            {activities.map((act) => {
              const { Icon, color } = getActivityIcon(act.iconType, act.severity);

              return (
                <div
                  key={act.id}
                  className="relative flex items-start gap-3 group transition-transform hover:translate-x-0.5"
                >
                  {/* Timeline icon node */}
                  <div
                    className={`relative z-10 w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0 shadow-sm ${color}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="text-xs font-semibold text-text-primary group-hover:text-emerald-400 transition-colors truncate">
                        {act.title}
                      </h3>
                      <span className="text-[10px] text-text-muted whitespace-nowrap flex-shrink-0">
                        {act.timestamp}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-secondary leading-relaxed mt-0.5 line-clamp-2">
                      {act.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="pt-4 mt-4 border-t border-white/[0.04] text-center">
        <button
          onClick={() => navigate('/backlinks')}
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary font-medium transition-colors"
        >
          <span>View all activity logs</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
