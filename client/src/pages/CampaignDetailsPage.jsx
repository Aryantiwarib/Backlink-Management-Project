import React, { useState, useEffect, useCallback } from 'react';
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
  Sparkles
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
import { EmailComposerModal } from '../components/outreach/EmailComposerModal';
import { OutreachQueueTable } from '../components/outreach/OutreachQueueTable';
import { FollowUpList } from '../components/outreach/FollowUpList';
import { FollowUpScheduleModal } from '../components/outreach/FollowUpScheduleModal';

export const CampaignDetailsPage = () => {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const { activeWebsite } = useWebsite();
  const { addToast } = useToast();

  const [campaign, setCampaign] = useState(null);
  const [campaignLoading, setCampaignLoading] = useState(true);

  // Assignments & Prospects
  const [assignments, setAssignments] = useState([]);
  const [assignmentsPagination, setAssignmentsPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1
  });
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [prospectSearch, setProspectSearch] = useState('');
  const [outreachStatusFilter, setOutreachStatusFilter] = useState('all');

  // Activities
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  // View & Modals
  const [activeTab, setActiveTab] = useState('prospects'); // 'prospects' | 'kanban' | 'analytics' | 'timeline' | 'outreach'
  const [selectorModalOpen, setSelectorModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Outreach & Emails State (Phase 11)
  const [outreachEmails, setOutreachEmails] = useState([]);
  const [outreachLoading, setOutreachLoading] = useState(false);
  const [outreachStats, setOutreachStats] = useState(null);
  const [outreachFilter, setOutreachFilter] = useState('all');
  const [accountStatus, setAccountStatus] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [selectedAssignmentForFollowUp, setSelectedAssignmentForFollowUp] = useState(null);
  const [followUpRefreshTrigger, setFollowUpRefreshTrigger] = useState(0);

  // Fetch Campaign Details
  const loadCampaign = useCallback(async () => {
    if (!activeWebsite?._id || !campaignId) return;
    setCampaignLoading(true);
    try {
      const data = await campaignApi.getCampaignById(activeWebsite._id, campaignId);
      setCampaign(data);
    } catch (err) {
      addToast(err?.message || 'Failed to load campaign', 'error');
    } finally {
      setCampaignLoading(false);
    }
  }, [activeWebsite?._id, campaignId, addToast]);

  // Fetch Assigned Prospects
  const loadAssignments = useCallback(
    async (page = 1) => {
      if (!activeWebsite?._id || !campaignId) return;
      setAssignmentsLoading(true);
      try {
        const res = await campaignApi.getCampaignProspects(activeWebsite._id, campaignId, {
          page,
          limit: 50,
          search: prospectSearch.trim() || undefined,
          outreachStatus: outreachStatusFilter
        });
        setAssignments(res.assignments || []);
        if (res.pagination) {
          setAssignmentsPagination(res.pagination);
        }
      } catch (err) {
        addToast(err?.message || 'Failed to load assigned prospects', 'error');
      } finally {
        setAssignmentsLoading(false);
      }
    },
    [activeWebsite?._id, campaignId, prospectSearch, outreachStatusFilter, addToast]
  );

  // Fetch Activities
  const loadActivities = useCallback(async () => {
    if (!activeWebsite?._id || !campaignId) return;
    setActivitiesLoading(true);
    try {
      const acts = await campaignApi.getCampaignActivities(activeWebsite._id, campaignId, {
        limit: 50
      });
      setActivities(acts || []);
    } catch (err) {
      console.error('Failed to load activities:', err);
    } finally {
      setActivitiesLoading(false);
    }
  }, [activeWebsite?._id, campaignId]);

  // Load Outreach Data (Phase 11)
  const loadOutreachData = useCallback(async () => {
    if (!activeWebsite?._id || !campaignId) return;
    setOutreachLoading(true);
    try {
      const [acc, tpls, queueData, historyData] = await Promise.all([
        outreachApi.getAccountStatus().catch(() => null),
        outreachApi.listTemplates().catch(() => []),
        outreachApi.getQueue(activeWebsite._id, campaignId, {
          status: outreachFilter !== 'all' ? outreachFilter : undefined
        }).catch(() => ({ emails: [] })),
        outreachApi.getHistory(activeWebsite._id, campaignId).catch(() => ({ stats: null }))
      ]);

      if (acc) setAccountStatus(acc);
      if (tpls) setTemplates(tpls);
      setOutreachEmails(queueData?.emails || []);
      setOutreachStats(historyData?.stats || null);
    } catch (err) {
      console.error('Failed to load outreach data:', err);
    } finally {
      setOutreachLoading(false);
    }
  }, [activeWebsite?._id, campaignId, outreachFilter]);

  useEffect(() => {
    if (activeWebsite?._id && campaignId && activeTab === 'outreach') {
      loadOutreachData();
    }
  }, [activeWebsite?._id, campaignId, activeTab, outreachFilter, loadOutreachData]);

  // Handle Send Outreach
  const handleSendOutreach = async (payload) => {
    try {
      const res = await outreachApi.sendOutreach(activeWebsite._id, campaignId, payload);
      addToast(res.message || 'Outreach emails queued successfully!', 'success');
      loadOutreachData();
      loadAssignments(assignmentsPagination.page);
      loadActivities();
    } catch (err) {
      addToast(err?.message || 'Failed to queue outreach', 'error');
      throw err;
    }
  };

  // Handle Preview Outreach
  const handlePreviewOutreach = async (payload) => {
    return outreachApi.previewOutreach(activeWebsite._id, campaignId, payload);
  };

  useEffect(() => {
    if (activeWebsite?._id && campaignId) {
      loadCampaign();
      loadAssignments(1);
      loadActivities();
    }
  }, [activeWebsite?._id, campaignId, outreachStatusFilter, loadCampaign, loadAssignments, loadActivities]);

  // Status transition (active, paused, completed, archived)
  const handleStatusChange = async (newStatus) => {
    try {
      const updated = await campaignApi.updateCampaignStatus(
        activeWebsite._id,
        campaignId,
        newStatus
      );
      setCampaign(updated);
      addToast(`Campaign transitioned to ${newStatus}`, 'success');
      loadActivities();
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
      loadCampaign();
      loadAssignments(1);
      loadActivities();
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
      loadCampaign();
      loadAssignments(assignmentsPagination.page);
      loadActivities();
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
      loadCampaign();
      loadAssignments(assignmentsPagination.page);
      loadActivities();
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
      loadCampaign();
      loadAssignments(assignmentsPagination.page);
      loadActivities();
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
      loadCampaign();
      loadAssignments(assignmentsPagination.page);
      loadActivities();
    } catch (err) {
      addToast(err?.message || 'Failed to remove prospect', 'error');
    }
  };

  // Update Campaign Settings
  const handleCampaignUpdate = async (formData) => {
    try {
      const updated = await campaignApi.updateCampaign(activeWebsite._id, campaignId, formData);
      setCampaign(updated);
      addToast('Campaign settings updated', 'success');
      setEditModalOpen(false);
      loadActivities();
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
          <CampaignProspectTable
            assignments={assignments}
            loading={assignmentsLoading}
            onUpdateStatus={handleUpdateStatus}
            onUpdateAssignment={handleUpdateAssignment}
            onRemoveAssignment={handleRemoveAssignment}
            onBulkUpdateStatus={handleBulkUpdateStatus}
            onOpenProspectSelector={() => setSelectorModalOpen(true)}
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
                  onClick={() => loadAssignments(assignmentsPagination.page - 1)}
                  disabled={assignmentsPagination.page <= 1}
                  className="px-3 py-1.5 rounded-lg bg-black/40 hover:bg-white/[0.05] disabled:opacity-40 text-text-secondary border border-white/[0.08]"
                >
                  Previous
                </button>
                <span className="px-2">
                  Page {assignmentsPagination.page} of {assignmentsPagination.totalPages}
                </span>
                <button
                  onClick={() => loadAssignments(assignmentsPagination.page + 1)}
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
            onRefresh={loadOutreachData}
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
          onClose={() => setComposerOpen(false)}
          campaign={campaign}
          prospects={assignments}
          templates={templates}
          connectedAccount={accountStatus}
          onSend={handleSendOutreach}
          onPreview={handlePreviewOutreach}
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
            loadOutreachData();
          }}
        />
      )}
    </div>
  );
};

export default CampaignDetailsPage;
