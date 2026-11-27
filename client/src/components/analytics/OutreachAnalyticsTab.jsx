import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import {
  Mail,
  Send,
  Clock,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Eye,
  MousePointer
} from 'lucide-react';
import { formatNumber } from '../../utils/formatters';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700/80 rounded-lg p-3 shadow-xl text-xs">
        <div className="font-semibold text-slate-200 mb-1">{label}</div>
        {payload.map((entry, index) => (
          <div key={`outreach-tip-${index}`} className="flex items-center justify-between gap-3 py-0.5">
            <span className="text-slate-400">{entry.name}:</span>
            <span className="font-bold text-white">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const OutreachAnalyticsTab = ({ outreachData }) => {
  if (!outreachData) {
    return (
      <div className="p-8 text-center text-slate-400">
        Loading outreach analytics...
      </div>
    );
  }

  const {
    overview = { totalEmails: 0, sent: 0, pending: 0, failed: 0, scheduledFollowUps: 0, executedFollowUps: 0 },
    statusDistribution = [],
    sentActivityTimeline = [],
    campaignBreakdown = [],
    realEngagementTracking = { totalTrackedOpens: 0, totalTrackedClicks: 0, hasTrackingActivity: false }
  } = outreachData;

  const validStatusData = statusDistribution.filter((s) => s.count > 0);

  return (
    <div className="space-y-6">
      {/* 1. Header KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase">Emails Sent</span>
            <Send className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            {formatNumber(overview.sent)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Dispatched via Gmail API</div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase">Queued / Pending</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">
            {formatNumber(overview.pending)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Awaiting dispatch slot</div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase">Scheduled Follow-Ups</span>
            <Calendar className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-indigo-400">
            {formatNumber(overview.scheduledFollowUps)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Automated sequence triggers</div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase">Failed Sends</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400">
            {formatNumber(overview.failed)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Bounced or rate-limited</div>
        </div>
      </div>

      {/* 2. Sent Timeline & Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Email Status Donut */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-white mb-1">Email Delivery Status</h3>
          <p className="text-[11px] text-slate-400 mb-4">
            Sent vs pending queue vs failed attempts
          </p>

          {validStatusData.length > 0 ? (
            <div className="flex flex-col items-center">
              <div className="h-44 w-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={validStatusData}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                    >
                      {validStatusData.map((entry, index) => (
                        <Cell key={`outreach-cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2 w-full mt-4 text-xs">
                {validStatusData.map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-slate-300">{entry.name}</span>
                    </div>
                    <span className="font-bold text-white">{entry.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-xs text-slate-500">
              No outreach emails recorded
            </div>
          )}
        </div>

        {/* Sent Activity Timeline */}
        <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-white mb-1">Outreach Dispatch Volume</h3>
          <p className="text-[11px] text-slate-400 mb-4">
            Daily sent email volume during selected reporting period
          </p>

          {sentActivityTimeline.length > 0 ? (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sentActivityTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="emailsSent" name="Emails Sent" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-56 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-lg p-6 text-center">
              <Mail className="w-8 h-8 text-slate-600 mb-2" />
              <div className="text-xs font-semibold text-slate-300">No Emails Sent in Period</div>
              <p className="text-[11px] text-slate-500 mt-1 max-w-sm">
                Queue personalized outreach in the Outreach & Email Hub to start dispatching link pitches.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 3. Campaign Outreach Breakdown */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-white mb-1">Campaign-Wise Outreach Volume</h3>
        <p className="text-[11px] text-slate-400 mb-4">
          Email distribution, sent delivery, and pending queues per initiative
        </p>

        {campaignBreakdown.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Campaign</th>
                  <th className="py-2.5 px-3">Total Emails</th>
                  <th className="py-2.5 px-3">Sent</th>
                  <th className="py-2.5 px-3">Pending</th>
                  <th className="py-2.5 px-3">Failed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {campaignBreakdown.map((c) => (
                  <tr key={c.campaignId} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 font-medium text-white max-w-[240px] truncate">
                      {c.campaignName}
                    </td>
                    <td className="py-2.5 px-3 text-white font-mono font-bold">
                      {c.totalEmails}
                    </td>
                    <td className="py-2.5 px-3 text-emerald-400 font-mono">
                      {c.sent}
                    </td>
                    <td className="py-2.5 px-3 text-amber-400 font-mono">
                      {c.pending}
                    </td>
                    <td className="py-2.5 px-3 text-rose-400 font-mono">
                      {c.failed}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-500">
            No outreach activity recorded for any campaign
          </div>
        )}
      </div>

      {/* 4. Tracking Verification Note */}
      {realEngagementTracking.hasTrackingActivity && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-indigo-400" />
            <span className="text-xs text-slate-300">Verified Opens:</span>
            <span className="text-xs font-bold text-white font-mono">
              {realEngagementTracking.totalTrackedOpens}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MousePointer className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-slate-300">Verified Clicks:</span>
            <span className="text-xs font-bold text-white font-mono">
              {realEngagementTracking.totalTrackedClicks}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
