import React, { createContext, useContext, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../api/dashboardService';
import { useWebsite } from './WebsiteContext';
import { useToast } from './ToastContext';
import { exportDashboardCsv } from '../utils/exportCsv';

const DashboardContext = createContext(null);

export const DashboardProvider = ({ children }) => {
  const { addToast } = useToast();
  const { activeWebsite } = useWebsite();

  // Layout & UI Modals
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [newCampaignModalOpen, setNewCampaignModalOpen] = useState(false);
  const [selectedAlertModal, setSelectedAlertModal] = useState(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Filters
  const [dateRange, setDateRange] = useState('30d');
  const [chartRange, setChartRange] = useState('30D');

  const activeSiteId = activeWebsite?._id || activeWebsite?.id;

  // React Query for Dashboard caching across page navigations
  const {
    data: queryResult,
    isLoading: loadingDashboard,
    isFetching,
    error: queryErrorObj,
    refetch: refetchDashboard
  } = useQuery({
    queryKey: ['dashboard', activeSiteId],
    queryFn: async () => {
      if (!activeSiteId) return null;
      return dashboardService.getDashboardData(activeSiteId);
    },
    enabled: Boolean(activeSiteId),
    staleTime: 1000 * 60 * 2, // 2 minutes stale time
    placeholderData: (previousData) => previousData
  });

  const dashboardData = queryResult && queryResult.success ? queryResult : null;
  const dashboardError = queryErrorObj?.message || null;

  // Refresh helper
  const refreshAll = () => {
    refetchDashboard();
    addToast('Dashboard data reloaded from database.', 'info');
  };

  // CSV Report Generator from real database values
  const handleExportReport = () => {
    if (!dashboardData || !dashboardData.hasData) {
      addToast('No SEO data available to export for this domain.', 'warning');
      return;
    }

    try {
      const metrics = dashboardData.metrics || {};
      const exportRows = [
        { Metric: 'Website Domain', Value: dashboardData.website?.domain || '' },
        { Metric: 'Website Name', Value: dashboardData.website?.name || '' },
        { Metric: 'Verification Status', Value: dashboardData.website?.verificationStatus || '' },
        { Metric: 'Last Updated', Value: dashboardData.lastUpdated || '' },
        { Metric: 'Total Backlinks', Value: metrics.totalBacklinks?.current ?? 'N/A' },
        { Metric: 'Referring Domains', Value: metrics.referringDomains?.current ?? 'N/A' },
        { Metric: 'Moz Domain Authority (DA)', Value: metrics.domainAuthority?.current ?? 'N/A' },
        { Metric: 'Moz Page Authority (PA)', Value: metrics.pageAuthority?.current ?? 'N/A' },
        { Metric: 'Spam Score', Value: metrics.spamScore?.current !== null ? `${metrics.spamScore?.current}%` : 'N/A' },
        { Metric: 'Total Indexed Backlinks', Value: dashboardData.linkAttributes?.total || 0 },
        { Metric: 'Dofollow Ratio', Value: `${dashboardData.linkAttributes?.dofollowRatio || 0}%` }
      ];

      exportDashboardCsv(exportRows, `linkora-${dashboardData.website?.domain}-report.csv`);
      addToast(`Exported SEO report for ${dashboardData.website?.domain}.`, 'success');
    } catch (err) {
      console.error('Export report error:', err);
      addToast('Failed to export CSV report.', 'error');
    }
  };

  // Safe selectors
  const metrics = dashboardData?.metrics || {
    totalBacklinks: { current: null, hasComparison: false, status: 'no_data' },
    referringDomains: { current: null, hasComparison: false, status: 'no_data' },
    domainAuthority: { current: null, hasComparison: false, status: 'no_data' },
    pageAuthority: { current: null, hasComparison: false, status: 'no_data' },
    spamScore: { current: null, hasComparison: false, status: 'no_data' }
  };

  const sparklines = dashboardData?.sparklines || {
    totalBacklinks: [],
    referringDomains: [],
    domainAuthority: [],
    pageAuthority: []
  };

  const chartHistory = dashboardData?.charts?.history || [];
  const hasTrend = dashboardData?.charts?.hasTrend || false;
  const linkAttributes = dashboardData?.linkAttributes?.distribution || [];
  const recentBacklinks = dashboardData?.recentBacklinks || [];
  const activities = dashboardData?.recentActivity || [];
  const alerts = dashboardData?.alerts || [];
  const hasData = dashboardData?.hasData || false;

  const value = {
    // Core dynamic database states
    dashboardData,
    hasData,
    lastUpdated: dashboardData?.lastUpdated || null,
    metrics,
    sparklines,
    chartHistory,
    hasTrend,
    linkAttributes,
    linkAttributesSummary: dashboardData?.linkAttributes || { total: 0, dofollowRatio: 0 },
    recentBacklinks,
    activities,
    alerts,
    website: dashboardData?.website || activeWebsite,

    // Loading & Error states
    loadingDashboard,
    loadingOverview: loadingDashboard,
    loadingGrowth: loadingDashboard,
    loadingBacklinks: loadingDashboard,
    loadingActivities: loadingDashboard,
    dashboardError,

    // Actions
    refreshAll,
    refreshDashboard: refetchDashboard,
    handleExportReport,

    // Modals
    sidebarCollapsed,
    setSidebarCollapsed,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    searchModalOpen,
    setSearchModalOpen,
    newCampaignModalOpen,
    setNewCampaignModalOpen,
    openNewCampaignModal: () => setNewCampaignModalOpen(true),
    closeNewCampaignModal: () => setNewCampaignModalOpen(false),
    selectedAlertModal,
    setSelectedAlertModal,
    notificationsOpen,
    setNotificationsOpen,

    // Filters
    dateRange,
    setDateRange,
    chartRange,
    setChartRange
  };

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};
