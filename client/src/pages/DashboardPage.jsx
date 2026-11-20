import React from 'react';
import { WelcomeSection } from '../components/dashboard/WelcomeSection';
import { KpiCards } from '../components/dashboard/KpiCards';
import { BacklinkGrowthChart } from '../components/dashboard/BacklinkGrowthChart';
import { LinkAttributesDonut } from '../components/dashboard/LinkAttributesDonut';
import { RecentBacklinksTable } from '../components/dashboard/RecentBacklinksTable';
import { RecentActivityTimeline } from '../components/dashboard/RecentActivityTimeline';
import { ContentOverviewCard } from '../components/dashboard/ContentOverviewCard';
import { ActionableAlerts } from '../components/dashboard/ActionableAlerts';

export const DashboardPage = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Section A: Welcome & Top Actions */}
      <WelcomeSection />

      {/* Section B: KPI Cards (4 Cards) */}
      <KpiCards />

      {/* Section C & D: Backlink Growth Chart & Link Attributes Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <BacklinkGrowthChart />
        </div>
        <div className="lg:col-span-1">
          <LinkAttributesDonut />
        </div>
      </div>

      {/* Section E: Recently Acquired Backlinks Table */}
      <RecentBacklinksTable />

      {/* Section F, G, H: Recent Activity, Content Overview, Actionable Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Section F: Recent Activity */}
        <RecentActivityTimeline />

        {/* Section G: Content Overview */}
        <ContentOverviewCard />

        {/* Section H: Actionable Alerts ("Needs Attention") */}
        <ActionableAlerts />
      </div>
    </div>
  );
};
