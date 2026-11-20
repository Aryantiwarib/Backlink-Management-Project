import React from 'react';
import { Link2, Globe, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import { formatNumber } from '../../utils/formatters';
import { KpiCardSkeleton } from '../common/SkeletonLoader';

/**
 * Lightweight SVG Sparkline component
 */
const Sparkline = ({ data, color = '#10B981', isNegative = false }) => {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 80;
  const height = 28;

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return `${x},${y}`;
    })
    .join(' ');

  const strokeColor = isNegative ? '#F43F5E' : color;
  const fillColor = isNegative ? 'rgba(244, 63, 94, 0.1)' : 'rgba(16, 185, 129, 0.1)';

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`sparkGrad-${isNegative ? 'neg' : 'pos'}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.2" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

export const KpiCards = () => {
  const { overview, loadingOverview } = useDashboard();

  if (loadingOverview && !overview) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
      </div>
    );
  }

  const kpis = [
    {
      id: 'total-backlinks',
      title: 'Total Backlinks',
      value: overview?.totalBacklinks || 24856,
      change: overview?.metrics?.totalBacklinksChange || 12.8,
      label: 'vs. previous period',
      isPositive: true,
      icon: Link2,
      sparklineData: overview?.sparklines?.totalBacklinks || [21500, 22100, 22800, 23400, 24100, 24500, 24856]
    },
    {
      id: 'referring-domains',
      title: 'Referring Domains',
      value: overview?.referringDomains || 8492,
      change: overview?.metrics?.referringDomainsChange || 6.4,
      label: 'vs. previous period',
      isPositive: true,
      icon: Globe,
      sparklineData: overview?.sparklines?.referringDomains || [7900, 8050, 8180, 8290, 8360, 8420, 8492]
    },
    {
      id: 'new-backlinks',
      title: 'New Backlinks',
      value: overview?.newBacklinks || 1284,
      change: overview?.metrics?.newBacklinksChange || 18.2,
      label: 'this month',
      isPositive: true,
      icon: TrendingUp,
      sparklineData: overview?.sparklines?.newBacklinks || [950, 1020, 1110, 1080, 1190, 1240, 1284]
    },
    {
      id: 'lost-backlinks',
      title: 'Lost Backlinks',
      value: overview?.lostBacklinks || 186,
      change: overview?.metrics?.lostBacklinksChange || -4.6,
      label: 'vs. previous period',
      // Decreasing lost backlinks is actually good for the user, but visually -4.6 is downward
      isPositive: false,
      isLossCard: true,
      icon: TrendingDown,
      sparklineData: overview?.sparklines?.lostBacklinks || [230, 215, 205, 198, 192, 190, 186]
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        const changeNum = Number(kpi.change);
        const isUp = changeNum >= 0;
        
        // For lost backlinks, a drop is favorable (fewer lost links = good), but let's follow the standard rule:
        // Use green for positive/growth indicators and soft red/amber for lost/warning
        const badgeColor = kpi.isLossCard 
          ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
          : (isUp ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-rose-400 bg-rose-500/10 border-rose-500/20');

        return (
          <div
            key={kpi.id}
            className="surface-card rounded-2xl p-5 relative overflow-hidden transition-all duration-200 hover:border-white/[0.12] hover:translate-y-[-1px] group"
          >
            {/* Top row: Label and Icon */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-text-muted tracking-wide uppercase">
                {kpi.title}
              </span>
              <div className="p-2 rounded-xl bg-white/[0.04] text-text-muted group-hover:text-emerald-400 group-hover:bg-emerald-500/10 transition-colors">
                <Icon className="w-4 h-4" />
              </div>
            </div>

            {/* Middle row: Large Value & Sparkline */}
            <div className="flex items-end justify-between gap-2 mb-3">
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
                {formatNumber(kpi.value)}
              </div>
              <div className="pb-1 opacity-80 group-hover:opacity-100 transition-opacity">
                <Sparkline 
                  data={kpi.sparklineData} 
                  color="#10B981" 
                  isNegative={kpi.isLossCard && changeNum > 0} 
                />
              </div>
            </div>

            {/* Bottom row: Trend badge & comparison label */}
            <div className="flex items-center gap-2 pt-2 border-t border-white/[0.04] text-xs">
              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md font-semibold text-[11px] border ${badgeColor}`}>
                {isUp ? (
                  <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 stroke-[2.5]" />
                )}
                {isUp ? `+${changeNum.toFixed(1)}%` : `${changeNum.toFixed(1)}%`}
              </span>
              <span className="text-text-muted text-[11px] truncate">
                {kpi.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
