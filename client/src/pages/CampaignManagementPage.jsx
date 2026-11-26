import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '../config/queryClient';
import {
  Rocket,
  Plus,
  Search,
  Filter,
  LayoutGrid,
  List,
  Sparkles,
  RefreshCw,
  FolderPlus,
  AlertCircle,
  Globe
} from 'lucide-react';
import { useWebsite } from '../context/WebsiteContext';
import { useToast } from '../context/ToastContext';
import { campaignApi } from '../api/campaignService';
import { CampaignDashboardCards } from '../components/campaigns/CampaignDashboardCards';
import { CampaignCard } from '../components/campaigns/CampaignCard';
import { CampaignTable } from '../components/campaigns/CampaignTable';
import { CreateCampaignModal } from '../components/campaigns/CreateCampaignModal';
import { EditCampaignModal } from '../components/campaigns/EditCampaignModal';

const CAMPAIGN_TYPES = [
  'All Strategies',
  'General Link Building',
  'Guest Posting',
  'Competitor Link Acquisition',
  'Resource Page Outreach',
  'Broken Link Building',
  'Directory Submission',
  'Digital PR'
];

export const CampaignManagementPage = () => {
  const navigate = useNavigate();
  const { activeWebsite } = useWebsite();
  const { addToast } = useToast();
  const siteId = activeWebsite?._id || activeWebsite?.id;

  // Filters & Controls
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('All Strategies');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);

  // React Query: Load High-Level Stats (cached across navigations)
  const {
    data: stats,
    isLoading: statsLoading
  } = useQuery({
    queryKey: ['campaign-stats', siteId],
    queryFn: () => campaignApi.getCampaignStats(siteId),
    enabled: Boolean(siteId),
    staleTime: 1000 * 60 * 2
  });

  const queryParams = useMemo(() => ({
    page,
    limit: 12,
    search: submittedSearch.trim() || undefined,
    status: statusFilter,
    campaignType: typeFilter !== 'All Strategies' ? typeFilter : undefined,
    sortBy: 'updatedAt',
    sortOrder: 'desc'
  }), [page, submittedSearch, statusFilter, typeFilter]);

  // React Query: Load Campaigns List (cached across navigations)
  const {
    data: campaignsRes,
    isLoading: campaignsLoading,
    isFetching
  } = useQuery({
    queryKey: ['campaigns', siteId, queryParams],
    queryFn: () => campaignApi.getCampaigns(siteId, queryParams),
    enabled: Boolean(siteId),
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 60 * 2
  });

  const campaigns = campaignsRes?.campaigns || [];
  const pagination = campaignsRes?.pagination || { page: 1, limit: 12, total: 0, totalPages: 1 };
  const loading = campaignsLoading && campaigns.length === 0;

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSubmittedSearch(search);
    setPage(1);
  };

  const invalidateCampaignData = () => {
    queryClient.invalidateQueries({ queryKey: ['campaigns', siteId] });
    queryClient.invalidateQueries({ queryKey: ['campaign-stats', siteId] });
    queryClient.invalidateQueries({ queryKey: ['dashboard', siteId] });
  };

  // Create Campaign
  const handleCreate = async (formData) => {
    try {
      const created = await campaignApi.createCampaign(siteId, formData);
      addToast(`Campaign "${created.name}" created! Discovering prospects...`, 'success');
      setCreateModalOpen(false);
      invalidateCampaignData();
      const campId = created._id || created.id;
      if (campId) {
        navigate(`/campaigns/${campId}`);
      }
    } catch (err) {
      const errorMsg = err?.message || 'Failed to create campaign';
      console.error('[CampaignManagement] createCampaign error:', errorMsg);
      addToast(errorMsg, 'error');
      throw err;
    }
  };

  // Update Campaign
  const handleUpdate = async (arg1, arg2) => {
    let campaignId;
    let formData;
    if (typeof arg1 === 'string') {
      campaignId = arg1;
      formData = arg2;
    } else {
      formData = arg1;
      campaignId = arg2 || editingCampaign?._id || editingCampaign?.id;
    }
    if (!campaignId) return;
    try {
      const updated = await campaignApi.updateCampaign(
        siteId,
        campaignId,
        formData
      );
      addToast(`Campaign "${updated.name}" updated`, 'success');
      setEditingCampaign(null);
      invalidateCampaignData();
      queryClient.invalidateQueries({ queryKey: ['campaign', siteId, campaignId] });
    } catch (err) {
      const errorMsg = err?.message || 'Failed to update campaign';
      console.error('[CampaignManagement] updateCampaign error:', errorMsg);
      addToast(errorMsg, 'error');
      throw err;
    }
  };

  // Status Change (pause, resume, archive)
  const handleStatusChange = async (campaignId, newStatus) => {
    try {
      await campaignApi.updateCampaignStatus(siteId, campaignId, newStatus);
      addToast(`Campaign status updated to ${newStatus}`, 'success');
      invalidateCampaignData();
      queryClient.invalidateQueries({ queryKey: ['campaign', siteId, campaignId] });
    } catch (err) {
      addToast(err?.message || 'Failed to update campaign status', 'error');
    }
  };

  // Delete Campaign
  const handleDelete = async (campaignId) => {
    if (!window.confirm('Are you sure you want to delete this campaign? All prospect assignments will be released.')) {
      return;
    }
    try {
      await campaignApi.deleteCampaign(siteId, campaignId);
      addToast('Campaign deleted successfully', 'success');
      invalidateCampaignData();
      queryClient.removeQueries({ queryKey: ['campaign', siteId, campaignId] });
    } catch (err) {
      addToast(err?.message || 'Failed to delete campaign', 'error');
    }
  };

  if (!activeWebsite) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-6 bg-[#0D1117]">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4 text-text-muted">
          <Globe className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-text-primary">No Active Website Selected</h3>
        <p className="text-sm text-text-muted max-w-md mt-2">
          Select or add a verified website from the header dropdown to view and manage your link-building campaigns.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-[#15191E] border border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Rocket className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-text-primary">Campaign Management</h1>
          </div>
          <p className="text-sm text-text-muted mt-1">
            Organize outreach campaigns for <span className="font-semibold text-text-secondary">{activeWebsite.domain}</span>, assign prospects from your discovery pipeline, and track backlink acquisition goals.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              loadStats();
              loadCampaigns(pagination.page);
            }}
            disabled={loading || statsLoading}
            className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary hover:text-white border border-white/[0.08] transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading || statsLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-sm transition-all shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>New Campaign</span>
          </button>
        </div>
      </div>

      {/* KPI Dashboard Cards */}
      <CampaignDashboardCards stats={stats} loading={statsLoading} />

      {/* Filter and Control Bar */}
      <div className="p-4 rounded-2xl bg-[#15191E] border border-white/[0.08] flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search campaigns by name or objective..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-emerald-500/50"
          />
        </form>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-black/40 border border-white/[0.08] overflow-x-auto">
            {['all', 'active', 'draft', 'paused', 'completed', 'archived'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${
                  statusFilter === status
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Campaign Strategy Type */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-text-secondary focus:outline-none focus:border-emerald-500/50"
          >
            {CAMPAIGN_TYPES.map((t) => (
              <option key={t} value={t} className="bg-[#15191E] text-text-primary">
                {t}
              </option>
            ))}
          </select>

          {/* View Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-black/40 border border-white/[0.08]">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'cards'
                  ? 'bg-white/[0.1] text-emerald-400'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
              title="Cards View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'table'
                  ? 'bg-white/[0.1] text-emerald-400'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Campaign List Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-8 bg-[#15191E] rounded-3xl border border-white/[0.08]">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
          <p className="text-sm text-text-muted">Loading campaigns...</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[360px] text-center p-8 bg-[#15191E] rounded-3xl border border-white/[0.08]">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 text-emerald-400">
            <Rocket className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-text-primary">
            {search || statusFilter !== 'all' || typeFilter !== 'All Strategies'
              ? 'No Campaigns Match Your Filters'
              : 'No Outreach Campaigns Created Yet'}
          </h3>
          <p className="text-sm text-text-muted max-w-md mt-1 mb-6">
            {search || statusFilter !== 'all' || typeFilter !== 'All Strategies'
              ? 'Try adjusting your search terms or filter criteria to see your campaigns.'
              : 'Create targeted campaigns to organize prospects, execute outreach workflows, and hit your backlink acquisition targets.'}
          </p>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-sm transition-all shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create Your First Campaign</span>
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((camp) => (
            <CampaignCard
              key={camp._id}
              campaign={camp}
              onEdit={setEditingCampaign}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <CampaignTable
          campaigns={campaigns}
          loading={loading}
          onEdit={setEditingCampaign}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      )}

      {/* Pagination Bar */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-[#15191E] border border-white/[0.08] text-xs text-text-muted">
          <div>
            Showing <span className="font-semibold text-text-primary">{campaigns.length}</span> of{' '}
            <span className="font-semibold text-text-primary">{pagination.total}</span> campaigns
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pagination.page <= 1}
              className="px-3 py-1.5 rounded-lg bg-black/40 hover:bg-white/[0.05] disabled:opacity-40 disabled:hover:bg-black/40 text-text-secondary border border-white/[0.08] transition-colors"
            >
              Previous
            </button>
            <span className="px-2">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1.5 rounded-lg bg-black/40 hover:bg-white/[0.05] disabled:opacity-40 disabled:hover:bg-black/40 text-text-secondary border border-white/[0.08] transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateCampaignModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={handleCreate}
      />

      <EditCampaignModal
        campaign={editingCampaign}
        isOpen={Boolean(editingCampaign)}
        onClose={() => setEditingCampaign(null)}
        onUpdate={handleUpdate}
      />
    </div>
  );
};

export default CampaignManagementPage;
