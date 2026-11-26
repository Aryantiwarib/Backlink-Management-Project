import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  Mail,
  Send,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  Sparkles,
  RefreshCw,
  Settings,
  Layers,
  Inbox,
  Globe,
  ArrowRight
} from 'lucide-react';
import { useWebsite } from '../context/WebsiteContext';
import { useToast } from '../context/ToastContext';
import { outreachApi } from '../api/outreachService';
import { campaignApi } from '../api/campaignService';
import { ConnectedAccountCard } from '../components/outreach/ConnectedAccountCard';
import { TemplateManagerModal } from '../components/outreach/TemplateManagerModal';
import { EmailComposerModal } from '../components/outreach/EmailComposerModal';
import { OutreachQueueTable } from '../components/outreach/OutreachQueueTable';
import { FollowUpList } from '../components/outreach/FollowUpList';
import { FollowUpScheduleModal } from '../components/outreach/FollowUpScheduleModal';

export const OutreachEmailPage = () => {
  const queryClient = useQueryClient();
  const { activeWebsite } = useWebsite();
  const { addToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const siteId = activeWebsite?._id;

  // Tab State: 'queue' | 'templates' | 'followups' | 'settings'
  const [activeTab, setActiveTab] = useState('queue');

  // Selected Campaign State
  const [selectedCampaignId, setSelectedCampaignId] = useState('');

  // Modals & Filters
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [queueFilter, setQueueFilter] = useState('all');
  const [composerOpen, setComposerOpen] = useState(false);
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [selectedAssignmentForFollowUp, setSelectedAssignmentForFollowUp] = useState(null);
  const [followUpRefreshTrigger, setFollowUpRefreshTrigger] = useState(0);

  // Ref for tracking processed OAuth redirects
  const oauthHandledRef = useRef(false);

  // 1. Load Gmail Account Status
  const {
    data: accountStatus,
    isLoading: accountLoading
  } = useQuery({
    queryKey: ['outreach-account'],
    queryFn: async () => {
      return await outreachApi.getAccountStatus();
    },
    staleTime: 2 * 60 * 1000
  });

  // 2. Load Templates
  const {
    data: templatesData,
    isLoading: templatesLoading
  } = useQuery({
    queryKey: ['outreach-templates'],
    queryFn: async () => {
      const list = await outreachApi.listTemplates();
      return list || [];
    },
    staleTime: 5 * 60 * 1000
  });
  const templates = templatesData || [];

  // 3. Load Campaigns for active website
  const {
    data: campaignsData,
    isLoading: campaignsLoading
  } = useQuery({
    queryKey: ['campaigns-select', siteId],
    queryFn: async () => {
      if (!siteId) return [];
      const res = await campaignApi.getCampaigns(siteId, { limit: 100 });
      return res.campaigns || [];
    },
    enabled: !!siteId,
    staleTime: 2 * 60 * 1000
  });
  const campaigns = campaignsData || [];

  // Synchronize selectedCampaignId with available campaigns
  useEffect(() => {
    if (campaigns.length > 0 && (!selectedCampaignId || !campaigns.some((c) => c._id === selectedCampaignId))) {
      setSelectedCampaignId(campaigns[0]._id);
    }
  }, [campaigns, selectedCampaignId]);

  // 4. Load Queue for Selected Campaign
  const {
    data: queueData,
    isLoading: queueLoading
  } = useQuery({
    queryKey: ['outreach-queue', siteId, selectedCampaignId, queueFilter],
    queryFn: async () => {
      if (!siteId || !selectedCampaignId) return { emails: [] };
      return await outreachApi.getQueue(siteId, selectedCampaignId, {
        status: queueFilter !== 'all' ? queueFilter : undefined
      });
    },
    enabled: !!siteId && !!selectedCampaignId,
    staleTime: 30 * 1000
  });
  const queueEmails = queueData?.emails || [];

  // 5. Load Outreach Stats / History for Selected Campaign
  const {
    data: historyData
  } = useQuery({
    queryKey: ['outreach-history', siteId, selectedCampaignId],
    queryFn: async () => {
      if (!siteId || !selectedCampaignId) return { stats: null };
      return await outreachApi.getHistory(siteId, selectedCampaignId);
    },
    enabled: !!siteId && !!selectedCampaignId,
    staleTime: 30 * 1000
  });
  const outreachStats = historyData?.stats || null;

  // 6. Load Campaign Assigned Prospects (for composer modal)
  const {
    data: campaignProspectsData
  } = useQuery({
    queryKey: ['campaign-prospects-all', siteId, selectedCampaignId],
    queryFn: async () => {
      if (!siteId || !selectedCampaignId) return [];
      const res = await campaignApi.getCampaignProspects(siteId, selectedCampaignId, {
        limit: 100
      });
      return res.assignments || [];
    },
    enabled: !!siteId && !!selectedCampaignId,
    staleTime: 60 * 1000
  });
  const campaignProspects = campaignProspectsData || [];

  // Connect Google Handler
  const handleConnectGoogle = async () => {
    try {
      const authUrl = await outreachApi.getGoogleAuthUrl('/outreach');
      if (authUrl) {
        window.location.href = authUrl;
      }
    } catch (err) {
      addToast(err?.message || 'Failed to initiate Google authorization', 'error');
    }
  };

  // Disconnect Handler
  const handleDisconnectGoogle = async () => {
    try {
      await outreachApi.disconnectAccount();
      addToast('Gmail account disconnected', 'success');
      await queryClient.invalidateQueries({ queryKey: ['outreach-account'] });
    } catch (err) {
      addToast(err?.message || 'Failed to disconnect Gmail account', 'error');
    }
  };

  // Handle Google OAuth redirect result on mount
  useEffect(() => {
    const googleConnected = searchParams.get('google_connected') || searchParams.get('gmail_connected');
    const googleError = searchParams.get('google_error') || searchParams.get('gmail_error');

    if (!googleConnected && !googleError) return;
    if (oauthHandledRef.current) return;
    oauthHandledRef.current = true;

    if (googleConnected === 'true') {
      addToast('Gmail account connected successfully!', 'success');
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('google_connected');
      nextParams.delete('gmail_connected');
      setSearchParams(nextParams, { replace: true });
      queryClient.invalidateQueries({ queryKey: ['outreach-account'] });
    } else if (googleError) {
      addToast(`Google connection failed: ${decodeURIComponent(googleError)}`, 'error');
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('google_error');
      nextParams.delete('gmail_error');
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams, addToast, queryClient]);

  // Template Handlers
  const handleCreateTemplate = async (templateData) => {
    try {
      await outreachApi.createTemplate(templateData);
      addToast('Template created successfully', 'success');
      await queryClient.invalidateQueries({ queryKey: ['outreach-templates'] });
    } catch (err) {
      addToast(err?.message || 'Failed to create template', 'error');
      throw err;
    }
  };

  const handleUpdateTemplate = async (id, updateData) => {
    try {
      await outreachApi.updateTemplate(id, updateData);
      addToast('Template updated successfully', 'success');
      await queryClient.invalidateQueries({ queryKey: ['outreach-templates'] });
    } catch (err) {
      addToast(err?.message || 'Failed to update template', 'error');
      throw err;
    }
  };

  const handleDeleteTemplate = async (id) => {
    try {
      await outreachApi.deleteTemplate(id);
      addToast('Template deleted', 'success');
      await queryClient.invalidateQueries({ queryKey: ['outreach-templates'] });
    } catch (err) {
      addToast(err?.message || 'Failed to delete template', 'error');
      throw err;
    }
  };

  // Email Send Handler
  const handleSendEmails = async (payload) => {
    if (!siteId || !selectedCampaignId) {
      addToast('Please select a campaign first', 'error');
      return;
    }

    try {
      const res = await outreachApi.sendOutreach(siteId, selectedCampaignId, payload);
      addToast(res.message || 'Outreach queued successfully!', 'success');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['outreach-queue', siteId, selectedCampaignId] }),
        queryClient.invalidateQueries({ queryKey: ['outreach-history', siteId, selectedCampaignId] }),
        queryClient.invalidateQueries({ queryKey: ['campaign-prospects-all', siteId, selectedCampaignId] }),
        queryClient.invalidateQueries({ queryKey: ['campaign-assignments', siteId, selectedCampaignId] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard', siteId] })
      ]);
    } catch (err) {
      addToast(err?.message || 'Failed to queue outreach', 'error');
      throw err;
    }
  };

  // Preview Handler
  const handlePreviewEmails = async (payload) => {
    if (!siteId || !selectedCampaignId) {
      throw new Error('Please select a campaign first');
    }
    return outreachApi.previewOutreach(siteId, selectedCampaignId, payload);
  };

  // Current selected campaign object
  const currentCampaign = campaigns.find((c) => c._id === selectedCampaignId) || campaigns[0];

  // Open Composer for Follow-up
  const handleOpenFollowUpComposer = (followUp) => {
    setComposerOpen(true);
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">
              Outreach & Email Hub
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Phase 11
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Personalize cold outreach, automate follow-ups, and track engagement with Gmail API integration.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Manage Templates Button */}
          <button
            onClick={() => setTemplateModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary hover:text-white border border-white/[0.08] text-xs font-medium transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Templates ({templates.length})</span>
          </button>

          {/* Primary Compose Button */}
          <button
            onClick={() => setComposerOpen(true)}
            disabled={!accountStatus?.connected || campaigns.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white text-xs font-medium shadow-lg shadow-emerald-900/20 transition-all duration-200"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Compose Outreach</span>
          </button>
        </div>
      </div>

      {/* Gmail Connection Notification Banner if Disconnected */}
      {!accountLoading && !accountStatus?.connected && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <AlertCircle className="w-5 h-5 shrink-0" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-amber-300">Gmail Account Not Connected</h4>
              <p className="text-xs text-slate-300">
                Connect your Google account using OAuth 2.0 to send personalized outreach directly from your inbox.
              </p>
            </div>
          </div>
          <button
            onClick={handleConnectGoogle}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow transition-colors shrink-0"
          >
            Connect Gmail Account
          </button>
        </div>
      )}

      {/* Campaign Selector Bar */}
      {campaigns.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#15191E] border border-white/[0.08]">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-text-muted">Target Campaign:</span>
            <select
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              className="bg-black/40 border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-emerald-500 transition-colors"
            >
              {campaigns.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
          </div>

          {/* Quick Metrics Bar */}
          {outreachStats && (
            <div className="flex items-center gap-4 text-xs">
              <span className="text-slate-400">
                Queued: <strong className="text-amber-400">{outreachStats.totalPending || 0}</strong>
              </span>
              <span className="text-slate-400">
                Sent: <strong className="text-emerald-400">{outreachStats.totalSent || 0}</strong>
              </span>
              <span className="text-slate-400">
                Opened: <strong className="text-teal-400">{outreachStats.totalOpened || 0}</strong>
              </span>
              <span className="text-slate-400">
                Clicked: <strong className="text-blue-400">{outreachStats.totalClicked || 0}</strong>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3">
        <button
          onClick={() => setActiveTab('queue')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
            activeTab === 'queue'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <Inbox className="w-3.5 h-3.5" />
          <span>Sending Queue & Activity</span>
          {queueEmails.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/[0.08] text-text-secondary">
              {queueEmails.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('followups')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
            activeTab === 'followups'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Scheduled Follow-ups</span>
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
            activeTab === 'templates'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Email Templates</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/[0.08] text-text-secondary">
            {templates.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
            activeTab === 'settings'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Email Settings</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {campaigns.length === 0 ? (
            <div className="p-12 text-center bg-[#15191E] rounded-3xl border border-white/[0.08] space-y-3">
              <Mail className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-base font-semibold text-text-primary">No Active Campaigns Found</h3>
              <p className="text-xs text-text-muted max-w-sm mx-auto">
                Create a campaign and assign prospects before launching cold email outreach.
              </p>
            </div>
          ) : (
            <OutreachQueueTable
              emails={queueEmails}
              loading={queueLoading}
              statusFilter={queueFilter}
              onStatusFilterChange={setQueueFilter}
              onRefresh={() => {
                queryClient.invalidateQueries({ queryKey: ['outreach-queue', siteId, selectedCampaignId] });
                queryClient.invalidateQueries({ queryKey: ['outreach-history', siteId, selectedCampaignId] });
              }}
            />
          )}
        </div>
      )}

      {activeTab === 'followups' && (
        <div className="space-y-4">
          <FollowUpList
            websiteId={activeWebsite?._id}
            campaignId={selectedCampaignId}
            templates={templates}
            onOpenComposer={handleOpenFollowUpComposer}
            refreshTrigger={followUpRefreshTrigger}
          />
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Outreach Templates</h3>
              <p className="text-xs text-text-muted">
                Pre-built and customized email copy with dynamic placeholders.
              </p>
            </div>
            <button
              onClick={() => setTemplateModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Template</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((tpl) => (
              <div
                key={tpl._id}
                className="p-5 rounded-2xl bg-[#15191E] border border-white/[0.08] hover:border-white/[0.16] transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm text-text-primary">{tpl.name}</span>
                    <span className="text-[10px] text-text-muted font-mono">
                      {tpl.tags?.slice(0, 2).join(', ')}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-emerald-400 mb-2 truncate">
                    Subject: {tpl.subject}
                  </p>
                  <p className="text-xs text-text-muted line-clamp-4 font-mono bg-black/40 p-2.5 rounded-lg border border-white/[0.04]">
                    {tpl.body}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                  <span className="text-text-muted text-[11px]">
                    Created {new Date(tpl.createdAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => setTemplateModalOpen(true)}
                    className="text-emerald-400 hover:text-emerald-300 font-medium"
                  >
                    Edit / View
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          <ConnectedAccountCard
            accountStatus={accountStatus}
            loading={accountLoading}
            onConnect={handleConnectGoogle}
            onDisconnect={handleDisconnectGoogle}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: ['outreach-account'] })}
          />
        </div>
      )}

      {/* Template Manager Modal */}
      <TemplateManagerModal
        isOpen={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        templates={templates}
        onCreate={handleCreateTemplate}
        onUpdate={handleUpdateTemplate}
        onDelete={handleDeleteTemplate}
      />

      {/* Email Composer Modal */}
      {composerOpen && (
        <EmailComposerModal
          isOpen={composerOpen}
          onClose={() => setComposerOpen(false)}
          campaign={currentCampaign}
          prospects={campaignProspects}
          templates={templates}
          connectedAccount={accountStatus}
          onSend={handleSendEmails}
          onPreview={handlePreviewEmails}
        />
      )}

      {/* Follow-up Schedule Modal */}
      {followUpModalOpen && selectedAssignmentForFollowUp && (
        <FollowUpScheduleModal
          isOpen={followUpModalOpen}
          onClose={() => {
            setFollowUpModalOpen(false);
            setSelectedAssignmentForFollowUp(null);
          }}
          websiteId={activeWebsite?._id}
          campaignId={selectedCampaignId}
          assignment={selectedAssignmentForFollowUp}
          templates={templates}
          onScheduled={() => {
            setFollowUpRefreshTrigger((prev) => prev + 1);
            queryClient.invalidateQueries({ queryKey: ['outreach-queue', siteId, selectedCampaignId] });
            queryClient.invalidateQueries({ queryKey: ['outreach-history', siteId, selectedCampaignId] });
          }}
        />
      )}
    </div>
  );
};

export default OutreachEmailPage;