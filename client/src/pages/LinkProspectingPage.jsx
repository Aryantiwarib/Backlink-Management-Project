import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '../config/queryClient';
import {
  Compass,
  Users,
  Sparkles,
  Target,
  RefreshCw,
  Plus,
  BookmarkCheck,
  CheckCircle2,
  Globe
} from 'lucide-react';
import { useWebsite } from '../context/WebsiteContext';
import { useToast } from '../context/ToastContext';
import { prospectApi } from '../api/prospectService';
import { ProspectingSummaryCards } from '../components/prospecting/ProspectingSummaryCards';
import { CompetitorDiscoveryForm } from '../components/prospecting/CompetitorDiscoveryForm';
import { KeywordDiscoveryForm } from '../components/prospecting/KeywordDiscoveryForm';
import { DiscoveredProspectsTable } from '../components/prospecting/DiscoveredProspectsTable';
import { SavedProspectsTable } from '../components/prospecting/SavedProspectsTable';
import { ProspectDetailModal } from '../components/prospecting/ProspectDetailModal';
import { ProviderSetupGuideModal } from '../components/prospecting/ProviderSetupGuideModal';
import { GenerateMailModal } from '../components/outreach/GenerateMailModal';

export const LinkProspectingPage = () => {
  const { activeWebsite, websites, loading: websitesLoading } = useWebsite();
  const { addToast } = useToast();
  const siteId = activeWebsite?._id || activeWebsite?.id;

  const [mainTab, setMainTab] = useState('discovery'); // 'discovery' | 'saved'
  const [discoverySubTab, setDiscoverySubTab] = useState('competitor'); // 'competitor' | 'keyword'

  // Discovered results
  const [discoveredCandidates, setDiscoveredCandidates] = useState([]);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);

  // Saved pipeline state
  const [savedPage, setSavedPage] = useState(1);
  const [savedFilters, setSavedFilters] = useState({
    search: '',
    status: 'all',
    source: 'all',
    sortBy: 'opportunityScore',
    sortOrder: 'desc'
  });

  // Modals state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState(null);
  const [setupGuideOpen, setSetupGuideOpen] = useState(false);
  const [mailModalOpen, setMailModalOpen] = useState(false);
  const [mailProspect, setMailProspect] = useState(null);

  // React Query: Prospect Stats (cached across navigations)
  const {
    data: stats,
    isLoading: statsLoading
  } = useQuery({
    queryKey: ['prospect-stats', siteId],
    queryFn: () => prospectApi.getStats(siteId),
    enabled: Boolean(siteId),
    staleTime: 1000 * 60 * 2
  });

  // React Query: Discovery Status
  const { data: discoveryStatus } = useQuery({
    queryKey: ['prospect-discovery-status'],
    queryFn: () => prospectApi.getDiscoveryStatus(),
    staleTime: 1000 * 60 * 5
  });

  // React Query: Saved Prospects List (cached across navigations)
  const {
    data: savedData,
    isLoading: savedLoading
  } = useQuery({
    queryKey: ['prospects', siteId, { page: savedPage, ...savedFilters }],
    queryFn: () =>
      prospectApi.getSavedProspects(siteId, {
        page: savedPage,
        limit: 12,
        ...savedFilters
      }),
    enabled: Boolean(siteId),
    placeholderData: (prev) => prev,
    staleTime: 1000 * 60 * 2
  });

  const savedProspects = savedData?.prospects || [];
  const savedPagination = savedData?.pagination || null;

  const invalidateProspectData = () => {
    queryClient.invalidateQueries({ queryKey: ['prospects', siteId] });
    queryClient.invalidateQueries({ queryKey: ['prospect-stats', siteId] });
    queryClient.invalidateQueries({ queryKey: ['campaign-assignments', siteId] });
    queryClient.invalidateQueries({ queryKey: ['campaigns', siteId] });
  };

  // Trigger competitor discovery
  const handleCompetitorDiscover = async ({ competitorDomains, limit }) => {
    if (!activeWebsite?._id) return;
    setDiscoveryLoading(true);
    try {
      const result = await prospectApi.discoverCompetitors(activeWebsite._id, {
        competitorDomains,
        limit
      });
      setDiscoveredCandidates(result.prospects || []);
      addToast(
        `Discovered ${result.totalDiscovered || 0} link opportunities from ${result.competitorsChecked} competitors.`,
        'success'
      );
    } catch (err) {
      addToast(err.message || 'Discovery crawl failed', 'error');
    } finally {
      setDiscoveryLoading(false);
    }
  };

  // Trigger keyword discovery
  const handleKeywordDiscover = async ({ keyword, limit }) => {
    if (!activeWebsite?._id) return;
    setDiscoveryLoading(true);
    try {
      const result = await prospectApi.discoverKeywords(activeWebsite._id, {
        keyword,
        limit
      });
      setDiscoveredCandidates(result.prospects || []);
      addToast(`Discovered ${result.totalDiscovered || 0} prospects matching "${keyword}".`, 'success');
    } catch (err) {
      if (err.code === 'DISCOVERY_PROVIDER_UNCONFIGURED') {
        setSetupGuideOpen(true);
      } else {
        addToast(err.message || 'Keyword discovery failed', 'error');
      }
    } finally {
      setDiscoveryLoading(false);
    }
  };

  // Save candidate
  const handleSaveProspect = async (candidate) => {
    if (!siteId) return;
    try {
      const res = await prospectApi.saveProspect(siteId, candidate);
      addToast(`Saved ${candidate.prospectDomain} to your pipeline.`, 'success');
      setDiscoveredCandidates((prev) =>
        prev.map((c) =>
          c.prospectDomain === candidate.prospectDomain
            ? { ...c, isSaved: true, savedStatus: res.prospect?.status || 'saved', savedId: res.prospect?.id }
            : c
        )
      );
      invalidateProspectData();
    } catch (err) {
      addToast(err.message || 'Failed to save prospect', 'error');
    }
  };

  // Bulk save candidates
  const handleBulkSave = async (candidatesList) => {
    if (!siteId) return;
    try {
      const res = await prospectApi.bulkSaveProspects(siteId, candidatesList);
      addToast(`Saved ${res.savedCount} new prospects to your pipeline.`, 'success');
      const savedDomains = new Set(candidatesList.map((c) => c.prospectDomain));
      setDiscoveredCandidates((prev) =>
        prev.map((c) =>
          savedDomains.has(c.prospectDomain) ? { ...c, isSaved: true, savedStatus: 'saved' } : c
        )
      );
      invalidateProspectData();
    } catch (err) {
      addToast(err.message || 'Bulk save failed', 'error');
    }
  };

  // Update status
  const handleUpdateStatus = async (prospectId, newStatus) => {
    if (!siteId) return;
    try {
      await prospectApi.updateProspect(siteId, prospectId, { status: newStatus });
      invalidateProspectData();
      addToast(`Status updated to ${newStatus}.`, 'success');
    } catch (err) {
      addToast('Failed to update status', 'error');
    }
  };

  // Delete prospect
  const handleDeleteProspect = async (prospectId) => {
    if (!siteId) return;
    try {
      await prospectApi.deleteProspect(siteId, prospectId);
      invalidateProspectData();
      addToast('Prospect removed.', 'info');
    } catch (err) {
      addToast('Failed to delete prospect', 'error');
    }
  };

  // Bulk update status
  const handleBulkUpdateStatus = async (prospectIds, newStatus) => {
    if (!siteId) return;
    try {
      await prospectApi.bulkUpdateStatus(siteId, { prospectIds, status: newStatus });
      invalidateProspectData();
      addToast(`Updated status for ${prospectIds.length} prospects.`, 'success');
    } catch (err) {
      addToast('Failed to bulk update status', 'error');
    }
  };

  // Bulk delete
  const handleBulkDelete = async (prospectIds) => {
    if (!siteId) return;
    try {
      await prospectApi.bulkDelete(siteId, prospectIds);
      invalidateProspectData();
      addToast(`Deleted ${prospectIds.length} prospects.`, 'info');
    } catch (err) {
      addToast('Failed to bulk delete prospects', 'error');
    }
  };

  // Filter change handler
  const handleFilterChange = (key, value) => {
    const nextFilters = { ...savedFilters, [key]: value };
    setSavedFilters(nextFilters);
    setSavedPage(1);
  };

  // Open detail modal
  const handleViewDetails = (prospect) => {
    setSelectedProspect(prospect);
    setDetailModalOpen(true);
  };

  const handleDraftEmail = (prospect) => {
    setMailProspect(prospect);
    setMailModalOpen(true);
  };

  // Handle modal update
  const handleModalUpdate = async (prospectId, updateData) => {
    if (!siteId) return;
    const updated = await prospectApi.updateProspect(siteId, prospectId, updateData);
    setSelectedProspect(updated);
    invalidateProspectData();
  };

  // Export CSV
  const handleExportCsv = () => {
    if (!activeWebsite?._id) return;
    const url = prospectApi.getCsvExportUrl(activeWebsite._id, {
      search: savedFilters.search,
      status: savedFilters.status,
      source: savedFilters.source
    });
    window.open(url, '_blank');
  };

  // Empty state if no websites
  if (!websitesLoading && (!websites || websites.length === 0)) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <div className="p-12 rounded-3xl bg-[#15191E] border border-white/[0.08] text-center max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <Compass className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-text-primary">
            No Website Selected for Prospecting
          </h2>
          <p className="text-xs text-text-muted leading-relaxed">
            Add your domain in Linkora to begin discovering high-authority backlink candidates from
            competitor profiles and targeted niche keywords.
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
            <Compass className="w-4 h-4" />
            <span>Link Building Intelligence • Phase 9</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <span>Link Prospecting & Discovery</span>
            {activeWebsite && (
              <span className="text-sm font-normal text-text-muted bg-white/[0.04] px-3 py-1 rounded-xl border border-white/[0.08] font-mono">
                {activeWebsite.domain}
              </span>
            )}
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Discover potential websites for backlink outreach, evaluate authority, and curate your
            link-building pipeline.
          </p>
        </div>

        {/* Top actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-text-muted">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>SEO Data:</span>
            <span className="font-semibold text-text-primary uppercase">Moz API</span>
          </div>

          <button
            onClick={() => {
              loadStats();
              loadDiscoveryStatus();
              loadSavedProspects(savedPage, savedFilters);
            }}
            disabled={statsLoading || savedLoading}
            className="p-2 rounded-xl bg-[#15191E] border border-white/[0.08] hover:border-white/[0.16] text-text-muted hover:text-text-primary transition-colors"
            title="Refresh Prospecting Data"
          >
            <RefreshCw className={`w-4 h-4 ${statsLoading || savedLoading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <ProspectingSummaryCards stats={stats} loading={statsLoading} />

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-1">
        <button
          onClick={() => setMainTab('discovery')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            mainTab === 'discovery'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'text-text-muted hover:text-text-secondary hover:bg-white/[0.02]'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Opportunity Discovery Engine</span>
          {discoveredCandidates.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-mono">
              {discoveredCandidates.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setMainTab('saved')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            mainTab === 'saved'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'text-text-muted hover:text-text-secondary hover:bg-white/[0.02]'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>Saved Prospects Pipeline</span>
          {stats?.totalSaved > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/[0.06] text-text-muted font-mono">
              {stats.totalSaved}
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Discovery Engine */}
      {mainTab === 'discovery' && (
        <div className="space-y-6">
          {/* Subtabs for Discovery methods */}
          <div className="flex items-center gap-2 bg-[#101419] p-1.5 rounded-xl border border-white/[0.06] w-fit text-xs">
            <button
              onClick={() => setDiscoverySubTab('competitor')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                discoverySubTab === 'competitor'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-semibold'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Competitor Backlink Crawl</span>
            </button>

            <button
              onClick={() => setDiscoverySubTab('keyword')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                discoverySubTab === 'keyword'
                  ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20 font-semibold'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Keyword & Niche Search</span>
            </button>
          </div>

          {/* Discovery Forms */}
          {discoverySubTab === 'competitor' ? (
            <CompetitorDiscoveryForm
              onDiscover={handleCompetitorDiscover}
              loading={discoveryLoading}
              disabled={!activeWebsite?._id}
            />
          ) : (
            <KeywordDiscoveryForm
              onDiscover={handleKeywordDiscover}
              loading={discoveryLoading}
              disabled={!activeWebsite?._id}
              keywordStatus={discoveryStatus?.keywordDiscovery}
              onOpenSetupGuide={() => setSetupGuideOpen(true)}
            />
          )}

          {/* Discovered Candidates Table */}
          <DiscoveredProspectsTable
            prospects={discoveredCandidates}
            loading={discoveryLoading}
            onSaveProspect={handleSaveProspect}
            onBulkSave={handleBulkSave}
            onViewDetails={handleViewDetails}
          />
        </div>
      )}

      {/* Tab 2: Saved Pipeline Table */}
      {mainTab === 'saved' && (
        <SavedProspectsTable
          prospects={savedProspects}
          loading={savedLoading}
          pagination={savedPagination}
          onPageChange={(page) => setSavedPage(page)}
          filters={savedFilters}
          onFilterChange={handleFilterChange}
          onUpdateStatus={handleUpdateStatus}
          onDeleteProspect={handleDeleteProspect}
          onBulkUpdateStatus={handleBulkUpdateStatus}
          onBulkDelete={handleBulkDelete}
          onExportCsv={handleExportCsv}
          onViewDetails={handleViewDetails}
          onDraftEmail={handleDraftEmail}
          websiteId={siteId}
        />
      )}

      {/* Prospect Detail Drawer / Modal */}
      <ProspectDetailModal
        prospect={selectedProspect}
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        onUpdate={handleModalUpdate}
        onDelete={handleDeleteProspect}
        onDraftEmail={handleDraftEmail}
      />

      {/* Provider Setup Guide Modal */}
      <ProviderSetupGuideModal
        isOpen={setupGuideOpen}
        onClose={() => setSetupGuideOpen(false)}
      />

      {/* Bulk / Individual Outreach Email Generator Modal */}
      {mailModalOpen && (
        <GenerateMailModal
          isOpen={mailModalOpen}
          onClose={() => {
            setMailModalOpen(false);
            setMailProspect(null);
          }}
          selectedProspects={mailProspect ? [mailProspect] : []}
          websiteId={siteId}
        />
      )}
    </div>
  );
};

export default LinkProspectingPage;
