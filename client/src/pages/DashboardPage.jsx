import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, RefreshCw, Wrench, Globe, Plus } from 'lucide-react';
import { WelcomeSection } from '../components/dashboard/WelcomeSection';
import { KpiCards } from '../components/dashboard/KpiCards';
import { BacklinkGrowthChart } from '../components/dashboard/BacklinkGrowthChart';
import { LinkAttributesDonut } from '../components/dashboard/LinkAttributesDonut';
import { RecentBacklinksTable } from '../components/dashboard/RecentBacklinksTable';
import { RecentActivityTimeline } from '../components/dashboard/RecentActivityTimeline';
import { ContentOverviewCard } from '../components/dashboard/ContentOverviewCard';
import { ActionableAlerts } from '../components/dashboard/ActionableAlerts';
import { useDashboard } from '../context/DashboardContext';
import { useWebsite } from '../context/WebsiteContext';
import { KpiCardSkeleton, ChartSkeleton, TableSkeleton } from '../components/common/SkeletonLoader';

export const DashboardPage = () => {
  const { loading: loadingWebsites } = useWebsite();
  const {
    loadingDashboard,
    dashboardError,
    hasData,
    website,
    refreshDashboard
  } = useDashboard();
  const navigate = useNavigate();

  // 1. Loading Skeleton State (while website context or dashboard metrics are loading)
  if (loadingWebsites || loadingDashboard) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="h-14 bg-white/[0.02] rounded-2xl border border-white/[0.04] animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ChartSkeleton />
          </div>
          <div className="lg:col-span-1">
            <ChartSkeleton height={300} />
          </div>
        </div>
        <TableSkeleton rows={5} />
      </div>
    );
  }

  // 2. Error State
  if (dashboardError) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="surface-card rounded-2xl p-8 border border-rose-500/20 text-center max-w-lg mx-auto my-12 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text-primary">Failed to Load Dashboard Data</h2>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              {dashboardError}
            </p>
          </div>
          <button
            onClick={refreshDashboard}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-text-primary text-xs font-semibold border border-white/[0.1] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  // 3. No Website Registered State (only shown when not loading and user has no website)
  if (!website) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="surface-card rounded-2xl p-10 border border-white/[0.08] text-center max-w-md mx-auto my-12 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text-primary">No Website Selected</h2>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              Please register or select a website in Website Management to view your SEO analytics dashboard.
            </p>
          </div>
          <button
            onClick={() => navigate('/websites')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold transition-all shadow-glow-brand"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Manage Websites</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Section A: Welcome & Top Actions */}
      <WelcomeSection />

      {/* No SEO Data Alert Banner (When website exists but has 0 snapshots in DB) */}
      {!hasData && (
        <div className="surface-card rounded-2xl p-6 border border-emerald-500/30 bg-emerald-500/[0.02] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-card">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">
                Ready to Activate SEO Analytics for <span className="font-mono text-emerald-400">{website.domain}</span>
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                No historical snapshots are stored in MongoDB yet. Query live metrics in SEO Tools to establish your baseline.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/seo-tools')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition-all shadow-glow-brand flex-shrink-0"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Go to SEO Tools & Fetch Real Data</span>
          </button>
        </div>
      )}

      {/* Section B: Dynamic KPI Cards (5 Metrics: Total Backlinks, Referring Domains, DA, PA, Spam Score) */}
      <KpiCards />

      {/* Section C & D: Dynamic Backlink Growth Chart & Link Attributes Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <BacklinkGrowthChart />
        </div>
        <div className="lg:col-span-1">
          <LinkAttributesDonut />
        </div>
      </div>

      {/* Section E: Dynamic Recently Acquired Backlinks Table */}
      <RecentBacklinksTable />

      {/* Section F, G, H: Dynamic Activity Timeline, Content Overview, Actionable Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <RecentActivityTimeline />
        <ContentOverviewCard />
        <ActionableAlerts />
      </div>
    </div>
  );
};
