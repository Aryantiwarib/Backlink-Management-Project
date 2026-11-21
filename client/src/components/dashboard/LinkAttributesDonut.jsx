import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useDashboard } from '../../context/DashboardContext';
import { ShieldCheck, HelpCircle, Link2 } from 'lucide-react';
import { formatNumber } from '../../utils/formatters';

const CustomDonutTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#15191E]/95 backdrop-blur-md border border-white/[0.1] rounded-xl p-2.5 shadow-elevated text-xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
          <span className="font-semibold text-text-primary">{data.name}</span>
        </div>
        <div className="text-text-muted">
          <span className="text-text-primary font-mono font-medium">{data.value}%</span> of indexed links ({formatNumber(data.count)} links)
        </div>
      </div>
    );
  }
  return null;
};

export const LinkAttributesDonut = () => {
  const { linkAttributes, linkAttributesSummary, loadingDashboard } = useDashboard();

  const total = linkAttributesSummary?.total || 0;
  const dofollowRatio = linkAttributesSummary?.dofollowRatio || 0;

  return (
    <div className="surface-card rounded-2xl p-6 flex flex-col justify-between relative">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-text-primary tracking-tight">
            Link Attributes
          </h2>
          <span
            className="p-1 rounded-md text-text-muted hover:text-text-primary cursor-pointer transition-colors"
            title="Equity classification (rel='dofollow' vs rel='nofollow') for indexed backlinks"
          >
            <HelpCircle className="w-4 h-4" />
          </span>
        </div>
        <p className="text-xs text-text-muted mt-0.5">
          Distribution across {total} indexed backlink record{total === 1 ? '' : 's'}.
        </p>
      </div>

      {/* Donut Chart or Clean Empty State */}
      <div className="relative h-[190px] w-full my-2 flex items-center justify-center">
        {loadingDashboard ? (
          <div className="animate-spin rounded-full h-7 w-7 border-2 border-emerald-500 border-t-transparent" />
        ) : total === 0 ? (
          <div className="text-center p-4 space-y-1 text-xs text-text-muted">
            <Link2 className="w-7 h-7 mx-auto opacity-40 text-text-muted" />
            <p className="font-medium text-text-secondary">No Indexed Backlinks</p>
            <p className="text-[11px]">Save backlink rows to view equity breakdown.</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<CustomDonutTooltip />} />
                <Pie
                  data={linkAttributes}
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={78}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="#15191E"
                  strokeWidth={3}
                >
                  {linkAttributes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-extrabold text-text-primary tracking-tight">
                {dofollowRatio}%
              </span>
              <span className="text-[10px] font-medium text-emerald-400 uppercase tracking-wider">
                Dofollow
              </span>
            </div>
          </>
        )}
      </div>

      {/* Breakdown Legend List */}
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/[0.04]">
        {linkAttributes.length > 0 ? (
          linkAttributes.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-text-secondary font-medium">{item.name}</span>
              </div>
              <div className="text-xs font-mono font-semibold text-text-primary">
                {item.value}%
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-2 text-center text-[11px] text-text-muted py-1 italic">
            Attribute breakdown available upon backlink indexing.
          </div>
        )}
      </div>

      {/* Quality hint badge */}
      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-text-muted">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
        <span>
          {dofollowRatio >= 60
            ? 'High-equity profile: Strong dofollow link distribution.'
            : 'Balanced profile: Natural distribution of link attributes.'}
        </span>
      </div>
    </div>
  );
};
