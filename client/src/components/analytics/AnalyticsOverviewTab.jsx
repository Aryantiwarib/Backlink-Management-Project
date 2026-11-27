import React from 'react';
import {
  Link2,
  Globe2,
  Award,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  PlusCircle,
  XCircle,
  Rocket,
  Target,
  ArrowRight
} from 'lucide-react';
import { formatNumber } from '../../utils/formatters';

const KPI_CONFIG = [
  {
    key: 'totalBacklinks',
    label: 'Total Backlinks',
    icon: Link2,
    iconColor: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10 border-emerald-500/20',
    description: 'Moz Global Index external links'
  },
  {
    key: 'referringDomains',
    label: 'Referring Domains',
    icon: Globe2,
    iconColor: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10 border-emerald-500/20',
    description: 'Unique root domains linking to site'
  },
  {
    key: 'domainAuthority',
    label: 'Moz Domain Authority',
    icon: Award,
    iconColor: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10 border-emerald-500/20',
    description: 'Site-level authority rank (0-100)'
  },
  {
    key: 'pageAuthority',
    label: 'Moz Page Authority',
    icon: Sparkles,
    iconColor: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10 border-emerald-500/20',
    description: 'Root URL ranking strength (0-100)'
  },
  {
    key: 'newBacklinks',
    label: 'New Backlinks (Period)',
    icon: PlusCircle,
    iconColor: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10 border-emerald-500/20',
    description: 'Discovered in selected timeframe'
  },
  {
    key: 'lostBacklinks',
    label: 'Lost Backlinks (Period)',
    icon: XCircle,
    iconColor: 'text-rose-400',
    bgColor: 'bg-rose-500/10 border-rose-500/20',
    description: 'Dropped links in selected timeframe',
    invertTrend: true
  },
  {
    key: 'activeCampaigns',
    label: 'Active Campaigns',
    icon: Rocket,
    iconColor: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10 border-emerald-500/20',
    description: 'Currently running link initiatives'
  },
  {
    key: 'qualifiedProspects',
    label: 'Qualified Prospects',
    icon: Target,
    iconColor: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10 border-emerald-500/20',
    description: 'High-opportunity outreach targets'
  }
];

export const AnalyticsOverviewTab = ({ overviewData, onSelectTab }) => {
  if (!overviewData || !overviewData.kpis) {
    return (
      <div className="p-8 text-center text-slate-400">
        No analytics data available for this website and period.
      </div>
    );
  }

  const { kpis, netBacklinks, period } = overviewData;

  const renderComparisonBadge = (metric, invertTrend = false) => {
    if (!metric || !metric.hasComparison) {
      if (metric?.status === 'first_record') {
        return (
          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
            <Minus className="w-3 h-3 text-slate-500" /> Initial baseline
          </span>
        );
      }
      return (
        <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
          <Minus className="w-3 h-3 text-slate-500" /> No comparison data
        </span>
      );
    }

    const { percentChange, absoluteChange, isPositive } = metric;
    const isGood = invertTrend ? !isPositive : isPositive;

    let displayChg = '';
    if (percentChange !== null && percentChange !== undefined) {
      displayChg = `${percentChange > 0 ? '+' : ''}${percentChange}%`;
    } else if (absoluteChange !== null && absoluteChange !== undefined) {
      displayChg = `${absoluteChange > 0 ? '+' : ''}${absoluteChange}`;
    }

    return (
      <div
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold ${
          isGood
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
        }`}
      >
        {isPositive ? (
          <TrendingUp className="w-3 h-3" />
        ) : (
          <TrendingDown className="w-3 h-3" />
        )}
        <span>{displayChg}</span>
        <span className="text-slate-400 text-[10px] font-normal">vs prev</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Net Backlink Growth Banner Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#15191E] via-emerald-950/20 to-[#15191E] border border-white/[0.08] p-6 shadow-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                Period Net Velocity
              </span>
              <span className="text-xs text-text-muted font-mono">
                {period?.range?.toUpperCase()} Window ({new Date(period?.current?.startDate).toLocaleDateString()} - {new Date(period?.current?.endDate).toLocaleDateString()})
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-text-primary tracking-tight flex items-center gap-3">
              Net Backlink Growth:{' '}
              <span
                className={`font-mono ${
                  netBacklinks.current >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {netBacklinks.current >= 0 ? `+${netBacklinks.current}` : netBacklinks.current} Links
              </span>
            </h2>
            <p className="text-xs text-text-secondary mt-1 max-w-xl">
              Calculated as newly indexed backlinks ({kpis.newBacklinks.current || 0}) minus detected dropped/lost backlinks ({kpis.lostBacklinks.current || 0}) during this reporting period.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-[#101318]/90 border border-white/[0.06] rounded-xl p-4">
            <div className="text-right">
              <div className="text-[11px] font-medium text-text-muted uppercase">Previous Window</div>
              <div className="text-base font-bold font-mono text-text-primary">
                {netBacklinks.previous >= 0 ? `+${netBacklinks.previous}` : netBacklinks.previous}
              </div>
            </div>
            <div className="h-8 w-px bg-white/[0.08]" />
            <div>
              <div className="text-[11px] font-medium text-text-muted uppercase">Period Shift</div>
              <div
                className={`text-base font-bold font-mono ${
                  netBacklinks.change >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {netBacklinks.change >= 0 ? `+${netBacklinks.change}` : netBacklinks.change}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 8 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_CONFIG.map((config) => {
          const metricData = kpis[config.key];
          const Icon = config.icon;
          const currValue = metricData?.current;

          return (
            <div
              key={config.key}
              className="bg-[#15191E] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-5 shadow-card transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-semibold text-text-secondary">
                    {config.label}
                  </span>
                  <div className={`p-2 rounded-xl border ${config.bgColor}`}>
                    <Icon className={`w-4 h-4 ${config.iconColor}`} />
                  </div>
                </div>

                <div className="text-2xl font-black font-mono text-text-primary tracking-tight">
                  {currValue !== null && currValue !== undefined
                    ? formatNumber(currValue)
                    : 'N/A'}
                </div>
                <div className="text-[11px] text-text-muted mt-0.5 truncate">
                  {config.description}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                {renderComparisonBadge(metricData, config.invertTrend)}
                {metricData?.previous !== null && metricData?.previous !== undefined && (
                  <span className="text-[10px] text-text-muted font-mono">
                    Prev: {formatNumber(metricData.previous)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Navigation Cards to Deep-Dive Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <button
          onClick={() => onSelectTab('backlinks')}
          className="bg-[#15191E] hover:bg-white/[0.03] border border-white/[0.06] hover:border-emerald-500/30 rounded-2xl p-4 text-left transition-all flex items-center justify-between group shadow-card"
        >
          <div>
            <div className="text-xs font-bold text-text-primary group-hover:text-emerald-400 transition">
              Backlink Growth Analytics
            </div>
            <div className="text-[11px] text-text-muted mt-0.5">
              Historical line charts, new vs lost breakdown, and anchor profiles
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-emerald-400 group-hover:translate-x-0.5 transition" />
        </button>

        <button
          onClick={() => onSelectTab('campaigns')}
          className="bg-[#15191E] hover:bg-white/[0.03] border border-white/[0.06] hover:border-emerald-500/30 rounded-2xl p-4 text-left transition-all flex items-center justify-between group shadow-card"
        >
          <div>
            <div className="text-xs font-bold text-text-primary group-hover:text-emerald-400 transition">
              Campaign & Prospect Performance
            </div>
            <div className="text-[11px] text-text-muted mt-0.5">
              Acquisition progress, outreach pipelines, and discovery rates
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-emerald-400 group-hover:translate-x-0.5 transition" />
        </button>

        <button
          onClick={() => onSelectTab('insights')}
          className="bg-[#15191E] hover:bg-white/[0.03] border border-white/[0.06] hover:border-emerald-500/30 rounded-2xl p-4 text-left transition-all flex items-center justify-between group shadow-card"
        >
          <div>
            <div className="text-xs font-bold text-text-primary group-hover:text-emerald-400 transition">
              Deterministic SEO Insights
            </div>
            <div className="text-[11px] text-text-muted mt-0.5">
              Data-backed findings, ratio warnings, and tactical next steps
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-emerald-400 group-hover:translate-x-0.5 transition" />
        </button>
      </div>
    </div>
  );
};
