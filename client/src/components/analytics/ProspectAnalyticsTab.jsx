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
  Target,
  CheckCircle2,
  MailCheck,
  Award,
  Layers,
  Sparkles,
  Search
} from 'lucide-react';
import { formatNumber } from '../../utils/formatters';

const QUAL_COLORS = {
  qualified: '#10B981',
  provisional: '#F59E0B',
  rejected: '#EF4444',
  unassessed: '#6B7280'
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700/80 rounded-lg p-3 shadow-xl text-xs">
        <div className="font-semibold text-slate-200 mb-1">{label}</div>
        {payload.map((entry, index) => (
          <div key={`prospect-tip-${index}`} className="flex items-center justify-between gap-3 py-0.5">
            <span className="text-slate-400">{entry.name}:</span>
            <span className="font-bold text-white">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const ProspectAnalyticsTab = ({ prospectData }) => {
  if (!prospectData) {
    return (
      <div className="p-8 text-center text-slate-400">
        Loading prospecting analytics...
      </div>
    );
  }

  const {
    totalProspects = 0,
    qualificationStatus = { qualified: 0, provisional: 0, rejected: 0, unassessed: 0 },
    contactDiscovery = { emailsFound: 0, totalProspects: 0, contactDiscoveryRate: 0 },
    sources = [],
    opportunityScoreTiers = [],
    discoveryTrend = []
  } = prospectData;

  const pieData = [
    { name: 'Qualified', value: qualificationStatus.qualified, color: QUAL_COLORS.qualified },
    { name: 'Provisional', value: qualificationStatus.provisional, color: QUAL_COLORS.provisional },
    { name: 'Rejected', value: qualificationStatus.rejected, color: QUAL_COLORS.rejected },
    { name: 'Unassessed', value: qualificationStatus.unassessed, color: QUAL_COLORS.unassessed }
  ].filter((p) => p.value > 0);

  return (
    <div className="space-y-6">
      {/* 1. Header KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase">Total In Pipeline</span>
            <Target className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white">{formatNumber(totalProspects)}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Discovered link prospects</div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase">Qualified Targets</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            {formatNumber(qualificationStatus.qualified)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">High authority & relevance</div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase">Verified Emails Found</span>
            <MailCheck className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-indigo-400">
            {formatNumber(contactDiscovery.emailsFound)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Ready for direct outreach</div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase">Contact Discovery Rate</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">
            {contactDiscovery.contactDiscoveryRate}%
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, contactDiscovery.contactDiscoveryRate)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Qualification Distribution & Score Tiers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Qualification Status Donut */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-white mb-1">Prospect Qualification Pipeline</h3>
          <p className="text-[11px] text-slate-400 mb-4">
            Breakdown by qualification decision status
          </p>

          {pieData.length > 0 ? (
            <div className="flex flex-col sm:flex-row items-center justify-around gap-4 h-56">
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
                        <Cell key={`qual-cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2.5 w-full sm:w-auto text-xs">
                {pieData.map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between sm:justify-start gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-slate-300 font-medium">{entry.name}</span>
                    </div>
                    <span className="text-white font-bold">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-xs text-slate-500">
              No prospects in database
            </div>
          )}
        </div>

        {/* Opportunity Score Tiers */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-white mb-1">Opportunity Score Tiers</h3>
          <p className="text-[11px] text-slate-400 mb-4">
            Scored (0-100) based on domain authority, relevance, and contact viability
          </p>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={opportunityScoreTiers} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="tier" stroke="#94a3b8" fontSize={10} angle={-15} textAnchor="end" />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Prospects" fill="#a855f7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 3. Discovery Sources Breakdown */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-white mb-1">Prospect Discovery Channels</h3>
        <p className="text-[11px] text-slate-400 mb-4">
          Where your link-building opportunities originated
        </p>

        {sources.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {sources.map((s) => (
              <div key={s.source} className="p-3 rounded-lg bg-slate-800/40 border border-slate-800">
                <div className="text-[10px] font-semibold text-slate-400 uppercase mb-1">
                  {s.source}
                </div>
                <div className="text-lg font-bold text-white">{s.count}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-4 text-center text-xs text-slate-500">
            No source breakdown available
          </div>
        )}
      </div>
    </div>
  );
};
