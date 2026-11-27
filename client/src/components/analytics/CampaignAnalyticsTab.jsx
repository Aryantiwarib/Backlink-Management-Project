import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip
} from 'recharts';
import {
  Rocket,
  CheckCircle2,
  Target,
  TrendingUp
} from 'lucide-react';
import { formatNumber } from '../../utils/formatters';

const STATUS_COLORS = {
  active: '#10B981',
  paused: '#F59E0B',
  completed: '#059669',
  draft: '#6B7280'
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#15191E]/95 backdrop-blur-md border border-white/[0.1] rounded-xl p-3 shadow-elevated text-xs">
        <div className="font-semibold text-text-primary mb-1">{label}</div>
        {payload.map((entry, index) => (
          <div key={`camp-tip-${index}`} className="flex items-center justify-between gap-3 py-0.5">
            <span className="text-text-muted">{entry.name}:</span>
            <span className="font-mono font-bold text-text-primary">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const CampaignAnalyticsTab = ({ campaignData }) => {
  if (!campaignData) {
    return (
      <div className="p-8 text-center text-slate-400">
        Loading campaign analytics...
      </div>
    );
  }

  const {
    statusCounts = { total: 0, active: 0, paused: 0, completed: 0, draft: 0 },
    totals = { totalTargetBacklinks: 0, totalAcquiredBacklinks: 0, totalAssignedProspects: 0, overallProgressPercentage: 0 },
    campaigns = [],
    topPerforming = []
  } = campaignData;

  const pieData = [
    { name: 'Active', value: statusCounts.active, color: STATUS_COLORS.active },
    { name: 'Paused', value: statusCounts.paused, color: STATUS_COLORS.paused },
    { name: 'Completed', value: statusCounts.completed, color: STATUS_COLORS.completed },
    { name: 'Draft', value: statusCounts.draft, color: STATUS_COLORS.draft }
  ].filter((item) => item.value > 0);

  return (
    <div className="space-y-6">
      {/* 1. Quick Stats Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#15191E] border border-white/[0.06] rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Total Campaigns</span>
            <Rocket className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-text-primary">{statusCounts.total}</div>
          <div className="text-[11px] text-text-muted mt-0.5">
            {statusCounts.active} active initiatives running
          </div>
        </div>

        <div className="bg-[#15191E] border border-white/[0.06] rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Acquired Backlinks</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {formatNumber(totals.totalAcquiredBacklinks)}
          </div>
          <div className="text-[11px] text-text-muted mt-0.5">
            Out of {formatNumber(totals.totalTargetBacklinks)} target links
          </div>
        </div>

        <div className="bg-[#15191E] border border-white/[0.06] rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Assigned Prospects</span>
            <Target className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-text-primary">
            {formatNumber(totals.totalAssignedProspects)}
          </div>
          <div className="text-[11px] text-text-muted mt-0.5">
            Assigned to outreach pipelines
          </div>
        </div>

        <div className="bg-[#15191E] border border-white/[0.06] rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Overall Completion</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {totals.overallProgressPercentage}%
          </div>
          <div className="w-full bg-[#101318] rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${totals.overallProgressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Campaign Status & Progress Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution Donut */}
        <div className="bg-[#15191E] border border-white/[0.06] rounded-2xl p-5 shadow-card">
          <h3 className="text-sm font-bold text-text-primary mb-1">Campaign Status Breakdown</h3>
          <p className="text-[11px] text-text-muted mb-4">
            Active vs paused, completed, and draft campaigns
          </p>

          {pieData.length > 0 ? (
            <div className="flex flex-col items-center">
              <div className="h-44 w-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`camp-cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-2 w-full mt-4 text-xs">
                {pieData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-text-secondary">{entry.name}:</span>
                    <span className="font-mono font-bold text-text-primary ml-auto">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-xs text-text-muted">
              No campaigns created yet
            </div>
          )}
        </div>

        {/* Top-Performing Campaigns */}
        <div className="lg:col-span-2 bg-[#15191E] border border-white/[0.06] rounded-2xl p-5 shadow-card">
          <h3 className="text-sm font-bold text-text-primary mb-1">Top Performing Campaigns</h3>
          <p className="text-[11px] text-text-muted mb-4">
            Ranked by acquired backlinks and outreach conversion efficiency
          </p>

          {topPerforming.length > 0 ? (
            <div className="space-y-3.5">
              {topPerforming.map((c) => (
                <div key={c.id} className="p-3.5 rounded-xl bg-[#101318] border border-white/[0.06] hover:border-white/[0.12] transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-text-primary truncate max-w-[220px]">
                        {c.name}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white/[0.05] text-text-muted border border-white/[0.08]">
                        {c.campaignType}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold font-mono text-emerald-400">
                        {c.acquiredBacklinks} / {c.targetBacklinks || '∞'} links
                      </span>
                      <span className="text-[10px] text-text-muted ml-1.5 font-mono">
                        ({c.progressPercentage}%)
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-[#15191E] rounded-full h-1.5 overflow-hidden mb-2">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, c.progressPercentage)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-text-muted">
                    <span>
                      Pipeline: <span className="text-text-primary font-mono">{c.assignedProspects} prospects</span>
                    </span>
                    <span>
                      Acquisition Rate: <span className="text-text-primary font-mono font-bold">{c.conversionRate}%</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-text-muted">
              No active campaigns to rank
            </div>
          )}
        </div>
      </div>

      {/* 3. Campaign Pipeline Matrix Table */}
      <div className="bg-[#15191E] border border-white/[0.06] rounded-2xl p-5 shadow-card">
        <h3 className="text-sm font-bold text-text-primary mb-1">Campaign Outreach Pipeline Matrix</h3>
        <p className="text-[11px] text-text-muted mb-4">
          Detailed prospect status progression across all active initiatives
        </p>

        {campaigns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#101318] text-text-muted uppercase text-[10px] font-bold tracking-wider border-b border-white/[0.06]">
                <tr>
                  <th className="py-2.5 px-3">Campaign</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Uncontacted</th>
                  <th className="py-2.5 px-3">Contacted</th>
                  <th className="py-2.5 px-3">In Discussion</th>
                  <th className="py-2.5 px-3">Link Acquired</th>
                  <th className="py-2.5 px-3">Total Assigned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 px-3 font-medium text-text-primary max-w-[200px] truncate">
                      {c.name}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          c.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : c.status === 'paused'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : c.status === 'completed'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-white/[0.05] text-text-muted border border-white/[0.08]'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-text-secondary font-mono">
                      {c.pipeline?.uncontacted || 0}
                    </td>
                    <td className="py-2.5 px-3 text-text-secondary font-mono">
                      {c.pipeline?.contacted || 0}
                    </td>
                    <td className="py-2.5 px-3 text-emerald-300 font-mono">
                      {c.pipeline?.in_discussion || 0}
                    </td>
                    <td className="py-2.5 px-3 text-emerald-400 font-mono font-bold">
                      {c.pipeline?.link_acquired || 0}
                    </td>
                    <td className="py-2.5 px-3 text-text-primary font-mono font-bold">
                      {c.assignedProspects}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-text-muted">
            No campaign data available
          </div>
        )}
      </div>
    </div>
  );
};
