import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Link2,
  Rocket,
  Target,
  Mail,
  Zap,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useWebsite } from '../context/WebsiteContext';
import { useToast } from '../context/ToastContext';
import { analyticsService } from '../api/analyticsService';
import { AnalyticsHeader } from '../components/analytics/AnalyticsHeader';
import { AnalyticsOverviewTab } from '../components/analytics/AnalyticsOverviewTab';
import { BacklinkAnalyticsTab } from '../components/analytics/BacklinkAnalyticsTab';
import { CampaignAnalyticsTab } from '../components/analytics/CampaignAnalyticsTab';
import { ProspectAnalyticsTab } from '../components/analytics/ProspectAnalyticsTab';
import { OutreachAnalyticsTab } from '../components/analytics/OutreachAnalyticsTab';
import { SeoInsightsSection } from '../components/analytics/SeoInsightsSection';
import { ExecutiveReportModal } from '../components/analytics/ExecutiveReportModal';
import { downloadAnalyticsCsv } from '../utils/exportAnalytics';

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'backlinks', label: 'Backlink Growth', icon: Link2 },
  { id: 'campaigns', label: 'Campaigns', icon: Rocket },
  { id: 'prospects', label: 'Prospecting', icon: Target },
  { id: 'outreach', label: 'Outreach & Hub', icon: Mail },
  { id: 'insights', label: 'SEO Insights', icon: Zap }
];

export const AnalyticsPage = () => {
  const { activeWebsite } = useWebsite();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const activeSiteId = activeWebsite?._id || activeWebsite?.id;

  const queryOptions = {
    range: dateRange,
    ...(dateRange === 'custom' && {
      startDate: customStart,
      endDate: customEnd
    })
  };

  // 1. Overview Query
  const {
    data: overviewData,
    isLoading: loadingOverview,
    isFetching: fetchingOverview,
    error: overviewError,
    refetch: refetchOverview
  } = useQuery({
    queryKey: ['analytics', 'overview', activeSiteId, dateRange, customStart, customEnd],
    queryFn: () => analyticsService.getOverview(activeSiteId, queryOptions),
    enabled: Boolean(activeSiteId),
    staleTime: 1000 * 60 * 2
  });

  // 2. Backlinks Query
  const {
    data: backlinkData,
    isLoading: loadingBacklinks,
    refetch: refetchBacklinks
  } = useQuery({
    queryKey: ['analytics', 'backlinks', activeSiteId, dateRange, customStart, customEnd],
    queryFn: () => analyticsService.getBacklinks(activeSiteId, queryOptions),
    enabled: Boolean(activeSiteId) && (activeTab === 'backlinks' || activeTab === 'overview'),
    staleTime: 1000 * 60 * 2
  });

  // 3. Campaigns Query
  const {
    data: campaignData,
    isLoading: loadingCampaigns,
    refetch: refetchCampaigns
  } = useQuery({
    queryKey: ['analytics', 'campaigns', activeSiteId, dateRange, customStart, customEnd],
    queryFn: () => analyticsService.getCampaigns(activeSiteId, queryOptions),
    enabled: Boolean(activeSiteId) && (activeTab === 'campaigns' || activeTab === 'overview'),
    staleTime: 1000 * 60 * 2
  });

  // 4. Prospects Query
  const {
    data: prospectData,
    isLoading: loadingProspects,
    refetch: refetchProspects
  } = useQuery({
    queryKey: ['analytics', 'prospects', activeSiteId, dateRange, customStart, customEnd],
    queryFn: () => analyticsService.getProspects(activeSiteId, queryOptions),
    enabled: Boolean(activeSiteId) && (activeTab === 'prospects' || activeTab === 'overview'),
    staleTime: 1000 * 60 * 2
  });

  // 5. Outreach Query
  const {
    data: outreachData,
    isLoading: loadingOutreach,
    refetch: refetchOutreach
  } = useQuery({
    queryKey: ['analytics', 'outreach', activeSiteId, dateRange, customStart, customEnd],
    queryFn: () => analyticsService.getOutreach(activeSiteId, queryOptions),
    enabled: Boolean(activeSiteId) && (activeTab === 'outreach' || activeTab === 'overview'),
    staleTime: 1000 * 60 * 2
  });

  // 6. Insights Query
  const {
    data: insightsData,
    isLoading: loadingInsights,
    refetch: refetchInsights
  } = useQuery({
    queryKey: ['analytics', 'insights', activeSiteId, dateRange, customStart, customEnd],
    queryFn: () => analyticsService.getInsights(activeSiteId, queryOptions),
    enabled: Boolean(activeSiteId) && (activeTab === 'insights' || activeTab === 'overview'),
    staleTime: 1000 * 60 * 2
  });

  // 7. Full Executive Report Query (for modal and CSV export)
  const {
    data: reportData,
    isLoading: loadingReport,
    refetch: refetchReport
  } = useQuery({
    queryKey: ['analytics', 'report', activeSiteId, dateRange, customStart, customEnd],
    queryFn: () => analyticsService.getReport(activeSiteId, queryOptions),
    enabled: Boolean(activeSiteId),
    staleTime: 1000 * 60 * 2
  });

  const handleRefreshAll = () => {
    refetchOverview();
    refetchBacklinks();
    refetchCampaigns();
    refetchProspects();
    refetchOutreach();
    refetchInsights();
    refetchReport();
    addToast('Analytics refreshed from database.', 'info');
  };

  const handleExportCsv = () => {
    if (reportData) {
      downloadAnalyticsCsv(reportData);
      addToast('Exported analytics CSV report.', 'success');
    } else {
      // Trigger server endpoint directly
      const url = analyticsService.getCsvExportUrl(activeSiteId, queryOptions);
      window.open(url, '_blank');
      addToast('Downloading CSV report from server...', 'info');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Sticky Header with Date Filters & Action Buttons */}
      <AnalyticsHeader
        dateRange={dateRange}
        setDateRange={setDateRange}
        customStart={customStart}
        setCustomStart={setCustomStart}
        customEnd={customEnd}
        setCustomEnd={setCustomEnd}
        onRefresh={handleRefreshAll}
        isRefreshing={fetchingOverview}
        onOpenReport={() => setReportModalOpen(true)}
        onExportCsv={handleExportCsv}
      />

      <div className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  active
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Display */}
        {loadingOverview && !overviewData ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-2" />
            <div className="text-xs">Computing real-time analytics...</div>
          </div>
        ) : overviewError ? (
          <div className="p-6 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{overviewError.message || 'Failed to load analytics.'}</span>
          </div>
        ) : (
          <div>
            {activeTab === 'overview' && (
              <div className="space-y-8">
                <AnalyticsOverviewTab overviewData={overviewData} onSelectTab={setActiveTab} />
                <div className="pt-4 border-t border-slate-800">
                  <SeoInsightsSection insightsData={insightsData} />
                </div>
              </div>
            )}

            {activeTab === 'backlinks' && (
              <BacklinkAnalyticsTab backlinkData={backlinkData} />
            )}

            {activeTab === 'campaigns' && (
              <CampaignAnalyticsTab campaignData={campaignData} />
            )}

            {activeTab === 'prospects' && (
              <ProspectAnalyticsTab prospectData={prospectData} />
            )}

            {activeTab === 'outreach' && (
              <OutreachAnalyticsTab outreachData={outreachData} />
            )}

            {activeTab === 'insights' && (
              <SeoInsightsSection insightsData={insightsData} />
            )}
          </div>
        )}
      </div>

      {/* Executive Report Modal */}
      <ExecutiveReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        reportData={reportData}
      />
    </div>
  );
};

export default AnalyticsPage;
