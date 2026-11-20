import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { useDashboard } from '../../context/DashboardContext';
import { ChartSkeleton } from '../common/SkeletonLoader';

/**
 * Custom High-End Dark Tooltip
 */
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#15191E]/95 backdrop-blur-md border border-white/[0.1] rounded-xl p-3 shadow-elevated text-xs">
        <div className="font-semibold text-text-primary pb-2 mb-2 border-b border-white/[0.06]">
          {label}
        </div>
        <div className="space-y-1.5">
          {payload.map((entry, index) => {
            let labelName = entry.name;
            let valueColor = entry.color;
            if (entry.dataKey === 'newBacklinks') {
              labelName = 'New Backlinks';
              valueColor = '#10B981';
            } else if (entry.dataKey === 'lostBacklinks') {
              labelName = 'Lost Backlinks';
              valueColor = '#F43F5E';
            } else if (entry.dataKey === 'netGrowth') {
              labelName = 'Net Growth';
              valueColor = '#3B82F6';
            }

            return (
              <div key={`tooltip-${index}`} className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: valueColor }}
                  />
                  <span className="text-text-secondary">{labelName}</span>
                </div>
                <span className="font-mono font-medium text-text-primary">
                  {entry.value > 0 && entry.dataKey === 'netGrowth' ? `+${entry.value}` : entry.value}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

export const BacklinkGrowthChart = () => {
  const { chartRange, setChartRange, growthData, loadingGrowth } = useDashboard();

  const ranges = ['7D', '30D', '90D', '12M'];

  return (
    <div className="surface-card rounded-2xl p-6 relative">
      {/* Header with Title and Range Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-base font-bold text-text-primary tracking-tight">
            Backlink Growth
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Monitor how your backlink profile evolves over time.
          </p>
        </div>

        {/* Range Buttons */}
        <div className="flex items-center bg-[#101318] p-1 rounded-xl border border-white/[0.06] self-start sm:self-auto">
          {ranges.map((r) => {
            const isActive = chartRange === r;
            return (
              <button
                key={r}
                onClick={() => setChartRange(r)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {r}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-[290px] w-full">
        {loadingGrowth && (!growthData || growthData.length === 0) ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={growthData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                {/* Emerald Gradient for New Backlinks */}
                <linearGradient id="newGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
                {/* Blue Gradient for Net Growth */}
                <linearGradient id="netGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                </linearGradient>
                {/* Rose Gradient for Lost Backlinks */}
                <linearGradient id="lostGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255, 255, 255, 0.04)"
                vertical={false}
              />

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
              />

              <Tooltip content={<CustomTooltip />} />

              <Area
                type="monotone"
                dataKey="newBacklinks"
                name="New Backlinks"
                stroke="#10B981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#newGrowthGrad)"
              />

              <Area
                type="monotone"
                dataKey="netGrowth"
                name="Net Growth"
                stroke="#3B82F6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#netGrowthGrad)"
              />

              <Area
                type="monotone"
                dataKey="lostBacklinks"
                name="Lost Backlinks"
                stroke="#F43F5E"
                strokeWidth={1.8}
                strokeDasharray="4 4"
                fillOpacity={1}
                fill="url(#lostGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Clean Legend at Bottom */}
      <div className="flex items-center justify-center gap-6 pt-3 mt-2 border-t border-white/[0.04] text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-text-secondary font-medium">New Backlinks</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span className="text-text-secondary font-medium">Net Growth</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          <span className="text-text-secondary font-medium">Lost Backlinks</span>
        </div>
      </div>
    </div>
  );
};
