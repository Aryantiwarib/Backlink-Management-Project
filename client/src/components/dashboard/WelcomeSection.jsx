import React from 'react';
import { Download, Plus, Sparkles, RefreshCw } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';

export const WelcomeSection = () => {
  const { openNewCampaignModal, handleExportReport, refreshAll, loadingOverview } = useDashboard();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.04]">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
            Good afternoon, Alex
          </h1>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
            Live Monitor
          </span>
        </div>
        <p className="text-xs sm:text-sm text-text-muted mt-1">
          Here's what's happening with your SEO performance.
        </p>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
        {/* Quick Refresh */}
        <button
          onClick={refreshAll}
          title="Refresh dashboard metrics"
          className="p-2 rounded-xl border border-white/[0.08] bg-[#15191E] text-text-secondary hover:text-text-primary hover:border-white/[0.15] transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loadingOverview ? 'animate-spin text-emerald-400' : ''}`} />
        </button>

        {/* Export Report Button */}
        <button
          onClick={handleExportReport}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-white/[0.08] bg-[#15191E] text-text-secondary hover:text-text-primary hover:border-white/[0.16] hover:bg-white/[0.03] text-xs font-medium transition-all shadow-subtle active:scale-[0.98]"
        >
          <Download className="w-3.5 h-3.5 text-text-muted" />
          <span>Export Report</span>
        </button>

        {/* + New Campaign Primary Button */}
        <button
          onClick={openNewCampaignModal}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs tracking-tight transition-all shadow-glow-brand active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Campaign</span>
        </button>
      </div>
    </div>
  );
};
