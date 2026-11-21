import React from 'react';
import { Download, RefreshCw, Globe, ArrowUpRight, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../../context/DashboardContext';
import { useAuth } from '../../context/AuthContext';

export const WelcomeSection = () => {
  const { handleExportReport, refreshAll, loadingDashboard, website, lastUpdated, hasData } = useDashboard();
  const { user } = useAuth();
  const navigate = useNavigate();
  const firstName = user?.name?.split(' ')[0] || 'User';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.04]">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
            Welcome back, {firstName}
          </h1>
          {website?.domain && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Globe className="w-3 h-3 mr-1.5" />
              {website.domain}
            </span>
          )}
        </div>
        <p className="text-xs sm:text-sm text-text-muted mt-1">
          {hasData && lastUpdated ? (
            <>
              Live metrics from MongoDB • Last snapshot recorded on{' '}
              <span className="text-text-secondary font-mono">
                {new Date(lastUpdated).toLocaleString()}
              </span>
            </>
          ) : (
            'Persistent SEO Intelligence & Backlink Command Center.'
          )}
        </p>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
        {/* Quick Refresh */}
        <button
          onClick={refreshAll}
          disabled={loadingDashboard}
          title="Reload metrics from MongoDB"
          className="p-2 rounded-xl border border-white/[0.08] bg-[#15191E] text-text-secondary hover:text-text-primary hover:border-white/[0.15] transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loadingDashboard ? 'animate-spin text-emerald-400' : ''}`} />
        </button>

        {/* Export Report Button */}
        <button
          onClick={handleExportReport}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-white/[0.08] bg-[#15191E] text-text-secondary hover:text-text-primary hover:border-white/[0.16] hover:bg-white/[0.03] text-xs font-medium transition-all shadow-subtle active:scale-[0.98]"
        >
          <Download className="w-3.5 h-3.5 text-text-muted" />
          <span>Export Report</span>
        </button>

        {/* SEO Tools Link */}
        <button
          onClick={() => navigate('/seo-tools')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs tracking-tight transition-all shadow-glow-brand active:scale-[0.98]"
        >
          <Wrench className="w-4 h-4" />
          <span>SEO Tools</span>
        </button>
      </div>
    </div>
  );
};
