import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ArrowRight, Target } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';

export const ContentOverviewCard = () => {
  const navigate = useNavigate();
  const { linkAttributesSummary } = useDashboard();

  const totalIndexed = linkAttributesSummary?.total || 0;

  const target = 20;
  const percentage = Math.min(Math.round((totalIndexed / target) * 100), 100);

  const statusMetrics = [
    { label: 'Indexed Links', count: totalIndexed, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { label: 'Dofollow', count: linkAttributesSummary?.dofollowRatio ? `${linkAttributesSummary.dofollowRatio}%` : '0%', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    { label: 'Content Target', count: target, color: 'text-text-muted', bg: 'bg-white/5', border: 'border-white/10' },
    { label: 'Progress', count: `${percentage}%`, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' }
  ];

  return (
    <div className="surface-card rounded-2xl p-6 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.04]">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-text-primary tracking-tight">
              Link Building Pace
            </h2>
            <span className="p-1 rounded-md text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-semibold px-2 py-0.5">
              Milestone
            </span>
          </div>
          <FileText className="w-4 h-4 text-text-muted" />
        </div>

        {/* Monthly Goal Progress Bar */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] mb-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
              <Target className="w-3.5 h-3.5 text-emerald-400" />
              <span>Acquisition Target</span>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400">
              {percentage}%
            </span>
          </div>

          {/* Progress bar line */}
          <div className="w-full h-2.5 bg-white/[0.06] rounded-full overflow-hidden p-0.5 mb-2">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500 shadow-glow-brand"
              style={{ width: `${percentage}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-text-muted">
            <span>{totalIndexed} of {target} links acquired</span>
            <span>Target: {target} links</span>
          </div>
        </div>

        {/* Status Breakdown Grid */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          {statusMetrics.map((item) => (
            <div
              key={item.label}
              className={`p-3 rounded-xl border ${item.bg} ${item.border} flex flex-col justify-between`}
            >
              <span className="text-[11px] font-medium text-text-muted">{item.label}</span>
              <span className={`text-xl font-extrabold font-mono mt-1 ${item.color}`}>
                {item.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Action Button */}
      <div className="pt-2">
        <button
          onClick={() => navigate('/seo-tools')}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-text-primary border border-white/[0.08] transition-all hover:border-white/[0.15]"
        >
          <span>Manage Backlinks</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
