import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import {
  TrendingUp,
  ShieldAlert,
  PieChart as PieIcon,
  Tag,
  Award,
  Layers,
  Info
} from 'lucide-react';
import { formatNumber } from '../../utils/formatters';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700/80 rounded-lg p-3 shadow-xl text-xs">
        <div className="font-semibold text-slate-200 mb-1.5">{label}</div>
        {payload.map((entry, index) => (
          <div key={`tooltip-${index}`} className="flex items-center justify-between gap-4 py-0.5">
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}:
            </span>
            <span className="font-bold text-white">
              {typeof entry.value === 'number' ? formatNumber(entry.value) : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const BacklinkAnalyticsTab = ({ backlinkData }) => {
  if (!backlinkData) {
    return (
      <div className="p-8 text-center text-slate-400">
        Loading backlink analytics...
      </div>
    );
  }

  const {
    growthTrend = [],
    hasGrowthTrend = false,
    newVsLostTimeline = [],
    linkTypeDistribution = [],
    statusDistribution = [],
    anchorTextDistribution = [],
    authorityDistribution = [],
    totalSavedBacklinks = 0
  } = backlinkData;

  return (
    <div className="space-y-6">
      {/* 1. Growth Trends & New vs Lost Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Backlink Growth Over Time */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                Backlink Growth Over Time
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Historical Moz Web Index snapshot progression
              </p>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              {growthTrend.length} Data Points
            </span>
          </div>

          {hasGrowthTrend && growthTrend.length > 1 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growthTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Line
                    type="monotone"
                    dataKey="totalBacklinks"
                    name="Total Backlinks"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#6366f1' }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="referringDomains"
                    name="Referring Domains"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 2.5, fill: '#10b981' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-lg p-6 text-center">
              <Info className="w-8 h-8 text-slate-600 mb-2" />
              <div className="text-xs font-semibold text-slate-300">
                Single Snapshot Recorded
              </div>
              <p className="text-[11px] text-slate-500 mt-1 max-w-sm">
                A multi-point timeline requires multiple snapshots across dates. Regular daily or weekly snapshots will chart your growth curve here.
              </p>
            </div>
          )}
        </div>

        {/* New vs Lost Backlinks Timeline */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-emerald-400" />
                New vs Lost Backlinks
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Detected additions vs dropped links from monitoring crawler
              </p>
            </div>
          </div>

          {newVsLostTimeline.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={newVsLostTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Bar dataKey="newBacklinks" name="New Backlinks" fill="#10b981" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="lostBacklinks" name="Lost Backlinks" fill="#ef4444" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-lg p-6 text-center">
              <ShieldAlert className="w-8 h-8 text-slate-600 mb-2" />
              <div className="text-xs font-semibold text-slate-300">
                No New/Lost Link Events in Period
              </div>
              <p className="text-[11px] text-slate-500 mt-1 max-w-sm">
                No backlink additions or drop-offs were recorded during the selected period. Run a scan in Backlink Monitoring to check current status.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 2. Dofollow & Status Distributions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Dofollow vs Nofollow Distribution */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-cyan-400" />
                Link Equity Distribution (Dofollow vs Nofollow)
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Proportion of equity-passing links among indexed records ({totalSavedBacklinks} links)
              </p>
            </div>
          </div>

          {linkTypeDistribution.length > 0 ? (
            <div className="flex flex-col sm:flex-row items-center justify-around gap-4 h-56">
              <div className="h-48 w-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={linkTypeDistribution}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                    >
                      {linkTypeDistribution.map((entry, index) => (
                        <Cell key={`type-cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2.5 w-full sm:w-auto">
                {linkTypeDistribution.map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between sm:justify-start gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-slate-300 font-medium">{entry.name}</span>
                    </div>
                    <div className="text-right sm:text-left">
                      <span className="text-white font-bold">{entry.percentage}%</span>
                      <span className="text-slate-500 text-[10px] ml-1.5">({entry.count})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-xs text-slate-500">
              No backlink records saved yet
            </div>
          )}
        </div>

        {/* Backlink Status Distribution */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                Backlink Health Status
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Active links vs lost or broken links in MongoDB database
              </p>
            </div>
          </div>

          {statusDistribution.length > 0 ? (
            <div className="flex flex-col sm:flex-row items-center justify-around gap-4 h-56">
              <div className="h-48 w-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`status-cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2.5 w-full sm:w-auto">
                {statusDistribution.map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between sm:justify-start gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-slate-300 font-medium">{entry.name}</span>
                    </div>
                    <div className="text-right sm:text-left">
                      <span className="text-white font-bold">{entry.percentage}%</span>
                      <span className="text-slate-500 text-[10px] ml-1.5">({entry.count})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-xs text-slate-500">
              No backlink status data
            </div>
          )}
        </div>
      </div>

      {/* 3. Top Anchor Texts & Referring Domain Authority Tiers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Anchor Texts */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-indigo-400" />
                Top Anchor Text Distribution
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Most frequent anchor phrasing linking to your pages
              </p>
            </div>
          </div>

          {anchorTextDistribution.length > 0 ? (
            <div className="space-y-3">
              {anchorTextDistribution.map((item, idx) => (
                <div key={`anchor-${idx}`}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-slate-200 truncate max-w-[280px]">
                      "{item.anchorText}"
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {item.count} links ({item.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, item.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-500">
              No anchor text data recorded yet
            </div>
          )}
        </div>

        {/* Referring Domain Authority Tiers */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                Referring Domain Authority Tiers
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Domain Authority (DA) distribution of referring links
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={authorityDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="tier" stroke="#94a3b8" fontSize={10} angle={-15} textAnchor="end" />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Backlink Count" fill="#818cf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
