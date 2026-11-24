import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const { activeWebsite } = useWebsite();
  const { addToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab State: 'queue' | 'templates' | 'followups' | 'settings'
  const [activeTab, setActiveTab] = useState('queue');

  // Account Status
  const [accountStatus, setAccountStatus] = useState(null);
  const [accountLoading, setAccountLoading] = useState(true);

  // Campaigns
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [campaignsLoading, setCampaignsLoading] = useState(false);

  // Templates
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);

  // Queue & Stats
  const [queueEmails, setQueueEmails] = useState([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueFilter, setQueueFilter] = useState('all');
  const [outreachStats, setOutreachStats] = useState(null);

  // Assigned prospects for Composer
  const [campaignProspects, setCampaignProspects] = useState([]);

  // Modals
  const [composerOpen, setComposerOpen] = useState(false);
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [selectedAssignmentForFollowUp, setSelectedAssignmentForFollowUp] = useState(null);
  const [followUpRefreshTrigger, setFollowUpRefreshTrigger] = useState(0);

  // Refs for tracking in-flight status requests and processed OAuth redirects
  const accountLoadingRef = useRef(false);
  const oauthHandledRef = useRef(false);

  // Load Gmail Account Status (declared before any effect or handler references it)
  const loadAccountStatus = useCallback(async () => {
    if (accountLoadingRef.current) return;
    accountLoadingRef.current = true;
    setAccountLoading(true);
    try {
      const data = await outreachApi.getAccountStatus();
      setAccountStatus(data);
    } catch (err) {
      console.error('Failed to load email account status:', err);
    } finally {
      setAccountLoading(false);
      accountLoadingRef.current = false;
    }
  }, []);

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
      loadAccountStatus();
    } catch (err) {
      addToast(err?.message || 'Failed to disconnect Gmail account', 'error');
    }
  };

  // Load Templates
  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const list = await outreachApi.listTemplates();
      setTemplates(list);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  // Load Campaigns for active website
  const loadCampaigns = useCallback(async () => {
    if (!activeWebsite?._id) return;
    setCampaignsLoading(true);
    try {
      const res = await campaignApi.getCampaigns(activeWebsite._id, { limit: 100 });
      const items = res.campaigns || [];
      setCampaigns(items);
      if (items.length > 0 && !selectedCampaignId) {
        setSelectedCampaignId(items[0]._id);
      }
    } catch (err) {
      console.error('Failed to load campaigns:', err);
    } finally {
      setCampaignsLoading(false);
    }
  }, [activeWebsite?._id, selectedCampaignId]);

  // Load Queue & Stats for Selected Campaign
  const loadQueueAndStats = useCallback(async () => {
    if (!activeWebsite?._id || !selectedCampaignId) return;
    setQueueLoading(true);
    try {
      const [queueData, historyData] = await Promise.all([
        outreachApi.getQueue(activeWebsite._id, selectedCampaignId, {
          status: queueFilter !== 'all' ? queueFilter : undefined
        }),
        outreachApi.getHistory(activeWebsite._id, selectedCampaignId)
      ]);

      setQueueEmails(queueData.emails || []);
      setOutreachStats(historyData.stats || null);
    } catch (err) {
      console.error('Failed to load outreach queue:', err);
    } finally {
      setQueueLoading(false);
    }
  }, [activeWebsite?._id, selectedCampaignId, queueFilter]);

  // Load Campaign Assigned Prospects (for composer modal)
  const loadCampaignProspects = useCallback(async () => {
    if (!activeWebsite?._id || !selectedCampaignId) return;
    try {
      const res = await campaignApi.getCampaignProspects(activeWebsite._id, selectedCampaignId, {
        limit: 100
      });
      setCampaignProspects(res.assignments || []);
    } catch (err) {
      console.error('Failed to load campaign prospects:', err);
    }
  }, [activeWebsite?._id, selectedCampaignId]);

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
      loadAccountStatus();
    } else if (googleError) {
      addToast(`Google connection failed: ${decodeURIComponent(googleError)}`, 'error');
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('google_error');
      nextParams.delete('gmail_error');
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams, addToast, loadAccountStatus]);

  // Initial loads
  useEffect(() => {
    loadAccountStatus();
    loadTemplates();
  }, [loadAccountStatus, loadTemplates]);

  useEffect(() => {
    if (activeWebsite?._id) {
      loadCampaigns();
    }
  }, [activeWebsite?._id, loadCampaigns]);

  useEffect(() => {
    if (selectedCampaignId) {
      loadQueueAndStats();
      loadCampaignProspects();
    }
  }, [selectedCampaignId, queueFilter, loadQueueAndStats, loadCampaignProspects]);

  // Template Handlers
  const handleCreateTemplate = async (templateData) => {
    try {
      await outreachApi.createTemplate(templateData);
      addToast('Template created successfully', 'success');
      loadTemplates();
    } catch (err) {
      addToast(err?.message || 'Failed to create template', 'error');
      throw err;
    }
  };

  const handleUpdateTemplate = async (id, updateData) => {
    try {
      await outreachApi.updateTemplate(id, updateData);
      addToast('Template updated successfully', 'success');
      loadTemplates();
    } catch (err) {
      addToast(err?.message || 'Failed to update template', 'error');
      throw err;
    }
  };

  const handleDeleteTemplate = async (id) => {
    try {
      await outreachApi.deleteTemplate(id);
      addToast('Template deleted', 'success');
      loadTemplates();
    } catch (err) {
      addToast(err?.message || 'Failed to delete template', 'error');
      throw err;
    }
  };

  // Email Send Handler
  const handleSendEmails = async (payload) => {
    if (!activeWebsite?._id || !selectedCampaignId) {
      addToast('Please select a campaign first', 'error');
      return;
    }

    try {
      const res = await outreachApi.sendOutreach(activeWebsite._id, selectedCampaignId, payload);
      addToast(res.message || 'Outreach queued successfully!', 'success');
      loadQueueAndStats();
      loadCampaignProspects();
    } catch (err) {
      addToast(err?.message || 'Failed to queue outreach', 'error');
      throw err;
    }
  };

  // Preview Handler
  const handlePreviewEmails = async (payload) => {
    if (!activeWebsite?._id || !selectedCampaignId) {
      throw new Error('Please select a campaign first');
    }
    return outreachApi.previewOutreach(activeWebsite._id, selectedCampaignId, payload);
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
              onRefresh={loadQueueAndStats}
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
            onRefresh={loadAccountStatus}
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
            loadQueueAndStats();
          }}
        />
      )}
    </div>
  );
};

export default OutreachEmailPage;