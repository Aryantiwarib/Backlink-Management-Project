import React from 'react';
import {
  Link2,
  Globe,
  Award,
  ShieldCheck,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import { formatNumber } from '../../utils/formatters';
import { KpiCardSkeleton } from '../common/SkeletonLoader';

/**
 * Lightweight SVG Sparkline component using real historical data points
 */
const Sparkline = ({ data, color = '#10B981', isNegative = false }) => {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 75;
  const height = 26;

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return `${x},${y}`;
    })
    .join(' ');

  const strokeColor = isNegative ? '#F43F5E' : color;

  return (
    <svg width={width} height={height} className="overflow-visible">
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

/**
 * Renders a comparison delta pill
 */
const MetricDeltaBadge = ({ delta }) => {
  if (!delta || delta.status === 'no_data' || delta.current === null) {
    return <span className="text-[11px] text-text-muted italic">No data recorded</span>;
  }

  if (delta.status === 'first_record' || !delta.hasComparison) {
    return (
      <span className="text-[10px] text-text-muted font-mono bg-white/[0.04] px-1.5 py-0.5 rounded">
        Baseline established • No prior comparison
      </span>
    );
  }

  const { absoluteChange, percentChange, isPositive } = delta;

  if (absoluteChange === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-text-muted bg-white/[0.04] px-1.5 py-0.5 rounded">
        <Minus className="w-3 h-3" />
        <span>Unchanged vs prev</span>
      </span>
    );
  }

  const badgeColor = isPositive
    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    : 'text-rose-400 bg-rose-500/10 border-rose-500/20';

  const ArrowIcon = isPositive ? ArrowUpRight : ArrowDownRight;
  const sign = isPositive ? '+' : '';

  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full border ${badgeColor}`}
    >
      <ArrowIcon className="w-3 h-3" />
      <span>
        {sign}
        {formatNumber(absoluteChange)}
        {percentChange !== null && ` (${sign}${percentChange}%)`}
      </span>
      <span className="text-[9px] text-text-muted font-sans font-normal ml-0.5">vs prev</span>
    </span>
  );
};

export const KpiCards = () => {
  const { metrics, sparklines, loadingDashboard, hasData } = useDashboard();

  if (loadingDashboard) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCardSkeleton />
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
      value: metrics.totalBacklinks?.current !== null ? formatNumber(metrics.totalBacklinks?.current) : 'N/A',
      delta: metrics.totalBacklinks,
      icon: Link2,
      iconColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      sparkline: sparklines.totalBacklinks
    },
    {
      id: 'referring-domains',
      title: 'Referring Domains',
      value: metrics.referringDomains?.current !== null ? formatNumber(metrics.referringDomains?.current) : 'N/A',
      delta: metrics.referringDomains,
      icon: Globe,
      iconColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      sparkline: sparklines.referringDomains
    },
    {
      id: 'domain-authority',
      title: 'Moz Domain Authority',
      value: metrics.domainAuthority?.current !== null ? metrics.domainAuthority?.current : 'N/A',
      subValue: '/ 100',
      progress: metrics.domainAuthority?.current || 0,
      delta: metrics.domainAuthority,
      icon: Award,
      iconColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      sparkline: sparklines.domainAuthority
    },
    {
      id: 'page-authority',
      title: 'Moz Page Authority',
      value: metrics.pageAuthority?.current !== null ? metrics.pageAuthority?.current : 'N/A',
      subValue: '/ 100',
      progress: metrics.pageAuthority?.current || 0,
      delta: metrics.pageAuthority,
      icon: Award,
      iconColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      sparkline: sparklines.pageAuthority
    },
    {
      id: 'spam-score',
      title: 'Spam Score',
      value: metrics.spamScore?.current !== null ? `${metrics.spamScore?.current}%` : 'N/A',
      delta: metrics.spamScore,
      icon: (metrics.spamScore?.current || 0) > 30 ? AlertTriangle : ShieldCheck,
      iconColor:
        (metrics.spamScore?.current || 0) > 30
          ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
          : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      isSpamCard: true,
      spamValue: metrics.spamScore?.current
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;

        return (
          <div
            key={kpi.id}
            className="surface-card p-4 rounded-2xl border border-white/[0.06] shadow-card flex flex-col justify-between hover:border-white/[0.12] transition-colors"
          >
            <div>
              {/* Card Header */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs text-text-muted font-medium truncate">{kpi.title}</span>
                <div
                  className={`w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0 ${kpi.iconColor}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Value & Progress */}
              <div className="flex items-baseline gap-1.5 my-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-text-primary font-mono tracking-tight">
                  {kpi.value}
                </span>
                {kpi.subValue && <span className="text-xs text-text-muted">{kpi.subValue}</span>}
                {kpi.isSpamCard && kpi.spamValue !== null && kpi.spamValue !== undefined && (
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ml-auto ${
                      kpi.spamValue > 30
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}
                  >
                    {kpi.spamValue > 30 ? 'Elevated' : 'Low Risk'}
                  </span>
                )}
              </div>

              {/* Authority Progress Bar */}
              {kpi.progress !== undefined && (
                <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden my-2">
                  <div
                    className={`h-full rounded-full ${
                      kpi.id === 'page-authority'
                        ? 'bg-gradient-to-r from-blue-500 to-blue-400'
                        : 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                    }`}
                    style={{ width: `${Math.min(kpi.progress, 100)}%` }}
                  />
                </div>
              )}
            </div>

            {/* Card Footer: Delta Badge or Sparkline */}
            <div className="flex items-center justify-between gap-2 pt-2 mt-2 border-t border-white/[0.04]">
              <MetricDeltaBadge delta={kpi.delta} />
              {kpi.sparkline && kpi.sparkline.length >= 2 && (
                <div className="flex-shrink-0">
                  <Sparkline
                    data={kpi.sparkline}
                    color={kpi.id === 'page-authority' ? '#3B82F6' : '#10B981'}
                    isNegative={kpi.delta?.isPositive === false}
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
