import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldAlert,
  Shield,
  Activity,
  RefreshCw,
  Globe,
  Plus,
  AlertCircle,
  Bell,
  Clock,
  Sparkles,
  ListFilter,
  History
} from 'lucide-react';
import { useWebsite } from '../context/WebsiteContext';
import { useToast } from '../context/ToastContext';
import { monitoringApi } from '../api/monitoringService';
import { MonitoringSummaryCards } from '../components/monitoring/MonitoringSummaryCards';
import { MonitoringControls } from '../components/monitoring/MonitoringControls';
import { MonitoringEventsList } from '../components/monitoring/MonitoringEventsList';
import { MonitoringScanHistoryTable } from '../components/monitoring/MonitoringScanHistoryTable';

export const BacklinkMonitoringPage = () => {
  const queryClient = useQueryClient();
  const { activeWebsite, websites, loading: websitesLoading } = useWebsite();
  const { addToast } = useToast();
  const siteId = activeWebsite?._id;

  const [activeTab, setActiveTab] = useState('events'); // 'events' | 'history'

  // Events query filters
  const [eventsFilter, setEventsFilter] = useState('all');
  const [eventsPage, setEventsPage] = useState(1);

  // Scan History query filters
  const [scansPage, setScansPage] = useState(1);

  // Action states
  const [scanning, setScanning] = useState(false);
  const [updatingSettings, setUpdatingSettings] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  const cooldownTimerRef = useRef(null);

  // 1. Monitoring Summary Query
  const {
    data: summaryData,
    isLoading: loadingSummary,
    isFetching: isFetchingSummary
  } = useQuery({
    queryKey: ['monitoring-summary', siteId],
    queryFn: async () => {
      if (!siteId) return null;
      return await monitoringApi.getSummary(siteId);
    },
    enabled: !!siteId,
    staleTime: 2 * 60 * 1000
  });
  const summary = summaryData || null;

  // 2. Monitoring Events Query
  const {
    data: eventsData,
    isLoading: eventsLoading,
    isFetching: isFetchingEvents
  } = useQuery({
    queryKey: ['monitoring-events', siteId, { page: eventsPage, filter: eventsFilter }],
    queryFn: async () => {
      if (!siteId) return { events: [], unreadCount: 0, pagination: null };
      return await monitoringApi.getEvents(siteId, {
        page: eventsPage,
        limit: 15,
        eventType: eventsFilter
      });
    },
    enabled: !!siteId,
    placeholderData: (prev) => prev,
    staleTime: 60 * 1000
  });
  const events = eventsData?.events || [];
  const eventsPagination = eventsData?.pagination || null;
  const unreadCount = eventsData?.unreadCount ?? (summary?.stats?.unreadCount || 0);

  // 3. Monitoring Scans Query
  const {
    data: scansData,
    isLoading: scansLoading,
    isFetching: isFetchingScans
  } = useQuery({
    queryKey: ['monitoring-scans', siteId, { page: scansPage }],
    queryFn: async () => {
      if (!siteId) return { scans: [], pagination: null };
      return await monitoringApi.getScanHistory(siteId, {
        page: scansPage,
        limit: 10
      });
    },
    enabled: !!siteId,
    placeholderData: (prev) => prev,
    staleTime: 2 * 60 * 1000
  });
  const scans = scansData?.scans || [];
  const scansPagination = scansData?.pagination || null;

  // Cooldown countdown timer interval
  useEffect(() => {
    if (cooldownRemaining > 0) {
      cooldownTimerRef.current = setInterval(() => {
        setCooldownRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(cooldownTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, [cooldownRemaining]);

  // Handle manual scan trigger
  const handleTriggerScan = async () => {
    if (!siteId || scanning || cooldownRemaining > 0) return;
    setScanning(true);
    try {
      const result = await monitoringApi.triggerScan(siteId);
      addToast(
        result.summary?.isBaseline
          ? `Baseline scan completed! ${result.summary.backlinksChecked} backlinks mapped.`
          : `Scan completed: +${result.summary?.newBacklinksCount || 0} new, -${
              result.summary?.lostBacklinksCount || 0
            } lost, ~${result.summary?.changedBacklinksCount || 0} modified.`,
        'success'
      );
      // Start 60s cooldown timer
      setCooldownRemaining(60);
      // Refresh summary, events and scans via cache invalidation
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['monitoring-summary', siteId] }),
        queryClient.invalidateQueries({ queryKey: ['monitoring-events', siteId] }),
        queryClient.invalidateQueries({ queryKey: ['monitoring-scans', siteId] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard', siteId] })
      ]);
    } catch (err) {
      if (err.code === 'SCAN_COOLDOWN') {
        const remaining = err.remainingSeconds || 60;
        setCooldownRemaining(remaining);
        addToast(err.message, 'warning');
      } else {
        addToast(err.message || 'Scan failed to execute', 'error');
      }
    } finally {
      setScanning(false);
    }
  };

  // Handle settings update
  const handleUpdateSettings = async (partialSettings) => {
    if (!siteId) return;
    setUpdatingSettings(true);
    try {
      await monitoringApi.updateSettings(siteId, partialSettings);
      await queryClient.invalidateQueries({ queryKey: ['monitoring-summary', siteId] });
      addToast('Monitoring settings updated successfully.', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to update settings', 'error');
    } finally {
      setUpdatingSettings(false);
    }
  };

  // Mark single event read
  const handleMarkEventRead = async (eventId) => {
    try {
      await monitoringApi.markEventRead(eventId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['monitoring-events', siteId] }),
        queryClient.invalidateQueries({ queryKey: ['monitoring-summary', siteId] })
      ]);
    } catch (err) {
      addToast('Failed to update event', 'error');
    }
  };

  // Mark all events read
  const handleMarkAllEventsRead = async () => {
    if (!siteId) return;
    try {
      await monitoringApi.markAllEventsRead(siteId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['monitoring-events', siteId] }),
        queryClient.invalidateQueries({ queryKey: ['monitoring-summary', siteId] })
      ]);
      addToast('All events marked as read.', 'success');
    } catch (err) {
      addToast('Failed to mark all events as read', 'error');
    }
  };

  // Change filter
  const handleFilterChange = (newFilter) => {
    setEventsFilter(newFilter);
    setEventsPage(1);
  };

  // Render Empty State if no websites registered
  if (!websitesLoading && (!websites || websites.length === 0)) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <div className="p-12 rounded-3xl bg-[#15191E] border border-white/[0.08] text-center max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-text-primary">
            No Websites Available for Monitoring
          </h2>
          <p className="text-xs text-text-muted leading-relaxed">
            Register your domain in Linkora to enable automated periodic backlink scanning, baseline
            change detection, and instant alerts for new and lost links.
          </p>
          <div className="pt-2">
            <Link
              to="/websites"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold text-xs transition-all shadow-lg shadow-emerald-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Add Your First Website</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold tracking-wide uppercase mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Linkora Surveillance Engine • Phase 8</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <span>Backlink Monitoring & Alerts</span>
            {activeWebsite && (
              <span className="text-sm font-normal text-text-muted bg-white/[0.04] px-3 py-1 rounded-xl border border-white/[0.08] font-mono">
                {activeWebsite.domain}
              </span>
            )}
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Automated crawler detecting new backlinks, dropped links, anchor text changes, and
            real-time alerts.
          </p>
        </div>

        {/* Top actions & Provider Indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-text-muted">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Provider:</span>
            <span className="font-semibold text-text-primary uppercase">Moz API</span>
          </div>

          <button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['monitoring-summary', siteId] });
              queryClient.invalidateQueries({ queryKey: ['monitoring-events', siteId] });
              queryClient.invalidateQueries({ queryKey: ['monitoring-scans', siteId] });
            }}
            disabled={loadingSummary || eventsLoading || scansLoading}
            className="p-2 rounded-xl bg-[#15191E] border border-white/[0.08] hover:border-white/[0.16] text-text-muted hover:text-text-primary transition-colors"
            title="Refresh Monitoring Data"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                loadingSummary || eventsLoading || scansLoading ? 'animate-spin text-emerald-400' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* 1. Monitoring Summary Cards */}
      <MonitoringSummaryCards
        summary={summary}
        loading={loadingSummary}
        onTriggerScan={handleTriggerScan}
        scanInProgress={scanning}
      />

      {/* 2. Monitoring Controls Bar */}
      <MonitoringControls
        settings={summary?.settings}
        onUpdateSettings={handleUpdateSettings}
        onTriggerScan={handleTriggerScan}
        scanning={scanning}
        cooldownRemaining={cooldownRemaining}
        updating={updatingSettings}
      />

      {/* 3. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-1">
        <button
          onClick={() => setActiveTab('events')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'events'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'text-text-muted hover:text-text-secondary hover:bg-white/[0.02]'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Events & Alerts</span>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-mono">
              {unreadCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'history'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'text-text-muted hover:text-text-secondary hover:bg-white/[0.02]'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Scan Audit Trail</span>
          {summary?.stats?.totalScans > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/[0.05] text-text-muted font-mono">
              {summary.stats.totalScans}
            </span>
          )}
        </button>
      </div>

      {/* 4. Tab Content */}
      {activeTab === 'events' ? (
        <MonitoringEventsList
          events={events}
          unreadCount={unreadCount}
          loading={eventsLoading}
          onMarkRead={handleMarkEventRead}
          onMarkAllRead={handleMarkAllEventsRead}
          activeFilter={eventsFilter}
          onFilterChange={handleFilterChange}
          pagination={eventsPagination}
          onPageChange={(page) => setEventsPage(page)}
        />
      ) : (
        <MonitoringScanHistoryTable
          scans={scans}
          loading={scansLoading}
          pagination={scansPagination}
          onPageChange={(page) => setScansPage(page)}
        />
      )}
    </div>
  );
};

export default BacklinkMonitoringPage;
