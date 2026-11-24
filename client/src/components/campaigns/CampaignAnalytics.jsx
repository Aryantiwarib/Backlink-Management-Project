import React from 'react';
import {
  Target,
  Link2,
  CheckCircle2,
  TrendingUp,
  Percent,
  Clock,
  Mail,
  MessageSquare,
  ShieldAlert
} from 'lucide-react';

export const CampaignAnalytics = ({ campaign }) => {
  if (!campaign) return null;

  const metrics = campaign.metrics || {};
  const statusBreakdown = metrics.statusBreakdown || {};

  const totalAssigned = metrics.totalAssigned || 0;
  const acquired = metrics.acquiredCount || 0;
  const target = campaign.targetBacklinks || 0;

  const progressPercentage = metrics.progressPercentage ?? (target > 0 ? Math.min(100, Math.round((acquired / target) * 100)) : 0);

  // Conversion rate: Acquired / Total Assigned
  const conversionRate = totalAssigned > 0 ? Math.round((acquired / totalAssigned) * 100) : 0;

  // Active in funnel (contacted, follow-up, replied, negotiating)
  const inPipeline =
    (statusBreakdown.contacted || 0) +
    (statusBreakdown.follow_up_due || 0) +
    (statusBreakdown.replied || 0) +
    (statusBreakdown.negotiating || 0);

  const funnelStages = [
    { label: 'Assigned', count: totalAssigned, color: 'bg-white/10 text-text-primary' },
    { label: 'Uncontacted', count: statusBreakdown.uncontacted || 0, color: 'bg-white/5 text-text-muted' },
    { label: 'Contacted', count: statusBreakdown.contacted || 0, color: 'bg-indigo-500/20 text-indigo-400' },
    { label: 'Follow-Up Due', count: statusBreakdown.follow_up_due || 0, color: 'bg-amber-500/20 text-amber-400' },
    { label: 'Replied', count: statusBreakdown.replied || 0, color: 'bg-blue-500/20 text-blue-400' },
    { label: 'Negotiating', count: statusBreakdown.negotiating || 0, color: 'bg-teal-500/20 text-teal-400' },
    { label: 'Link Acquired', count: statusBreakdown.link_acquired || 0, color: 'bg-emerald-500/20 text-emerald-400' },
    { label: 'Rejected / Dead', count: (statusBreakdown.rejected || 0) + (statusBreakdown.unresponsive || 0), color: 'bg-rose-500/20 text-rose-400' }
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Goal Progress */}
        <div className="p-4 rounded-2xl bg-[#15191E] border border-white/[0.08] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted font-medium">Acquisition Goal</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Link2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-emerald-400 font-mono">
                {acquired} / {target > 0 ? target : 'Open'}
              </span>
              <span className="text-xs text-text-muted font-mono">{progressPercentage}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#0D1117] overflow-hidden mt-2 border border-white/[0.06]">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                style={{ width: `${Math.max(2, Math.min(100, progressPercentage))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="p-4 rounded-2xl bg-[#15191E] border border-white/[0.08] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted font-medium">Acquisition Rate</span>
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-bold text-teal-400 font-mono">
                {conversionRate}%
              </span>
              <span className="text-[11px] text-text-muted ml-1.5">of assigned targets</span>
            </div>
          </div>
        </div>

        {/* Active In Pipeline */}
        <div className="p-4 rounded-2xl bg-[#15191E] border border-white/[0.08] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted font-medium">Active Conversations</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-bold text-blue-400 font-mono">
                {inPipeline}
              </span>
              <span className="text-[11px] text-text-muted ml-1.5">prospects in discussion</span>
            </div>
          </div>
        </div>

        {/* Follow-up Pending */}
        <div className="p-4 rounded-2xl bg-[#15191E] border border-white/[0.08] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted font-medium">Follow-Up Action Due</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-bold text-amber-400 font-mono">
                {statusBreakdown.follow_up_due || 0}
              </span>
              <span className="text-[11px] text-text-muted ml-1.5">prospects due</span>
            </div>
          </div>
        </div>
      </div>

      {/* Funnel Distribution Grid */}
      <div className="p-5 rounded-2xl bg-[#15191E] border border-white/[0.08] space-y-4">
        <div>
          <h4 className="text-sm font-bold text-text-primary">Outreach Funnel Breakdown</h4>
          <p className="text-xs text-text-muted mt-0.5">
            Real-time prospect distribution across lifecycle outreach stages.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {funnelStages.map((stage) => (
            <div
              key={stage.label}
              className="p-3.5 rounded-xl bg-[#0D1117] border border-white/[0.06] flex items-center justify-between"
            >
              <div>
                <span className="text-[11px] text-text-muted block">{stage.label}</span>
                <span className="text-lg font-bold text-text-primary font-mono mt-0.5 block">
                  {stage.count}
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono ${stage.color}`}>
                {totalAssigned > 0 ? `${Math.round((stage.count / totalAssigned) * 100)}%` : '0%'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CampaignAnalytics;
