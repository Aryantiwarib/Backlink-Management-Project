import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiService } from '../api/apiService';
import { useToast } from './ToastContext';
import { exportDashboardCsv } from '../utils/exportCsv';

const DashboardContext = createContext(null);

export const DashboardProvider = ({ children }) => {
  const { addToast } = useToast();

  // Filter & Layout States
  const [selectedWebsite, setSelectedWebsite] = useState('growthlabs.io');
  const [dateRange, setDateRange] = useState('30d');
  const [chartRange, setChartRange] = useState('30D');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [newCampaignModalOpen, setNewCampaignModalOpen] = useState(false);
  const [selectedAlertModal, setSelectedAlertModal] = useState(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Data States
  const [overview, setOverview] = useState(null);
  const [growthData, setGrowthData] = useState([]);
  const [recentBacklinks, setRecentBacklinks] = useState([]);
  const [activities, setActivities] = useState([]);
  const [contentOverview, setContentOverview] = useState(null);
  const [alerts, setAlerts] = useState([]);

  // Loading & Error States
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingGrowth, setLoadingGrowth] = useState(true);
  const [loadingBacklinks, setLoadingBacklinks] = useState(true);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [loadingContent, setLoadingContent] = useState(true);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [backendError, setBackendError] = useState(null);

  // Fallback default dataset if backend is loading or unreachable
  const loadFallbackData = useCallback(() => {
    setOverview({
      totalBacklinks: 24856,
      referringDomains: 8492,
      newBacklinks: 1284,
      lostBacklinks: 186,
      metrics: {
        totalBacklinksChange: 12.8,
        referringDomainsChange: 6.4,
        newBacklinksChange: 18.2,
        lostBacklinksChange: -4.6
      },
      sparklines: {
        totalBacklinks: [21500, 22100, 22800, 23400, 24100, 24500, 24856],
        referringDomains: [7900, 8050, 8180, 8290, 8360, 8420, 8492],
        newBacklinks: [950, 1020, 1110, 1080, 1190, 1240, 1284],
        lostBacklinks: [230, 215, 205, 198, 192, 190, 186]
      },
      linkAttributes: [
        { name: 'Dofollow', value: 68, count: 16902, color: '#10B981' },
        { name: 'Nofollow', value: 24, count: 5965, color: '#3B82F6' },
        { name: 'Sponsored', value: 5, count: 1243, color: '#F59E0B' },
        { name: 'UGC', value: 3, count: 746, color: '#8B5CF6' }
      ]
    });

    setGrowthData([
      { date: 'Oct 22', newBacklinks: 38, lostBacklinks: 6, netGrowth: 32 },
      { date: 'Oct 25', newBacklinks: 45, lostBacklinks: 8, netGrowth: 37 },
      { date: 'Oct 28', newBacklinks: 52, lostBacklinks: 5, netGrowth: 47 },
      { date: 'Oct 31', newBacklinks: 41, lostBacklinks: 7, netGrowth: 34 },
      { date: 'Nov 03', newBacklinks: 58, lostBacklinks: 9, netGrowth: 49 },
      { date: 'Nov 06', newBacklinks: 64, lostBacklinks: 6, netGrowth: 58 },
      { date: 'Nov 09', newBacklinks: 49, lostBacklinks: 7, netGrowth: 42 },
      { date: 'Nov 12', newBacklinks: 71, lostBacklinks: 5, netGrowth: 66 },
      { date: 'Nov 15', newBacklinks: 65, lostBacklinks: 8, netGrowth: 57 },
      { date: 'Nov 18', newBacklinks: 59, lostBacklinks: 4, netGrowth: 55 },
      { date: 'Nov 20', newBacklinks: 63, lostBacklinks: 6, netGrowth: 57 }
    ]);

    setRecentBacklinks([
      { id: '1', domain: 'techcrunch.com', sourcePath: '/startup-funding-roundup', anchorText: 'Explore the platform', domainRating: 91, trafficFormatted: '248K', status: 'Active', acquiredDate: '2 hours ago' },
      { id: '2', domain: 'designrush.com', sourcePath: '/top-saas-tools', anchorText: 'Linkora SEO tools', domainRating: 78, trafficFormatted: '96K', status: 'Active', acquiredDate: '5 hours ago' },
      { id: '3', domain: 'growthhackers.com', sourcePath: '/marketing-resources', anchorText: 'Learn more', domainRating: 74, trafficFormatted: '63K', status: 'New', acquiredDate: '1 day ago' },
      { id: '4', domain: 'dev.to', sourcePath: '/seo-automation-guide', anchorText: 'Backlink management platform', domainRating: 82, trafficFormatted: '1.2M', status: 'Active', acquiredDate: '2 days ago' },
      { id: '5', domain: 'startup.info', sourcePath: '/business-growth', anchorText: 'Linkora', domainRating: 65, trafficFormatted: '42K', status: 'Active', acquiredDate: '3 days ago' }
    ]);

    setActivities([
      { id: 'act-1', type: 'backlink_discovered', iconType: 'Link2', title: 'New high-authority backlink discovered', description: 'techcrunch.com linked to your homepage with DR 91 (Dofollow)', timestamp: '12 minutes ago', severity: 'success' },
      { id: 'act-2', type: 'content_published', iconType: 'FileCheck', title: 'Article published live', description: '"Complete Guide to Backlink Audits in 2026" published on growthlabs.io/blog', timestamp: '45 minutes ago', severity: 'info' },
      { id: 'act-3', type: 'backlink_lost', iconType: 'Link2Off', title: 'Backlink status changed: Lost', description: 'forbes.com/innovation-trends anchor link was removed or redirected (404)', timestamp: '3 hours ago', severity: 'warning' },
      { id: 'act-4', type: 'verification_completed', iconType: 'CheckCircle2', title: 'Automated verification cycle completed', description: 'Indexed and verified 1,420 backlinks. 99.1% uptime rate confirmed.', timestamp: '6 hours ago', severity: 'success' },
      { id: 'act-5', type: 'campaign_created', iconType: 'Rocket', title: 'Campaign created: Q4 SaaS Authority', description: 'Target: 50 guest posts, 25 broken links across SaaS and B2B directories', timestamp: 'Yesterday at 4:30 PM', severity: 'info' }
    ]);

    setContentOverview({
      planned: 12,
      inProgress: 8,
      inReview: 5,
      published: 34,
      monthlyGoal: { published: 18, target: 30, percentage: 60 }
    });

    setAlerts([
      { id: 'alert-001', title: '12 backlinks have been lost recently.', description: 'High-DR domains changed page structure in the last 72 hours.', severity: 'warning', category: 'backlinks', actionLabel: 'Review Links', targetRoute: '/backlinks' },
      { id: 'alert-002', title: '3 articles are waiting for review.', description: 'SEO content drafts await editor approval.', severity: 'info', category: 'content', actionLabel: 'Review Content', targetRoute: '/content-planner' },
      { id: 'alert-003', title: '2 publishing tasks failed.', description: 'Automated webhook to CMS timed out.', severity: 'error', category: 'system', actionLabel: 'View Errors', targetRoute: '/settings' }
    ]);
  }, []);

  // Fetch Overview Data
  const loadOverview = useCallback(async () => {
    setLoadingOverview(true);
    try {
      const res = await apiService.getOverview(selectedWebsite, dateRange);
      if (res && res.data) {
        setOverview(res.data);
        setBackendError(null);
      }
    } catch (err) {
      console.warn('Backend unavailable, using initial state:', err.message);
      setBackendError('Backend offline. Demo mode enabled.');
      loadFallbackData();
    } finally {
      setLoadingOverview(false);
    }
  }, [selectedWebsite, dateRange, loadFallbackData]);

  // Fetch Growth Chart Data
  const loadGrowth = useCallback(async () => {
    setLoadingGrowth(true);
    try {
      const res = await apiService.getBacklinkGrowth(chartRange);
      if (res && res.data) {
        setGrowthData(res.data);
      }
    } catch (err) {
      console.warn('Failed to load growth chart data:', err.message);
    } finally {
      setLoadingGrowth(false);
    }
  }, [chartRange]);

  // Fetch Backlinks Table Data
  const loadBacklinks = useCallback(async () => {
    setLoadingBacklinks(true);
    try {
      const res = await apiService.getRecentBacklinks();
      if (res && res.data) {
        setRecentBacklinks(res.data);
      }
    } catch (err) {
      console.warn('Failed to load backlinks:', err.message);
    } finally {
      setLoadingBacklinks(false);
    }
  }, []);

  // Fetch Activity Timeline
  const loadActivities = useCallback(async () => {
    setLoadingActivities(true);
    try {
      const res = await apiService.getRecentActivity();
      if (res && res.data) {
        setActivities(res.data);
      }
    } catch (err) {
      console.warn('Failed to load activities:', err.message);
    } finally {
      setLoadingActivities(false);
    }
  }, []);

  // Fetch Content Overview
  const loadContent = useCallback(async () => {
    setLoadingContent(true);
    try {
      const res = await apiService.getContentOverview();
      if (res && res.data) {
        setContentOverview(res.data);
      }
    } catch (err) {
      console.warn('Failed to load content overview:', err.message);
    } finally {
      setLoadingContent(false);
    }
  }, []);

  // Fetch Alerts
  const loadAlerts = useCallback(async () => {
    setLoadingAlerts(true);
    try {
      const res = await apiService.getAlerts();
      if (res && res.data) {
        setAlerts(res.data);
      }
    } catch (err) {
      console.warn('Failed to load alerts:', err.message);
    } finally {
      setLoadingAlerts(false);
    }
  }, []);

  // Initial Data Fetch
  useEffect(() => {
    loadOverview();
    loadBacklinks();
    loadActivities();
    loadContent();
    loadAlerts();
  }, [loadOverview, loadBacklinks, loadActivities, loadContent, loadAlerts]);

  // Chart range change
  useEffect(() => {
    loadGrowth();
  }, [loadGrowth]);

  // Keyboard shortcut listener (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchModalOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle Create Campaign
  const handleCreateCampaign = async (campaignData) => {
    try {
      const res = await apiService.createCampaign(campaignData);
      addToast(`Campaign "${campaignData.name}" created successfully!`, 'success');
      setNewCampaignModalOpen(false);
      // Refresh activities to show the newly added event
      loadActivities();
      return { success: true, data: res?.data };
    } catch (err) {
      // Optimistic addition if backend failed
      const newAct = {
        id: `act-${Date.now()}`,
        type: 'campaign_created',
        iconType: 'Rocket',
        title: `Campaign created: ${campaignData.name}`,
        description: `Targeting ${campaignData.targetWebsite} with ${campaignData.campaignType} strategy`,
        timestamp: 'Just now',
        severity: 'info',
        link: '/link-acquisition'
      };
      setActivities(prev => [newAct, ...prev]);
      addToast(`Campaign "${campaignData.name}" launched (Demo Mode)`, 'success');
      setNewCampaignModalOpen(false);
      return { success: true };
    }
  };

  // Handle Export CSV
  const handleExportReport = () => {
    const result = exportDashboardCsv({
      website: selectedWebsite,
      range: dateRange,
      overview,
      backlinks: recentBacklinks
    });
    if (result.success) {
      addToast(`Report downloaded: ${result.filename}`, 'success');
    } else {
      addToast('Failed to generate report', 'error');
    }
  };

  return (
    <DashboardContext.Provider
      value={{
        selectedWebsite,
        setSelectedWebsite,
        dateRange,
        setDateRange,
        chartRange,
        setChartRange,
        sidebarCollapsed,
        setSidebarCollapsed,
        mobileSidebarOpen,
        setMobileSidebarOpen,
        searchModalOpen,
        setSearchModalOpen,
        newCampaignModalOpen,
        setNewCampaignModalOpen,
        openNewCampaignModal: () => setNewCampaignModalOpen(true),
        selectedAlertModal,
        setSelectedAlertModal,
        notificationsOpen,
        setNotificationsOpen,
        overview,
        growthData,
        recentBacklinks,
        activities,
        contentOverview,
        alerts,
        loadingOverview,
        loadingGrowth,
        loadingBacklinks,
        loadingActivities,
        loadingContent,
        loadingAlerts,
        backendError,
        handleCreateCampaign,
        handleExportReport,
        refreshAll: () => {
          loadOverview();
          loadGrowth();
          loadBacklinks();
          loadActivities();
          loadContent();
          loadAlerts();
        }
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};
