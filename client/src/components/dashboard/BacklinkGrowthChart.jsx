import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line
} from 'recharts';
import { History, TrendingUp, Calendar, Info, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../../context/DashboardContext';
import { formatNumber } from '../../utils/formatters';

/**
 * Custom High-End Dark Tooltip
 */
const CustomTooltip = ({ active, payload, label, selectedMetric }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#15191E]/95 backdrop-blur-md border border-white/[0.1] rounded-xl p-3 shadow-elevated text-xs">
        <div className="font-semibold text-text-primary pb-1.5 mb-2 border-b border-white/[0.06] flex items-center justify-between gap-4">
          <span>{label}</span>
          {payload[0]?.payload?.fullDate && (
            <span className="text-[10px] text-text-muted font-mono font-normal">
              {new Date(payload[0].payload.fullDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <div className="space-y-1.5">
          {payload.map((entry, index) => (
            <div key={`tooltip-${index}`} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-text-secondary">{entry.name}</span>
              </div>
              <span className="font-mono font-bold text-text-primary">
                {entry.value !== null && entry.value !== undefined ? formatNumber(entry.value) : 'N/A'}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export const BacklinkGrowthChart = () => {
  const { chartHistory, hasTrend, loadingDashboard, hasData, website } = useDashboard();
  const navigate = useNavigate();

  // Active metric view: 'backlinks' | 'domains' | 'authority'
  const [metricTab, setMetricTab] = useState('backlinks');

  return (
    <div className="surface-card rounded-2xl p-6 relative flex flex-col justify-between">
      {/* Header with Title and Metric Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-text-primary tracking-tight">
              Historical SEO Growth
            </h2>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-white/[0.04] text-text-muted border border-white/[0.08]">
              {chartHistory.length} Snapshot{chartHistory.length === 1 ? '' : 's'}
            </span>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Real time-series snapshots stored in MongoDB for{' '}
            <span className="font-mono text-emerald-400">{website?.domain || 'active website'}</span>
          </p>
        </div>

        {/* Metric Selector Tabs */}
        <div className="flex items-center bg-[#101318] p-1 rounded-xl border border-white/[0.06] self-start sm:self-auto text-xs">
          <button
            onClick={() => setMetricTab('backlinks')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              metricTab === 'backlinks'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Backlinks
          </button>
          <button
            onClick={() => setMetricTab('domains')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              metricTab === 'domains'
                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Ref Domains
          </button>
          <button
            onClick={() => setMetricTab('authority')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              metricTab === 'authority'
                ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            DA & PA
          </button>
        </div>
      </div>

      {/* Chart Canvas or Informative State */}
      <div className="h-[270px] w-full flex items-center justify-center">
        {loadingDashboard ? (
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent" />
        ) : !hasData || chartHistory.length === 0 ? (
          /* Zero Snapshots in Database */
          <div className="text-center p-6 space-y-3 max-w-sm">
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-text-muted">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-text-primary">No Historical Snapshots</p>
              <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">
                Query live SEO data in SEO Tools to record your first snapshot in MongoDB.
              </p>
            </div>
            <button
              onClick={() => navigate('/seo-tools')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-semibold transition-colors"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Fetch Live Metrics</span>
            </button>
          </div>
        ) : chartHistory.length === 1 ? (
          /* Single Snapshot (No Trend Yet) */
          <div className="w-full h-full flex flex-col justify-center items-center p-6 bg-white/[0.01] rounded-xl border border-white/[0.04] text-center space-y-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-text-primary">
                1 Snapshot Recorded ({chartHistory[0].date})
              </p>
              <p className="text-[11px] text-text-muted mt-1 max-w-md mx-auto">
                Initial baseline recorded in MongoDB. A minimum of 2 snapshots across different sessions or dates is required to plot growth trendlines.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 font-mono text-xs pt-1">
              <span className="px-2.5 py-1 rounded-lg bg-black/40 border border-white/[0.06] text-emerald-400">
                Backlinks: {formatNumber(chartHistory[0].totalBacklinks || 0)}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-black/40 border border-white/[0.06] text-blue-400">
                Ref Domains: {formatNumber(chartHistory[0].referringDomains || 0)}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-black/40 border border-white/[0.06] text-purple-400">
                Moz DA: {chartHistory[0].domainAuthority ?? 'N/A'}
              </span>
            </div>
          </div>
        ) : (
          /* Multi-Snapshot Historical Chart (Real Trendline) */
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartHistory} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="metricGradEmerald" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="metricGradBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="metricGradPurple" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.04)" vertical={false} />

              <XAxis
                dataKey="date"
                stroke="#6B7280"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: 'rgba(255, 255, 255, 0.06)' }}
                dy={6}
              />

              <YAxis
                stroke="#6B7280"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                dx={-6}
                tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
              />

              <Tooltip content={<CustomTooltip selectedMetric={metricTab} />} />

              {metricTab === 'backlinks' && (
                <Area
                  type="monotone"
                  dataKey="totalBacklinks"
                  name="Total Backlinks"
                  stroke="#10B981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#metricGradEmerald)"
                />
              )}

              {metricTab === 'domains' && (
                <Area
                  type="monotone"
                  dataKey="referringDomains"
                  name="Referring Domains"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#metricGradBlue)"
                />
              )}

              {metricTab === 'authority' && (
                <>
                  <Area
                    type="monotone"
                    dataKey="domainAuthority"
                    name="Moz Domain Authority"
                    stroke="#10B981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#metricGradEmerald)"
                  />
                  <Line
                    type="monotone"
                    dataKey="pageAuthority"
                    name="Moz Page Authority"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#3B82F6' }}
                  />
                </>
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Dynamic Legend at Bottom */}
      <div className="flex items-center justify-center gap-6 pt-3 mt-2 border-t border-white/[0.04] text-xs">
        {metricTab === 'backlinks' && (
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-text-secondary font-medium">Total Inbound Backlinks</span>
          </div>
        )}
        {metricTab === 'domains' && (
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-text-secondary font-medium">Unique Referring Domains</span>
          </div>
        )}
        {metricTab === 'authority' && (
          <>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-text-secondary font-medium">Moz Domain Authority (DA)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-text-secondary font-medium">Moz Page Authority (PA)</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
