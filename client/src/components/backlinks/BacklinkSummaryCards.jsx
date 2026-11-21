import React from 'react';
import { Link2, Globe, ShieldCheck, ShieldAlert } from 'lucide-react';
import { formatNumber } from '../../utils/formatters';

export const BacklinkSummaryCards = ({ stats, loading }) => {
  const total = stats?.totalSavedBacklinks || 0;
  const uniqueDomains = stats?.uniqueReferringDomains || 0;
  const dofollow = stats?.dofollowCount || 0;
  const nofollow = stats?.nofollowCount || 0;
  const dofollowRatio = stats?.dofollowRatio || (total > 0 ? Math.round((dofollow / total) * 100) : 0);
  const nofollowRatio = total > 0 ? Math.round((nofollow / total) * 100) : 0;

  const cards = [
    {
      label: 'Total Stored Backlinks',
      value: formatNumber(total),
      subtext: 'Indexed in Linkora database',
      icon: Link2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20'
    },
    {
      label: 'Unique Referring Domains',
      value: formatNumber(uniqueDomains),
      subtext: 'Distinct linking root domains',
      icon: Globe,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20'
    },
    {
      label: 'Dofollow Backlinks',
      value: formatNumber(dofollow),
      subtext: `${dofollowRatio}% of total link equity`,
      badge: `${dofollowRatio}%`,
      badgeColor: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
      icon: ShieldCheck,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20'
    },
    {
      label: 'Nofollow Backlinks',
      value: formatNumber(nofollow),
      subtext: `${nofollowRatio}% attribute rel="nofollow"`,
      badge: `${nofollowRatio}%`,
      badgeColor: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
      icon: ShieldAlert,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;

        if (loading) {
          return (
            <div
              key={idx}
              className="surface-card rounded-2xl p-5 border border-white/[0.06] animate-pulse space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="h-3 w-24 bg-white/[0.05] rounded" />
                <div className="w-8 h-8 rounded-xl bg-white/[0.05]" />
              </div>
              <div className="h-7 w-20 bg-white/[0.05] rounded mt-2" />
              <div className="h-3 w-32 bg-white/[0.05] rounded mt-1" />
            </div>
          );
        }

        return (
          <div
            key={card.label}
            className="surface-card rounded-2xl p-5 border border-white/[0.06] hover:border-white/[0.12] transition-all duration-300 relative overflow-hidden group shadow-card"
          >
            <div className="flex items-start justify-between">
              <span className="text-xs font-medium text-text-muted">{card.label}</span>
              <div className={`p-2 rounded-xl border ${card.bg} ${card.border} ${card.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold font-mono text-text-primary tracking-tight">
                {card.value}
              </span>
              {card.badge && (
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${card.badgeColor}`}
                >
                  {card.badge}
                </span>
              )}
            </div>

            <p className="text-[11px] text-text-muted mt-1 leading-snug truncate">
              {card.subtext}
            </p>
          </div>
        );
      })}
    </div>
  );
};
