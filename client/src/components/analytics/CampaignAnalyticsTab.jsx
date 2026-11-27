import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import {
  Rocket,
  CheckCircle2,
  PauseCircle,
  Clock,
  Target,
  ArrowUpRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { formatNumber } from '../../utils/formatters';

const STATUS_COLORS = {
  active: '#10B981',
  paused: '#F59E0B',
  completed: '#3B82F6',
  draft: '#6B7280'
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700/80 rounded-lg p-3 shadow-xl text-xs">
        <div className="font-semibold text-slate-200 mb-1">{label}</div>
        {payload.map((entry, index) => (
          <div key={`camp-tip-${index}`} className="flex items-center justify-between gap-3 py-0.5">
            <span className="text-slate-400">{entry.name}:</span>
            <span className="font-bold text-white">{entry.value}</span>
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
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase">Total Campaigns</span>
            <Rocket className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white">{statusCounts.total}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {statusCounts.active} active initiatives running
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase">Acquired Backlinks</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            {formatNumber(totals.totalAcquiredBacklinks)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Out of {formatNumber(totals.totalTargetBacklinks)} target links
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase">Assigned Prospects</span>
            <Target className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {formatNumber(totals.totalAssignedProspects)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Assigned to outreach pipelines
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase">Overall Completion</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-cyan-400">
            {totals.overallProgressPercentage}%
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-cyan-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${totals.overallProgressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Campaign Status & Progress Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution Donut */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-white mb-1">Campaign Status Breakdown</h3>
          <p className="text-[11px] text-slate-400 mb-4">
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
                    <span className="text-slate-300">{entry.name}:</span>
                    <span className="font-bold text-white ml-auto">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-xs text-slate-500">
              No campaigns created yet
            </div>
          )}
        </div>

        {/* Top-Performing Campaigns */}
        <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-white mb-1">Top Performing Campaigns</h3>
          <p className="text-[11px] text-slate-400 mb-4">
            Ranked by acquired backlinks and outreach conversion efficiency
          </p>

          {topPerforming.length > 0 ? (
            <div className="space-y-3.5">
              {topPerforming.map((c) => (
                <div key={c.id} className="p-3 rounded-lg bg-slate-800/50 border border-slate-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-white truncate max-w-[220px]">
                        {c.name}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-700 text-slate-300">
                        {c.campaignType}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-emerald-400">
                        {c.acquiredBacklinks} / {c.targetBacklinks || '∞'} links
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1.5 font-mono">
                        ({c.progressPercentage}%)
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden mb-2">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, c.progressPercentage)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      Pipeline: <span className="text-slate-200">{c.assignedProspects} prospects</span>
                    </span>
                    <span>
                      Acquisition Rate: <span className="text-slate-200 font-bold">{c.conversionRate}%</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-500">
              No active campaigns to rank
            </div>
          )}
        </div>
      </div>

      {/* 3. Campaign Pipeline Matrix Table */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-white mb-1">Campaign Outreach Pipeline Matrix</h3>
        <p className="text-[11px] text-slate-400 mb-4">
          Detailed prospect status progression across all active initiatives
        </p>

        {campaigns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] font-semibold">
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
              <tbody className="divide-y divide-slate-800">
                {campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 font-medium text-white max-w-[200px] truncate">
                      {c.name}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          c.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : c.status === 'paused'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 font-mono">
                      {c.pipeline?.uncontacted || 0}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 font-mono">
                      {c.pipeline?.contacted || 0}
                    </td>
                    <td className="py-2.5 px-3 text-indigo-300 font-mono">
                      {c.pipeline?.in_discussion || 0}
                    </td>
                    <td className="py-2.5 px-3 text-emerald-400 font-mono font-bold">
                      {c.pipeline?.link_acquired || 0}
                    </td>
                    <td className="py-2.5 px-3 text-white font-mono font-bold">
                      {c.assignedProspects}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-500">
            No campaign data available
          </div>
        )}
      </div>
    </div>
  );
};
