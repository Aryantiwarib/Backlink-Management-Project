import React from 'react';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Zap,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

const TYPE_CONFIG = {
  growth: {
    icon: TrendingUp,
    badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    borderColor: 'border-emerald-500/25 hover:border-emerald-500/40'
  },
  warning: {
    icon: AlertTriangle,
    badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    borderColor: 'border-rose-500/25 hover:border-rose-500/40'
  },
  success: {
    icon: ShieldCheck,
    badgeBg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    borderColor: 'border-blue-500/25 hover:border-blue-500/40'
  },
  recommendation: {
    icon: Lightbulb,
    badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    borderColor: 'border-amber-500/25 hover:border-amber-500/40'
  },
  action: {
    icon: Zap,
    badgeBg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    borderColor: 'border-purple-500/25 hover:border-purple-500/40'
  }
};

export const SeoInsightsSection = ({ insightsData }) => {
  if (!insightsData || !insightsData.insights) {
    return (
      <div className="p-8 text-center text-text-muted">
        Loading SEO performance insights...
      </div>
    );
  }

  const { insights = [] } = insightsData;

  if (insights.length === 0) {
    return (
      <div className="bg-[#15191E] border border-white/[0.06] rounded-2xl p-8 text-center text-text-muted shadow-card">
        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
        <h4 className="text-sm font-bold text-text-primary">No Critical Issues Detected</h4>
        <p className="text-xs text-text-muted mt-1">
          Your backlink profile and campaigns are performing within balanced baseline parameters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Deterministic SEO Performance Insights
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Evidence-based observations calculated directly from your backlink records, monitoring alerts, and outreach pipelines
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#15191E] text-text-secondary border border-white/[0.08] font-mono">
          {insights.length} Findings
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.map((item, idx) => {
          const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.recommendation;
          const Icon = cfg.icon;

          return (
            <div
              key={`insight-${idx}`}
              className={`bg-[#15191E] border ${cfg.borderColor} rounded-2xl p-5 shadow-card flex flex-col justify-between hover:bg-white/[0.02] transition-colors`}
            >
              <div>
                <div className="flex items-center justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`p-1.5 rounded-xl border ${cfg.badgeBg}`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <h4 className="text-xs font-bold text-text-primary">{item.title}</h4>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono ${
                      item.priority === 'high'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-white/[0.05] text-text-muted border border-white/[0.08]'
                    }`}
                  >
                    {item.priority}
                  </span>
                </div>

                <div className="bg-[#101318] border border-white/[0.06] rounded-xl p-2.5 mb-3 flex items-center justify-between">
                  <span className="text-[11px] text-text-muted">Observed Metric:</span>
                  <span className="text-xs font-bold font-mono text-indigo-300">{item.metric}</span>
                </div>

                <p className="text-xs text-text-secondary leading-relaxed mb-3">
                  {item.observation}
                </p>

                <div className="text-[11px] text-text-muted mb-3 bg-[#101318]/70 p-3 rounded-xl border border-white/[0.04]">
                  <strong className="text-text-primary">Why it matters:</strong> {item.whyItMatters}
                </div>
              </div>

              <div className="pt-3 border-t border-white/[0.06] flex items-start gap-2">
                <ArrowRight className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-xs text-emerald-400 font-medium leading-tight">
                  {item.suggestedNextStep}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
