import React, { useState, useEffect, useCallback } from 'react';
import {
  Link2,
  Globe,
  RefreshCw,
  Download,
  Wrench,
  Plus,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWebsite } from '../context/WebsiteContext';
import { useToast } from '../context/ToastContext';
import { backlinkService } from '../api/backlinkService';
import { BacklinkSummaryCards } from '../components/backlinks/BacklinkSummaryCards';
import { BacklinkFilterBar } from '../components/backlinks/BacklinkFilterBar';
import { BacklinkTable } from '../components/backlinks/BacklinkTable';
import { BacklinkPagination } from '../components/backlinks/BacklinkPagination';
import { BacklinkDetailModal } from '../components/backlinks/BacklinkDetailModal';
import { BacklinkAnalysisView } from '../components/backlinks/BacklinkAnalysisView';
import { exportDashboardCsv } from '../utils/exportCsv';

export const BacklinkExplorerPage = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { activeWebsite, loading: loadingWebsites } = useWebsite();

  // Primary Query States
  const [backlinks, setBacklinks] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasPrevPage: false,
    hasNextPage: false
  });

  // Filter & Search States
  const [search, setSearch] = useState('');
  const [linkType, setLinkType] = useState('all');
  const [provider, setProvider] = useState('all');
  const [sortBy, setSortBy] = useState('fetchedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [activeTab, setActiveTab] = useState('table'); // 'table' | 'analysis'

  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [error, setError] = useState(null);

  // Detail Modal State
  const [selectedBacklink, setSelectedBacklink] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Calculate active filter count
  const activeFilterCount =
    (search ? 1 : 0) +
    (linkType !== 'all' ? 1 : 0) +
    (provider !== 'all' ? 1 : 0) +
    (sortBy !== 'fetchedAt' ? 1 : 0) +
    (sortOrder !== 'desc' ? 1 : 0);

  // Fetch Backlink Stats (Independent of pagination/filters)
  const fetchStats = useCallback(async () => {
    if (!activeWebsite?._id && !activeWebsite?.id) return;
    try {
      setLoadingStats(true);
      const siteId = activeWebsite._id || activeWebsite.id;
      const res = await backlinkService.getBacklinkStats({ websiteId: siteId });
      if (res && res.success) {
        setStats(res.data);
      }
    } catch (err) {
      console.warn('Failed to fetch backlink stats:', err);
    } finally {
      setLoadingStats(false);
    }
  }, [activeWebsite]);

  // Fetch Paginated Backlinks from MongoDB
  const fetchBacklinks = useCallback(async () => {
    if (!activeWebsite?._id && !activeWebsite?.id) {
      setBacklinks([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const siteId = activeWebsite._id || activeWebsite.id;

      const res = await backlinkService.getSavedBacklinks({
        websiteId: siteId,
        page,
        limit,
        search,
        linkType,
        provider,
        sortBy,
        sortOrder
      });

      if (res && res.success) {
        setBacklinks(res.backlinks || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } else {
        setBacklinks([]);
      }
    } catch (err) {
      console.error('Failed to load backlinks from database:', err);
      setError(err.message || 'Failed to retrieve saved backlinks.');
      setBacklinks([]);
    } finally {
      setLoading(false);
    }
  }, [activeWebsite, page, limit, search, linkType, provider, sortBy, sortOrder]);

  // Initial & Dependent Fetch Triggers
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchBacklinks();
  }, [fetchBacklinks]);

  // Reset filters handler
  const handleResetFilters = () => {
    setSearch('');
    setLinkType('all');
    setProvider('all');
    setSortBy('fetchedAt');
    setSortOrder('desc');
    setPage(1);
  };

  // Search change resets page to 1
  const handleSearchChange = (val) => {
    setSearch(val);
    setPage(1);
  };

  // Filter change resets page to 1
  const handleLinkTypeChange = (val) => {
    setLinkType(val);
    setPage(1);
  };

  const handleProviderChange = (val) => {
    setProvider(val);
    setPage(1);
  };

  const handleSortByChange = (val) => {
    setSortBy(val);
    setPage(1);
  };

  const handleSortOrderChange = (val) => {
    setSortOrder(val);
    setPage(1);
  };

  const handleLimitChange = (val) => {
    setLimit(val);
    setPage(1);
  };

  // Row selection handler
  const handleSelectBacklink = (link) => {
    setSelectedBacklink(link);
    setIsDetailOpen(true);
  };

  // Export current table view as CSV
  const handleExportCsv = () => {
    if (!backlinks || backlinks.length === 0) {
      addToast('No backlinks to export.', 'warning');
      return;
    }

    try {
      const exportRows = backlinks.map((b) => ({
        'Source Domain': b.sourceDomain || '',
        'Source URL': b.sourceUrl || '',
        'Target URL': b.targetUrl || '',
        'Anchor Text': b.anchorText || '',
        'Link Type': b.linkType || 'unknown',
        'Source DA': b.sourceDomainAuthority ?? 'N/A',
        'Source PA': b.sourcePageAuthority ?? 'N/A',
        'First Seen': b.firstSeen ? new Date(b.firstSeen).toLocaleDateString() : 'N/A',
        'Last Seen': b.lastSeen ? new Date(b.lastSeen).toLocaleDateString() : 'N/A',
        'Provider': b.provider || 'moz',
        'Fetched At': b.fetchedAt ? new Date(b.fetchedAt).toLocaleDateString() : ''
      }));

      exportDashboardCsv(
        exportRows,
        `linkora-${activeWebsite?.domain || 'backlinks'}-page-${page}.csv`
      );
      addToast(`Exported ${exportRows.length} backlinks to CSV.`, 'success');
    } catch (err) {
      console.error('Export CSV error:', err);
      addToast('Failed to export backlinks to CSV.', 'error');
    }
  };

  // 1. Loading Websites State
  if (loadingWebsites) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="h-16 bg-white/[0.02] rounded-2xl border border-white/[0.04] animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 surface-card rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-96 surface-card rounded-2xl animate-pulse" />
      </div>
    );
  }

  // 2. No Website Registered State
  if (!activeWebsite) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="surface-card rounded-2xl p-10 border border-white/[0.08] text-center max-w-md mx-auto my-12 space-y-4 shadow-card">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text-primary">No Website Selected</h2>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              Please register or select a website in Website Management to explore its saved backlink records.
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
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-extrabold text-text-primary tracking-tight">
              Backlink Explorer
            </h1>
            <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {activeWebsite.domain}
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Search, filter, paginate and inspect backlink records stored in MongoDB for this domain.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <button
            onClick={fetchBacklinks}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#101318] hover:bg-white/[0.06] text-text-muted hover:text-text-primary text-xs font-semibold border border-white/[0.08] transition-all disabled:opacity-50"
            title="Reload from MongoDB"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Reload</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={backlinks.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#101318] hover:bg-white/[0.06] text-text-muted hover:text-text-primary text-xs font-semibold border border-white/[0.08] transition-all disabled:opacity-40"
            title="Export view to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={() => navigate('/seo-tools')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold transition-all shadow-glow-brand"
            title="Sync live backlink metrics from Moz API"
          >
            <Wrench className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Sync Moz Data</span>
          </button>
        </div>
      </div>

      {/* Backend Error Alert */}
      {error && (
        <div className="surface-card rounded-2xl p-4 border border-rose-500/20 flex items-center justify-between gap-3 text-xs text-rose-300">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchBacklinks}
            className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-semibold text-[11px]"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI Summary Cards */}
      <BacklinkSummaryCards stats={stats} loading={loadingStats} />

      {/* Filter and Search Bar */}
      <BacklinkFilterBar
        search={search}
        onSearchChange={handleSearchChange}
        linkType={linkType}
        onLinkTypeChange={handleLinkTypeChange}
        provider={provider}
        onProviderChange={handleProviderChange}
        sortBy={sortBy}
        onSortByChange={handleSortByChange}
        sortOrder={sortOrder}
        onSortOrderChange={handleSortOrderChange}
        onResetFilters={handleResetFilters}
        activeFilterCount={activeFilterCount}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Tab 1: Table View */}
      {activeTab === 'table' && (
        <div className="space-y-4">
          <BacklinkTable
            backlinks={backlinks}
            loading={loading}
            website={activeWebsite}
            hasActiveFilters={activeFilterCount > 0}
            onResetFilters={handleResetFilters}
            onSelectBacklink={handleSelectBacklink}
          />

          <BacklinkPagination
            pagination={pagination}
            onPageChange={setPage}
            onLimitChange={handleLimitChange}
          />
        </div>
      )}

      {/* Tab 2: Analysis View */}
      {activeTab === 'analysis' && (
        <BacklinkAnalysisView
          websiteId={activeWebsite._id || activeWebsite.id}
          domain={activeWebsite.domain}
        />
      )}

      {/* Backlink Detail Modal */}
      <BacklinkDetailModal
        backlink={selectedBacklink}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedBacklink(null);
        }}
      />
    </div>
  );
};
