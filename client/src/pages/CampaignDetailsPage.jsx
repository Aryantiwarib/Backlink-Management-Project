import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Rocket,
  ArrowLeft,
  Calendar,
  Target,
  Link2,
  Users,
  CheckCircle2,
  Clock,
  Archive,
  PauseCircle,
  Play,
  Edit2,
  Plus,
  BarChart3,
  List,
  Columns3,
  Activity,
  RefreshCw,
  Search,
  Filter,
  Mail,
  Send,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { useWebsite } from '../context/WebsiteContext';
import { useToast } from '../context/ToastContext';
import { campaignApi } from '../api/campaignService';
import { outreachApi } from '../api/outreachService';
import { CampaignProspectTable } from '../components/campaigns/CampaignProspectTable';
import { CampaignKanbanBoard } from '../components/campaigns/CampaignKanbanBoard';
import { CampaignAnalytics } from '../components/campaigns/CampaignAnalytics';
import { CampaignActivityTimeline } from '../components/campaigns/CampaignActivityTimeline';
import { CampaignProspectSelectorModal } from '../components/campaigns/CampaignProspectSelectorModal';
import { EditCampaignModal } from '../components/campaigns/EditCampaignModal';
import { ContactManagerModal } from '../components/campaigns/ContactManagerModal';
import { EmailComposerModal } from '../components/outreach/EmailComposerModal';
import { OutreachQueueTable } from '../components/outreach/OutreachQueueTable';
import { FollowUpList } from '../components/outreach/FollowUpList';
import { FollowUpScheduleModal } from '../components/outreach/FollowUpScheduleModal';

export const CampaignDetailsPage = () => {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeWebsite } = useWebsite();
  const { addToast } = useToast();
  const siteId = activeWebsite?._id;

  // Assignments & Prospects Filtering States
  const [assignmentsPage, setAssignmentsPage] = useState(1);
  const [prospectSearch, setProspectSearch] = useState('');
  const [outreachStatusFilter, setOutreachStatusFilter] = useState('all');
  const [contactFilter, setContactFilter] = useState('all');

  // Contact Discovery & Pipeline State
  const [runningDiscovery, setRunningDiscovery] = useState(false);
  const [runningContactDiscovery, setRunningContactDiscovery] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [selectedAssignmentForContact, setSelectedAssignmentForContact] = useState(null);
  const [composerPreselectedProspects, setComposerPreselectedProspects] = useState([]);

  // View & Modals
  const [activeTab, setActiveTab] = useState('prospects'); // 'prospects' | 'kanban' | 'analytics' | 'timeline' | 'outreach'
  const [selectorModalOpen, setSelectorModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Outreach Filter (Phase 11)
  const [outreachFilter, setOutreachFilter] = useState('all');
  const [composerOpen, setComposerOpen] = useState(false);
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [selectedAssignmentForFollowUp, setSelectedAssignmentForFollowUp] = useState(null);
  const [followUpRefreshTrigger, setFollowUpRefreshTrigger] = useState(0);

  // 1. Campaign Details Query
  const {
    data: campaign,
    isLoading: campaignLoading
  } = useQuery({
    queryKey: ['campaign', siteId, campaignId],
    queryFn: async () => {
      if (!siteId || !campaignId) return null;
      return await campaignApi.getCampaignById(siteId, campaignId);
    },
    enabled: !!siteId && !!campaignId,
    staleTime: 60 * 1000
  });

  // 2. Assigned Prospects Query
  const {
    data: assignmentsResponse,
    isLoading: assignmentsLoading
  } = useQuery({
    queryKey: ['campaign-assignments', siteId, campaignId, { page: assignmentsPage, search: prospectSearch.trim(), outreachStatus: outreachStatusFilter, contactFilter }],
    queryFn: async () => {
      if (!siteId || !campaignId) return { assignments: [], pagination: null, stats: null };
      return await campaignApi.getCampaignProspects(siteId, campaignId, {
        page: assignmentsPage,
        limit: 50,
        search: prospectSearch.trim() || undefined,
        outreachStatus: outreachStatusFilter,
        contactFilter
      });
    },
    enabled: !!siteId && !!campaignId,
    placeholderData: (prev) => prev,
    staleTime: 60 * 1000
  });

  const assignments = assignmentsResponse?.assignments || [];
  const assignmentsPagination = assignmentsResponse?.pagination || {
    page: assignmentsPage,
    limit: 50,
    total: 0,
    totalPages: 1
  };
  const contactStats = assignmentsResponse?.stats || {
    total: 0,
    emailAvailable: 0,
    noEmail: 0,
    contactPending: 0,
    contactFailed: 0,
    highOpportunity: 0
  };

  // 3. Campaign Activities Query
  const {
    data: activitiesData,
    isLoading: activitiesLoading
  } = useQuery({
    queryKey: ['campaign-activities', siteId, campaignId],
    queryFn: async () => {
      if (!siteId || !campaignId) return [];
      const acts = await campaignApi.getCampaignActivities(siteId, campaignId, { limit: 50 });
      return acts || [];
    },
    enabled: !!siteId && !!campaignId,
    staleTime: 60 * 1000
  });
  const activities = activitiesData || [];

  // 4. Outreach Account Status Query
  const { data: accountStatus } = useQuery({
    queryKey: ['outreach-account'],
    queryFn: async () => {
      return await outreachApi.getAccountStatus().catch(() => null);
    },
    staleTime: 2 * 60 * 1000
  });

  // 5. Outreach Templates Query
  const { data: templatesData } = useQuery({
    queryKey: ['outreach-templates'],
    queryFn: async () => {
      return await outreachApi.listTemplates().catch(() => []);
    },
    staleTime: 5 * 60 * 1000
  });
  const templates = templatesData || [];

  // 6. Outreach Queue Query
  const {
    data: outreachQueueData,
    isLoading: outreachLoading
  } = useQuery({
    queryKey: ['outreach-queue', siteId, campaignId, outreachFilter],
    queryFn: async () => {
      if (!siteId || !campaignId) return { emails: [] };
      return await outreachApi.getQueue(siteId, campaignId, {
        status: outreachFilter !== 'all' ? outreachFilter : undefined
      }).catch(() => ({ emails: [] }));
    },
    enabled: !!siteId && !!campaignId && activeTab === 'outreach',
    staleTime: 30 * 1000
  });
  const outreachEmails = outreachQueueData?.emails || [];

  // 7. Outreach History / Stats Query
  const { data: outreachHistoryData } = useQuery({
    queryKey: ['outreach-history', siteId, campaignId],
    queryFn: async () => {
      if (!siteId || !campaignId) return { stats: null };
      return await outreachApi.getHistory(siteId, campaignId).catch(() => ({ stats: null }));
    },
    enabled: !!siteId && !!campaignId && activeTab === 'outreach',
    staleTime: 30 * 1000
  });
  const outreachStats = outreachHistoryData?.stats || null;

  // Invalidate Helpers
  const invalidateCampaignData = useCallback(async () => {
    if (!siteId || !campaignId) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['campaign', siteId, campaignId] }),
      queryClient.invalidateQueries({ queryKey: ['campaign-assignments', siteId, campaignId] }),
      queryClient.invalidateQueries({ queryKey: ['campaign-activities', siteId, campaignId] }),
      queryClient.invalidateQueries({ queryKey: ['campaigns', siteId] }),
      queryClient.invalidateQueries({ queryKey: ['campaign-stats', siteId] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard', siteId] })
    ]);
  }, [queryClient, siteId, campaignId]);

  const invalidateOutreachData = useCallback(async () => {
    if (!siteId || !campaignId) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['outreach-queue', siteId, campaignId] }),
      queryClient.invalidateQueries({ queryKey: ['outreach-history', siteId, campaignId] })
    ]);
  }, [queryClient, siteId, campaignId]);

  // Handle Send Outreach
  const handleSendOutreach = async (payload) => {
    try {
      const res = await outreachApi.sendOutreach(activeWebsite._id, campaignId, payload);
      addToast(res.message || 'Outreach emails queued successfully!', 'success');
      await Promise.all([
        invalidateOutreachData(),
        invalidateCampaignData()
      ]);
    } catch (err) {
      addToast(err?.message || 'Failed to queue outreach', 'error');
      throw err;
    }
  };

  // Handle Preview Outreach
  const handlePreviewOutreach = async (payload) => {
    return outreachApi.previewOutreach(activeWebsite._id, campaignId, payload);
  };

  // Polling for active discovery / contact discovery progress
  useEffect(() => {
    const isDiscoveryActive =
      campaign?.discoveryStatus === 'discovering' ||
      campaign?.discoveryStatus === 'enriching' ||
      campaign?.discoveryStatus === 'filtering' ||
      campaign?.discoveryStatus === 'assigning';

    const isContactActive =
      campaign?.discoverySummary?.contactDiscoveryProgress?.status === 'running' ||
      runningContactDiscovery;

    if (isDiscoveryActive || isContactActive) {
      const interval = setInterval(() => {
        invalidateCampaignData();
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [
    campaign?.discoveryStatus,
    campaign?.discoverySummary?.contactDiscoveryProgress?.status,
    runningContactDiscovery,
    invalidateCampaignData
  ]);

  // Rerun Automated Discovery
  const handleRunDiscoveryAgain = async () => {
    setRunningDiscovery(true);
    try {
      addToast('Running automated discovery and qualification...', 'info');
      await campaignApi.runDiscovery(activeWebsite._id, campaignId);
      addToast('Discovery completed successfully!', 'success');
      await invalidateCampaignData();
    } catch (err) {
      addToast(err?.message || 'Discovery failed', 'error');
    } finally {
      setRunningDiscovery(false);
    }
  };

  // Run or Retry Contact Discovery
  const handleRunContactDiscovery = async ({ forceRetry = false } = {}) => {
    setRunningContactDiscovery(true);
    try {
      addToast(forceRetry ? 'Retrying contact email discovery...' : 'Initiating contact email discovery...', 'info');
      const res = await campaignApi.runContactDiscovery(activeWebsite._id, campaignId, { forceRetry });
      if (res?.status === 'no_prospects') {
        addToast(res.message || 'No prospects are currently assigned to this campaign.', 'warning');
      } else {
        addToast(res?.message || 'Contact discovery in progress.', 'success');
      }
      await invalidateCampaignData();
    } catch (err) {
      addToast(err?.message || 'Contact discovery could not start', 'error');
    } finally {
      setRunningContactDiscovery(false);
    }
  };

  // Update Prospect Contact Emails
  const handleUpdateProspectContact = async (assignmentId, contactData) => {
    try {
      const res = await campaignApi.updateProspectContact(activeWebsite._id, campaignId, assignmentId, contactData);
      addToast('Contact details updated successfully', 'success');
      setSelectedAssignmentForContact((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          prospect: {
            ...prev.prospect,
            contactEmail: res.contactEmail,
            contactEmails: res.contactEmails,
            contactStatus: res.contactStatus
          }
        };
      });
      await invalidateCampaignData();
    } catch (err) {
      addToast(err?.message || 'Failed to update contact info', 'error');
      throw err;
    }
  };

  // Send Outreach from Selected Prospects in Table
  const handleSendOutreachFromTable = (selectedList) => {
    if (!selectedList || selectedList.length === 0) {
      addToast('Please select at least one prospect to send outreach.', 'warning');
      return;
    }

    const eligible = selectedList.filter((a) => {
      const p = a.prospect || a.prospectId || a;
      return Boolean(p.contactEmail || (Array.isArray(p.contactEmails) && p.contactEmails.length > 0));
    });

    if (eligible.length === 0) {
      addToast('None of the selected prospects have a discovered contact email address.', 'warning');
      return;
    }

    if (eligible.length < selectedList.length) {
      addToast(
        `Selected ${eligible.length} prospects with valid contact emails (${selectedList.length - eligible.length} without emails skipped).`,
        'info'
      );
    }

    setComposerPreselectedProspects(eligible);
    setComposerOpen(true);
  };

  // Status transition (active, paused, completed, archived)
  const handleStatusChange = async (newStatus) => {
    try {
      await campaignApi.updateCampaignStatus(
        activeWebsite._id,
        campaignId,
        newStatus
      );
      addToast(`Campaign transitioned to ${newStatus}`, 'success');
      await invalidateCampaignData();
    } catch (err) {
      addToast(err?.message || 'Failed to update campaign status', 'error');
    }
  };

  // Assign Prospects
  const handleAssignProspects = async (payloadOrIds, maybeNotes) => {
    try {
      let prospectIds = [];
      let notes = '';

      if (Array.isArray(payloadOrIds)) {
        prospectIds = payloadOrIds;
        notes = typeof maybeNotes === 'string' ? maybeNotes : '';
      } else if (payloadOrIds && typeof payloadOrIds === 'object') {
        prospectIds = Array.isArray(payloadOrIds.prospectIds)
          ? payloadOrIds.prospectIds
          : Array.isArray(payloadOrIds.ids)
          ? payloadOrIds.ids
          : [];
        notes = payloadOrIds.notes || '';
      }

      // Normalize IDs to string array
      const cleanedIds = prospectIds
        .map((p) => String(p?._id || p?.id || p || ''))
        .filter((id) => id.length > 0);

      if (cleanedIds.length === 0) {
        addToast('Please select at least one prospect to assign.', 'warning');
        return;
      }

      const res = await campaignApi.assignProspects(activeWebsite._id, campaignId, {
        prospectIds: cleanedIds,
        notes: typeof notes === 'string' ? notes.trim() : ''
      });
      addToast(res.message || `Assigned ${cleanedIds.length} prospects to campaign`, 'success');
      setSelectorModalOpen(false);
      await invalidateCampaignData();
    } catch (err) {
      addToast(err?.message || 'Failed to assign prospects', 'error');
      throw err;
    }
  };

  // Update Single Assignment Outreach Status
  const handleUpdateStatus = async (assignmentId, outreachStatus) => {
    try {
      await campaignApi.updateAssignment(activeWebsite._id, campaignId, assignmentId, {
        outreachStatus
      });
      addToast(`Status updated to ${outreachStatus.replace('_', ' ')}`, 'success');
      await invalidateCampaignData();
    } catch (err) {
      addToast(err?.message || 'Failed to update outreach status', 'error');
    }
  };

  // Update Single Assignment Full Object (notes, followUpAt)
  const handleUpdateAssignment = async (assignmentId, updateData) => {
    try {
      await campaignApi.updateAssignment(
        activeWebsite._id,
        campaignId,
        assignmentId,
        updateData
      );
      addToast('Assignment details updated', 'success');
      await invalidateCampaignData();
    } catch (err) {
      addToast(err?.message || 'Failed to save changes', 'error');
      throw err;
    }
  };

  // Bulk Status Update
  const handleBulkUpdateStatus = async (assignmentIds, outreachStatus) => {
    try {
      await campaignApi.bulkUpdateAssignmentsStatus(activeWebsite._id, campaignId, {
        assignmentIds,
        outreachStatus
      });
      addToast(`Updated ${assignmentIds.length} prospects to ${outreachStatus.replace('_', ' ')}`, 'success');
      await invalidateCampaignData();
    } catch (err) {
      addToast(err?.message || 'Failed to bulk update status', 'error');
    }
  };

  // Remove Prospect Assignment
  const handleRemoveAssignment = async (assignmentId) => {
    if (!window.confirm('Remove this prospect from the campaign? The prospect will remain safely in your saved prospects pipeline.')) {
      return;
    }
    try {
      await campaignApi.removeAssignment(activeWebsite._id, campaignId, assignmentId);
      addToast('Prospect removed from campaign', 'success');
      await invalidateCampaignData();
    } catch (err) {
      addToast(err?.message || 'Failed to remove prospect', 'error');
    }
  };

  // Update Campaign Settings
  const handleCampaignUpdate = async (formData) => {
    try {
      await campaignApi.updateCampaign(activeWebsite._id, campaignId, formData);
      addToast('Campaign settings updated', 'success');
      setEditModalOpen(false);
      await invalidateCampaignData();
    } catch (err) {
      addToast(err?.message || 'Failed to update campaign', 'error');
      throw err;
    }
  };

  if (campaignLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-[#15191E] rounded-3xl border border-white/[0.08]">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
        <p className="text-sm text-text-muted">Loading campaign details...</p>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-[#15191E] rounded-3xl border border-white/[0.08]">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4 text-rose-400">
          <Archive className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-text-primary">Campaign Not Found</h3>
        <p className="text-sm text-text-muted max-w-md mt-1 mb-6">
          The requested campaign does not exist or you do not have permission to access it.
        </p>
        <button
          onClick={() => navigate('/campaigns')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-text-primary text-sm font-medium border border-white/[0.1] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Campaigns</span>
        </button>
      </div>
    );
  }

  const metrics = campaign.metrics || {};
  const progressPct = metrics.progressPercentage ?? 0;
  const target = campaign.targetBacklinks || 0;
  const acquired = metrics.acquiredCount || 0;
  const assigned = metrics.totalAssigned || 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Breadcrumb & Controls */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate('/campaigns')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary hover:text-white border border-white/[0.08] text-xs font-medium transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>All Campaigns</span>
        </button>

        <div className="flex items-center gap-2">
          {campaign.status === 'active' && (
            <button
              onClick={() => handleStatusChange('paused')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-medium transition-colors"
            >
              <PauseCircle className="w-3.5 h-3.5" />
              <span>Pause</span>
            </button>
          )}
          {campaign.status === 'paused' && (
            <button
              onClick={() => handleStatusChange('active')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-medium transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Resume</span>
            </button>
          )}
          {campaign.status !== 'completed' && (
            <button
              onClick={() => handleStatusChange('completed')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-medium transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Mark Complete</span>
            </button>
          )}
          <button
            onClick={() => setEditModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary hover:text-white border border-white/[0.08] text-xs font-medium transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>
        </div>
      </div>

      {/* Campaign Header Banner */}
      <div className="p-6 rounded-3xl bg-[#15191E] border border-white/[0.08]">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {campaign.campaignType}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                campaign.status === 'active'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : campaign.status === 'paused'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : campaign.status === 'completed'
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  : 'bg-white/[0.05] text-text-muted border-white/[0.08]'
              }`}>
                {campaign.status.toUpperCase()}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">
              {campaign.name}
            </h1>

            {campaign.description && (
              <p className="text-sm text-text-secondary leading-relaxed">
                {campaign.description}
              </p>
            )}

            {campaign.objective && (
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <Target className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Objective: <strong className="text-text-secondary">{campaign.objective}</strong></span>
              </div>
            )}
          </div>

          {/* Target Progress Card */}
          <div className="lg:w-72 p-4 rounded-2xl bg-black/40 border border-white/[0.08] space-y-3 shrink-0">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-text-muted">Backlink Goal</span>
              <span className="text-emerald-400 font-bold">{progressPct}%</span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/[0.04] text-center">
              <div>
                <span className="text-lg font-bold text-text-primary">{acquired}</span>
                <span className="text-[10px] text-text-muted block">Acquired / {target} Goal</span>
              </div>
              <div>
                <span className="text-lg font-bold text-emerald-400">{assigned}</span>
                <span className="text-[10px] text-text-muted block">Assigned Prospects</span>
              </div>
            </div>
          </div>
        </div>

        {/* Campaign Metadata Footer */}
        <div className="flex flex-wrap items-center gap-6 mt-6 pt-4 border-t border-white/[0.06] text-xs text-text-muted">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              Started: {campaign.startDate ? new Date(campaign.startDate).toLocaleDateString() : 'N/A'}
            </span>
          </div>
          {campaign.endDate && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>Ends: {new Date(campaign.endDate).toLocaleDateString()}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Updated: {new Date(campaign.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Automated Discovery Progress & Sources Summary Banner */}
      {campaign && (
        <div className="p-5 rounded-3xl bg-[#15191E] border border-white/[0.08] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`p-2 rounded-xl border ${
                  campaign.discoveryStatus === 'discovering' ||
                  campaign.discoveryStatus === 'enriching' ||
                  campaign.discoveryStatus === 'filtering' ||
                  campaign.discoveryStatus === 'assigning'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : campaign.discoveryStatus === 'completed_with_warnings'
                    ? 'bg-teal-500/10 text-teal-400 border-teal-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}
              >
                <Sparkles
                  className={`w-4 h-4 ${
                    ['discovering', 'enriching', 'filtering', 'assigning'].includes(
                      campaign.discoveryStatus
                    )
                      ? 'animate-spin'
                      : ''
                  }`}
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-text-primary">
                    Automated Discovery Pipeline
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${
                      campaign.discoveryStatus === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : campaign.discoveryStatus === 'completed_with_warnings'
                        ? 'bg-teal-500/10 text-teal-400 border-teal-500/20'
                        : ['discovering', 'enriching', 'filtering', 'assigning'].includes(
                            campaign.discoveryStatus
                          )
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                        : 'bg-white/[0.04] text-text-muted border-white/[0.08]'
                    }`}
                  >
                    {String(campaign.discoveryStatus || 'pending').replace('_', ' ')}
                  </span>
                </div>
                <p className="text-xs text-text-muted">
                  Niche: <strong className="text-text-secondary">{campaign.niche || 'General'}</strong>
                  {campaign.primaryKeywords?.length > 0 &&
                    ` • Keywords: ${campaign.primaryKeywords.join(', ')}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleRunContactDiscovery}
                disabled={
                  runningContactDiscovery ||
                  campaign.discoverySummary?.contactDiscoveryProgress?.status === 'running'
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary hover:text-white border border-white/[0.08] text-xs font-medium transition-colors disabled:opacity-50"
                title="Crawl prospect websites & extract contact emails"
              >
                <Mail className="w-3.5 h-3.5 text-emerald-400" />
                <span>Find Contact Emails</span>
              </button>

              <button
                onClick={handleRunDiscoveryAgain}
                disabled={
                  runningDiscovery ||
                  ['discovering', 'enriching', 'filtering', 'assigning'].includes(
                    campaign.discoveryStatus
                  )
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-medium transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${runningDiscovery ? 'animate-spin' : ''}`} />
                <span>Rerun Discovery</span>
              </button>
            </div>
          </div>

          {/* Contact Discovery Progress & Status Alerts */}
          {campaign.discoverySummary?.contactDiscoveryProgress?.status === 'running' && (
            <div className="p-3.5 rounded-2xl bg-black/40 border border-emerald-500/20 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Searching & Extracting Public Contact Emails...</span>
                </span>
                <span className="text-text-muted font-mono">
                  Processed {campaign.discoverySummary.contactDiscoveryProgress.processed || 0} /{' '}
                  {campaign.discoverySummary.contactDiscoveryProgress.total || 0} websites ({campaign.discoverySummary?.contactEmailsFoundCount || 0} emails found)
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.round(
                      ((campaign.discoverySummary.contactDiscoveryProgress.processed || 0) /
                        (campaign.discoverySummary.contactDiscoveryProgress.total || 1)) *
                        100
                    )}%`
                  }}
                />
              </div>
            </div>
          )}

          {campaign.discoverySummary?.contactDiscoveryProgress?.status === 'failed' && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>
                  <strong>Contact discovery stopped:</strong>{' '}
                  {campaign.discoverySummary.contactDiscoveryProgress.error ||
                    'Web crawl or search fallback was interrupted.'}
                </span>
              </div>
              <button
                onClick={() => handleRunContactDiscovery({ forceRetry: true })}
                disabled={runningContactDiscovery}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 font-medium transition-colors shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${runningContactDiscovery ? 'animate-spin' : ''}`} />
                <span>Retry Contact Discovery</span>
              </button>
            </div>
          )}

          {/* Discovery Metrics Cards Grid: 8 Separate Metric Counts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-2 border-t border-white/[0.06] text-center text-xs">
            <div className="p-2.5 rounded-xl bg-black/20 border border-white/[0.04]">
              <span className="text-text-muted text-[10px] block">Raw Discovered</span>
              <span className="text-sm font-bold text-text-primary">
                {campaign.discoverySummary?.totalDiscovered || 0}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-black/20 border border-white/[0.04]">
              <span className="text-text-muted text-[10px] block">Unique Domains</span>
              <span className="text-sm font-bold text-text-primary">
                {campaign.discoverySummary?.uniqueDomainsCount || 0}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-black/20 border border-white/[0.04]">
              <span className="text-text-muted text-[10px] block">Enriched (SEO)</span>
              <span className="text-sm font-bold text-teal-400">
                {campaign.discoverySummary?.enrichmentSuccessCount || 0}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-black/20 border border-white/[0.04]">
              <span className="text-text-muted text-[10px] block">
                Qualified (DA Assessed)
              </span>
              <span className="text-sm font-bold text-emerald-400 font-mono">
                {Math.max(
                  0,
                  (campaign.discoverySummary?.qualifiedCount || 0) -
                    (campaign.discoverySummary?.provisionalCount || 0)
                )}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-black/20 border border-white/[0.04]">
              <span className="text-text-muted text-[10px] block">
                Provisional (Unassessed DA)
              </span>
              <span className="text-sm font-bold text-cyan-400 font-mono">
                {campaign.discoverySummary?.provisionalCount ||
                  (campaign.discoverySummary?.enrichmentSuccessCount === 0 &&
                  (campaign.discoverySummary?.qualifiedCount || 0) > 0
                    ? campaign.discoverySummary?.qualifiedCount
                    : 0)}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-black/20 border border-white/[0.04]">
              <span className="text-text-muted text-[10px] block">Rejected</span>
              <span className="text-sm font-bold text-amber-400 font-mono">
                {campaign.discoverySummary?.rejectedCount || 0}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-black/20 border border-white/[0.04]">
              <span className="text-text-muted text-[10px] block">Assigned</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">
                {campaign.discoverySummary?.assignedCount || assignments.length}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-black/20 border border-white/[0.04]">
              <span className="text-text-muted text-[10px] block">Emails Found</span>
              <span className="text-sm font-bold text-teal-400 font-mono">
                {contactStats.emailAvailable ||
                  campaign.discoverySummary?.contactEmailsFoundCount ||
                  0}
              </span>
            </div>
          </div>

          {/* Warnings list if any provider had a partial issue */}
          {campaign.discoverySummary?.warnings?.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs space-y-1">
              <span className="font-semibold block flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Discovery Source Alerts:
              </span>
              {campaign.discoverySummary.warnings.map((w, i) => (
                <p key={i} className="text-[11px] text-amber-200/80">
                  • [{w.source?.toUpperCase()}] {w.message}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Navigation Tabs Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('prospects')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
              activeTab === 'prospects'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Prospects Table</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/[0.08] text-text-secondary">
              {assigned}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('kanban')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
              activeTab === 'kanban'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Columns3 className="w-3.5 h-3.5" />
            <span>Outreach Pipeline (Kanban)</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
              activeTab === 'analytics'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Funnel & Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
              activeTab === 'timeline'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Activity Log</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/[0.08] text-text-secondary">
              {activities.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('outreach')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
              activeTab === 'outreach'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Outreach & Emails</span>
            {outreachEmails.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/[0.08] text-text-secondary">
                {outreachEmails.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setComposerOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary hover:text-white border border-white/[0.08] text-xs font-medium transition-colors"
          >
            <Send className="w-3.5 h-3.5 text-emerald-400" />
            <span>Send Outreach</span>
          </button>

          {/* Assign Prospects Action Button */}
          <button
            onClick={() => setSelectorModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-xs transition-all shadow-lg shadow-emerald-500/20 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Assign Prospects</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Prospects Table */}
      {activeTab === 'prospects' && (
        <div className="space-y-4">
          {/* Section 11: Contact Availability & Strategy Filter Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-[#101419] border border-white/[0.06]">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {[
                { id: 'all', label: 'All Prospects', count: contactStats.total },
                {
                  id: 'email_available',
                  label: 'Email Available',
                  count: contactStats.emailAvailable,
                  highlight: true
                },
                { id: 'no_email', label: 'No Email Found', count: contactStats.noEmail },
                {
                  id: 'high_opportunity',
                  label: 'High Opportunity (70+)',
                  count: contactStats.highOpportunity
                },
                {
                  id: 'contact_pending',
                  label: 'Discovery Pending',
                  count: contactStats.contactPending
                }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setContactFilter(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition-all ${
                    contactFilter === tab.id
                      ? tab.highlight
                        ? 'bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-500/20'
                        : 'bg-white/[0.08] text-white font-semibold'
                      : 'text-text-muted hover:text-text-primary hover:bg-white/[0.02]'
                  }`}
                >
                  {tab.id === 'email_available' && <Mail className="w-3.5 h-3.5" />}
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      contactFilter === tab.id
                        ? 'bg-black/30 text-white'
                        : 'bg-white/[0.04] text-text-muted'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search domain, URL, or email..."
                value={prospectSearch}
                onChange={(e) => setProspectSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#0D1117] border border-white/[0.08] text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          <CampaignProspectTable
            assignments={assignments}
            loading={assignmentsLoading}
            onUpdateStatus={handleUpdateStatus}
            onUpdateAssignment={handleUpdateAssignment}
            onRemoveAssignment={handleRemoveAssignment}
            onBulkUpdateStatus={handleBulkUpdateStatus}
            onOpenProspectSelector={() => setSelectorModalOpen(true)}
            onOpenContactManager={(assignment) => {
              setSelectedAssignmentForContact(assignment);
              setContactModalOpen(true);
            }}
            onSendOutreach={handleSendOutreachFromTable}
            onRerunDiscovery={handleRunDiscoveryAgain}
            onEditCriteria={() => setEditModalOpen(true)}
          />

          {/* Prospects Pagination */}
          {assignmentsPagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 rounded-2xl bg-[#15191E] border border-white/[0.08] text-xs text-text-muted">
              <div>
                Showing <span className="font-semibold text-text-primary">{assignments.length}</span> of{' '}
                <span className="font-semibold text-text-primary">{assignmentsPagination.total}</span> assigned prospects
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAssignmentsPage((p) => Math.max(1, p - 1))}
                  disabled={assignmentsPagination.page <= 1}
                  className="px-3 py-1.5 rounded-lg bg-black/40 hover:bg-white/[0.05] disabled:opacity-40 text-text-secondary border border-white/[0.08]"
                >
                  Previous
                </button>
                <span className="px-2">
                  Page {assignmentsPagination.page} of {assignmentsPagination.totalPages}
                </span>
                <button
                  onClick={() => setAssignmentsPage((p) => p + 1)}
                  disabled={assignmentsPagination.page >= assignmentsPagination.totalPages}
                  className="px-3 py-1.5 rounded-lg bg-black/40 hover:bg-white/[0.05] disabled:opacity-40 text-text-secondary border border-white/[0.08]"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Kanban Pipeline */}
      {activeTab === 'kanban' && (
        <CampaignKanbanBoard
          assignments={assignments}
          onUpdateStatus={handleUpdateStatus}
          onRemoveAssignment={handleRemoveAssignment}
        />
      )}

      {/* Tab 3: Funnel & Analytics */}
      {activeTab === 'analytics' && (
        <CampaignAnalytics campaign={campaign} />
      )}

      {/* Tab 4: Activity Timeline */}
      {activeTab === 'timeline' && (
        <CampaignActivityTimeline activities={activities} loading={activitiesLoading} />
      )}

      {/* Tab 5: Outreach & Emails (Phase 11) */}
      {activeTab === 'outreach' && (
        <div className="space-y-6">
          {/* Quick Metrics Bar */}
          {outreachStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-[#15191E] border border-white/[0.08]">
              <div className="text-center p-2 rounded-xl bg-black/30">
                <span className="text-xs text-text-muted block">Queued</span>
                <span className="text-lg font-bold text-amber-400">{outreachStats.totalPending || 0}</span>
              </div>
              <div className="text-center p-2 rounded-xl bg-black/30">
                <span className="text-xs text-text-muted block">Sent</span>
                <span className="text-lg font-bold text-emerald-400">{outreachStats.totalSent || 0}</span>
              </div>
              <div className="text-center p-2 rounded-xl bg-black/30">
                <span className="text-xs text-text-muted block">Opened</span>
                <span className="text-lg font-bold text-teal-400">{outreachStats.totalOpened || 0}</span>
              </div>
              <div className="text-center p-2 rounded-xl bg-black/30">
                <span className="text-xs text-text-muted block">Clicked</span>
                <span className="text-lg font-bold text-blue-400">{outreachStats.totalClicked || 0}</span>
              </div>
            </div>
          )}

          {/* Sending Queue Table */}
          <OutreachQueueTable
            emails={outreachEmails}
            loading={outreachLoading}
            statusFilter={outreachFilter}
            onStatusFilterChange={setOutreachFilter}
            onRefresh={invalidateOutreachData}
          />

          {/* Scheduled Follow-ups for this Campaign */}
          <FollowUpList
            websiteId={activeWebsite?._id}
            campaignId={campaignId}
            templates={templates}
            onOpenComposer={() => setComposerOpen(true)}
            refreshTrigger={followUpRefreshTrigger}
          />
        </div>
      )}

      {/* Modal: Assign Prospects from Phase 9 */}
      <CampaignProspectSelectorModal
        websiteId={activeWebsite?._id}
        campaignName={campaign.name}
        isOpen={selectorModalOpen}
        onClose={() => setSelectorModalOpen(false)}
        onAssign={handleAssignProspects}
        alreadyAssignedProspectIds={assignments.map(
          (a) => a.prospectId?._id || a.prospectId || a.prospect?.id || a.prospect?._id
        )}
      />

      {/* Modal: Edit Campaign Settings */}
      <EditCampaignModal
        campaign={campaign}
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onUpdate={handleCampaignUpdate}
      />

      {/* Modal: Email Composer */}
      {composerOpen && (
        <EmailComposerModal
          isOpen={composerOpen}
          onClose={() => {
            setComposerOpen(false);
            setComposerPreselectedProspects([]);
          }}
          campaign={campaign}
          prospects={
            composerPreselectedProspects.length > 0
              ? composerPreselectedProspects
              : assignments
          }
          templates={templates}
          connectedAccount={accountStatus}
          onSend={handleSendOutreach}
          onPreview={handlePreviewOutreach}
        />
      )}

      {/* Modal: Prospect Contact Information Manager */}
      {contactModalOpen && selectedAssignmentForContact && (
        <ContactManagerModal
          isOpen={contactModalOpen}
          onClose={() => {
            setContactModalOpen(false);
            setSelectedAssignmentForContact(null);
          }}
          assignment={selectedAssignmentForContact}
          onUpdateContact={handleUpdateProspectContact}
        />
      )}

      {/* Modal: Follow-up Scheduler */}
      {followUpModalOpen && selectedAssignmentForFollowUp && (
        <FollowUpScheduleModal
          isOpen={followUpModalOpen}
          onClose={() => {
            setFollowUpModalOpen(false);
            setSelectedAssignmentForFollowUp(null);
          }}
          websiteId={activeWebsite?._id}
          campaignId={campaignId}
          assignment={selectedAssignmentForFollowUp}
          templates={templates}
          onScheduled={() => {
            setFollowUpRefreshTrigger((prev) => prev + 1);
            invalidateOutreachData();
          }}
        />
      )}
    </div>
  );
};

export default CampaignDetailsPage;
