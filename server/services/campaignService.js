import mongoose from 'mongoose';
import Campaign, { CAMPAIGN_STATUSES, CAMPAIGN_TYPES } from '../models/Campaign.js';
import CampaignProspectAssignment, { OUTREACH_STATUSES } from '../models/CampaignProspectAssignment.js';
import CampaignActivity from '../models/CampaignActivity.js';
import Prospect from '../models/Prospect.js';
import Website from '../models/Website.js';

// Regex escape helper
function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

const ALLOWED_CAMPAIGN_SORT_FIELDS = [
  'createdAt',
  'name',
  'status',
  'targetBacklinks',
  'startDate',
  'endDate',
  'updatedAt'
];

const ALLOWED_ASSIGNMENT_SORT_FIELDS = [
  'assignedAt',
  'outreachStatus',
  'contactedAt',
  'followUpAt',
  'acquiredAt',
  'createdAt'
];

export class CampaignService {
  /**
   * Record an activity event in a campaign's audit timeline
   */
  async recordActivity({ userId, websiteId, campaignId, assignmentId = null, action, description, metadata = {} }) {
    try {
      return await CampaignActivity.create({
        userId,
        websiteId,
        campaignId,
        assignmentId,
        action,
        description,
        metadata
      });
    } catch (err) {
      console.warn('[CampaignService] Failed to record activity log:', err.message);
      return null;
    }
  }

  /**
   * Create a new campaign for a website
   */
  async createCampaign({ userId, websiteId, campaignData }) {
    if (!userId || !websiteId || !campaignData) {
      throw new Error('userId, websiteId, and campaignData are required.');
    }

    const {
      name,
      description = '',
      campaignType,
      objective = '',
      targetBacklinks = 0,
      startDate,
      endDate,
      status = 'active'
    } = campaignData;

    if (!name || !name.trim()) {
      const err = new Error('Campaign name is required.');
      err.status = 400;
      throw err;
    }

    if (!campaignType) {
      const err = new Error('Campaign type is required.');
      err.status = 400;
      throw err;
    }

    const targetNum = Math.max(0, parseInt(targetBacklinks, 10) || 0);

    const parsedStart = startDate ? new Date(startDate) : new Date();
    const parsedEnd = endDate ? new Date(endDate) : null;

    if (parsedEnd && parsedStart && parsedEnd < parsedStart) {
      const err = new Error('End date cannot be earlier than start date.');
      err.status = 400;
      throw err;
    }

    const campaign = await Campaign.create({
      userId,
      websiteId,
      name: name.trim(),
      description: description.trim(),
      campaignType,
      objective: objective.trim(),
      targetBacklinks: targetNum,
      startDate: parsedStart,
      endDate: parsedEnd,
      status: CAMPAIGN_STATUSES.includes(status) ? status : 'active'
    });

    // Record creation activity
    await this.recordActivity({
      userId,
      websiteId,
      campaignId: campaign._id,
      action: 'campaign_created',
      description: `Created campaign "${campaign.name}" (${campaign.campaignType}) with target of ${campaign.targetBacklinks} backlinks.`,
      metadata: {
        campaignType: campaign.campaignType,
        targetBacklinks: campaign.targetBacklinks,
        status: campaign.status
      }
    });

    return campaign.toSafeObject();
  }

  /**
   * Retrieve list of campaigns with search, filter, pagination, and calculated metrics
   */
  async getCampaigns({
    userId,
    websiteId,
    page = 1,
    limit = 10,
    search = '',
    status = '',
    campaignType = '',
    sortBy = 'createdAt',
    sortOrder = 'desc'
  }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(Math.max(1, parseInt(limit, 10) || 10), 100);
    const skip = (pageNum - 1) * limitNum;

    const query = {
      userId,
      websiteId
    };

    // Status filtering:
    // Exclude 'archived' by default unless explicitly requested via status === 'archived'
    if (status === 'archived') {
      query.status = 'archived';
    } else if (status && status !== 'all') {
      query.status = status;
    } else {
      // Default view or status === 'all': exclude archived campaigns
      query.status = { $ne: 'archived' };
    }

    // Campaign Type filtering
    if (campaignType && campaignType !== 'all') {
      query.campaignType = campaignType;
    }

    // Search query
    if (search && typeof search === 'string' && search.trim()) {
      const escaped = escapeRegex(search.trim());
      const regex = new RegExp(escaped, 'i');
      query.$or = [{ name: regex }, { description: regex }, { objective: regex }];
    }

    // Sorting
    const sortField = ALLOWED_CAMPAIGN_SORT_FIELDS.includes(sortBy) ? sortBy : 'createdAt';
    const sortDirection = String(sortOrder).toLowerCase() === 'asc' ? 1 : -1;
    const sort = { [sortField]: sortDirection };

    const [total, campaigns] = await Promise.all([
      Campaign.countDocuments(query),
      Campaign.find(query).sort(sort).skip(skip).limit(limitNum)
    ]);

    // Aggregate prospect assignment counts for these campaigns in one query (prevents N+1)
    const campaignIds = campaigns.map((c) => c._id);
    const assignmentStats = await CampaignProspectAssignment.aggregate([
      {
        $match: {
          campaignId: { $in: campaignIds },
          websiteId: new mongoose.Types.ObjectId(websiteId),
          userId: new mongoose.Types.ObjectId(userId)
        }
      },
      {
        $group: {
          _id: '$campaignId',
          totalAssigned: { $sum: 1 },
          acquiredCount: {
            $sum: { $cond: [{ $eq: ['$outreachStatus', 'link_acquired'] }, 1, 0] }
          }
        }
      }
    ]);

    const statsMap = new Map();
    for (const stat of assignmentStats) {
      statsMap.set(stat._id.toString(), stat);
    }

    const populatedCampaigns = campaigns.map((c) => {
      const safe = c.toSafeObject();
      const stats = statsMap.get(safe.id) || { totalAssigned: 0, acquiredCount: 0 };
      const totalAssigned = stats.totalAssigned;
      const acquiredCount = stats.acquiredCount;
      const target = safe.targetBacklinks || 0;
      const progressPercentage = target > 0 ? Math.min(100, Math.round((acquiredCount / target) * 100)) : 0;

      return {
        ...safe,
        assignedProspectsCount: totalAssigned,
        acquiredBacklinksCount: acquiredCount,
        progressPercentage
      };
    });

    const totalPages = Math.ceil(total / limitNum) || 1;

    return {
      campaigns: populatedCampaigns,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    };
  }

  /**
   * Aggregate high-level campaign summary KPIs for dashboard
   */
  async getCampaignStats({ userId, websiteId }) {
    const siteObjId = new mongoose.Types.ObjectId(websiteId);
    const userObjId = new mongoose.Types.ObjectId(userId);

    const [
      totalCampaigns,
      statusCounts,
      assignmentCounts
    ] = await Promise.all([
      Campaign.countDocuments({ userId, websiteId }),
      Campaign.aggregate([
        { $match: { userId: userObjId, websiteId: siteObjId } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      CampaignProspectAssignment.aggregate([
        { $match: { userId: userObjId, websiteId: siteObjId } },
        {
          $group: {
            _id: null,
            totalAssigned: { $sum: 1 },
            totalAcquired: {
              $sum: { $cond: [{ $eq: ['$outreachStatus', 'link_acquired'] }, 1, 0] }
            }
          }
        }
      ])
    ]);

    const byStatus = {
      active: 0,
      draft: 0,
      paused: 0,
      completed: 0,
      archived: 0
    };

    for (const sc of statusCounts) {
      if (sc._id && byStatus[sc._id] !== undefined) {
        byStatus[sc._id] = sc.count;
      }
    }

    const assignedStats = assignmentCounts[0] || { totalAssigned: 0, totalAcquired: 0 };

    return {
      totalCampaigns,
      activeCampaigns: byStatus.active,
      draftCampaigns: byStatus.draft,
      pausedCampaigns: byStatus.paused,
      completedCampaigns: byStatus.completed,
      archivedCampaigns: byStatus.archived,
      totalAssignedProspects: assignedStats.totalAssigned,
      totalAcquiredBacklinks: assignedStats.totalAcquired
    };
  }

  /**
   * Fetch a single campaign by ID with metrics and status breakdown
   */
  async getCampaignById({ userId, websiteId, campaignId }) {
    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      const err = new Error('Invalid campaign ID format.');
      err.status = 400;
      throw err;
    }

    const campaign = await Campaign.findOne({ _id: campaignId, userId, websiteId });
    if (!campaign) {
      const err = new Error('Campaign not found or unauthorized.');
      err.status = 404;
      throw err;
    }

    // Aggregate assignment metrics for this campaign
    const campObjId = new mongoose.Types.ObjectId(campaignId);
    const [breakdownResults, totalCount] = await Promise.all([
      CampaignProspectAssignment.aggregate([
        { $match: { campaignId: campObjId, websiteId: new mongoose.Types.ObjectId(websiteId), userId: new mongoose.Types.ObjectId(userId) } },
        { $group: { _id: '$outreachStatus', count: { $sum: 1 } } }
      ]),
      CampaignProspectAssignment.countDocuments({ campaignId, websiteId, userId })
    ]);

    const statusBreakdown = {
      uncontacted: 0,
      contacted: 0,
      follow_up_due: 0,
      replied: 0,
      negotiating: 0,
      link_acquired: 0,
      rejected: 0,
      unresponsive: 0
    };

    for (const item of breakdownResults) {
      if (item._id && statusBreakdown[item._id] !== undefined) {
        statusBreakdown[item._id] = item.count;
      }
    }

    const acquiredCount = statusBreakdown.link_acquired || 0;
    const target = campaign.targetBacklinks || 0;
    const progressPercentage = target > 0 ? Math.min(100, Math.round((acquiredCount / target) * 100)) : 0;

    return {
      ...campaign.toSafeObject(),
      metrics: {
        totalAssigned: totalCount,
        acquiredCount,
        targetBacklinks: target,
        progressPercentage,
        statusBreakdown
      }
    };
  }

  /**
   * Update campaign details
   */
  async updateCampaign({ userId, websiteId, campaignId, updateData }) {
    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      const err = new Error('Invalid campaign ID format.');
      err.status = 400;
      throw err;
    }

    const campaign = await Campaign.findOne({ _id: campaignId, userId, websiteId });
    if (!campaign) {
      const err = new Error('Campaign not found or unauthorized.');
      err.status = 404;
      throw err;
    }

    const {
      name,
      description,
      campaignType,
      objective,
      targetBacklinks,
      startDate,
      endDate,
      status
    } = updateData;

    if (name !== undefined) {
      if (!name.trim()) throw new Error('Campaign name cannot be empty.');
      campaign.name = name.trim();
    }
    if (description !== undefined) campaign.description = description.trim();
    if (campaignType !== undefined) {
      if (!CAMPAIGN_TYPES.includes(campaignType)) throw new Error('Invalid campaign type.');
      campaign.campaignType = campaignType;
    }
    if (objective !== undefined) campaign.objective = objective.trim();
    if (targetBacklinks !== undefined) {
      const num = parseInt(targetBacklinks, 10);
      if (isNaN(num) || num < 0) throw new Error('Target backlinks cannot be negative.');
      campaign.targetBacklinks = num;
    }
    if (startDate !== undefined) campaign.startDate = new Date(startDate);
    if (endDate !== undefined) {
      const parsedEnd = endDate ? new Date(endDate) : null;
      if (parsedEnd && campaign.startDate && parsedEnd < campaign.startDate) {
        throw new Error('End date cannot be earlier than start date.');
      }
      campaign.endDate = parsedEnd;
    }
    if (status !== undefined) {
      if (!CAMPAIGN_STATUSES.includes(status)) throw new Error('Invalid campaign status.');
      campaign.status = status;
    }

    await campaign.save();

    await this.recordActivity({
      userId,
      websiteId,
      campaignId: campaign._id,
      action: 'campaign_updated',
      description: `Updated campaign parameters for "${campaign.name}".`,
      metadata: updateData
    });

    return campaign.toSafeObject();
  }

  /**
   * Transition campaign lifecycle status (active, paused, completed, archived)
   */
  async updateCampaignStatus({ userId, websiteId, campaignId, status }) {
    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      const err = new Error('Invalid campaign ID format.');
      err.status = 400;
      throw err;
    }

    if (!CAMPAIGN_STATUSES.includes(status)) {
      const err = new Error(`Invalid campaign status "${status}".`);
      err.status = 400;
      throw err;
    }

    const campaign = await Campaign.findOne({ _id: campaignId, userId, websiteId });
    if (!campaign) {
      const err = new Error('Campaign not found or unauthorized.');
      err.status = 404;
      throw err;
    }

    const prevStatus = campaign.status;
    campaign.status = status;
    await campaign.save();

    let action = 'status_changed';
    let description = `Campaign status changed from ${prevStatus} to ${status}.`;

    if (status === 'paused') {
      action = 'campaign_paused';
      description = `Campaign "${campaign.name}" was paused.`;
    } else if (status === 'active' && prevStatus === 'paused') {
      action = 'campaign_resumed';
      description = `Campaign "${campaign.name}" was resumed to active status.`;
    } else if (status === 'completed') {
      action = 'campaign_completed';
      description = `Campaign "${campaign.name}" was marked as completed.`;
    } else if (status === 'archived') {
      action = 'campaign_archived';
      description = `Campaign "${campaign.name}" was archived.`;
    }

    await this.recordActivity({
      userId,
      websiteId,
      campaignId: campaign._id,
      action,
      description,
      metadata: { prevStatus, newStatus: status }
    });

    return campaign.toSafeObject();
  }

  /**
   * Delete a campaign along with its assignments and activities
   */
  async deleteCampaign({ userId, websiteId, campaignId }) {
    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      const err = new Error('Invalid campaign ID format.');
      err.status = 400;
      throw err;
    }

    const campaign = await Campaign.findOne({ _id: campaignId, userId, websiteId });
    if (!campaign) {
      const err = new Error('Campaign not found or unauthorized.');
      err.status = 404;
      throw err;
    }

    // Delete assignments and activities for this campaign
    await Promise.all([
      CampaignProspectAssignment.deleteMany({ campaignId, userId, websiteId }),
      CampaignActivity.deleteMany({ campaignId, userId, websiteId }),
      Campaign.deleteOne({ _id: campaignId })
    ]);

    return {
      success: true,
      deleted: true,
      message: `Campaign "${campaign.name}" and associated assignments deleted successfully.`,
      id: campaignId
    };
  }

  // =========================================================================
  // CAMPAIGN PROSPECT ASSIGNMENT OPERATIONS
  // =========================================================================

  /**
   * Assign multiple prospects from Phase 9 to a campaign.
   * Guarantees:
   * 1. Only prospects belonging to the same user and website can be assigned.
   * 2. Prevents duplicate assignment within the same campaign.
   * 3. Preserves original Phase 9 Prospect data without modifying global status.
   */
  async assignProspects({ userId, websiteId, campaignId, prospectIds = [], notes = '' }) {
    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      const err = new Error('Invalid campaign ID format.');
      err.status = 400;
      throw err;
    }

    const campaign = await Campaign.findOne({ _id: campaignId, userId, websiteId });
    if (!campaign) {
      const err = new Error('Campaign not found or unauthorized.');
      err.status = 404;
      throw err;
    }

    if (!Array.isArray(prospectIds) || prospectIds.length === 0) {
      const err = new Error('Please select at least one prospect to assign.');
      err.status = 400;
      throw err;
    }

    const validIds = prospectIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    // Verify all selected prospects belong to the authenticated user and active website
    const verifiedProspects = await Prospect.find({
      _id: { $in: validIds },
      userId,
      websiteId
    });

    if (verifiedProspects.length === 0) {
      const err = new Error('None of the selected prospects were found for this website.');
      err.status = 404;
      throw err;
    }

    // Identify already-assigned prospects to prevent duplicates
    const existingAssignments = await CampaignProspectAssignment.find({
      campaignId,
      prospectId: { $in: verifiedProspects.map((p) => p._id) }
    }).select('prospectId');

    const existingSet = new Set(existingAssignments.map((a) => a.prospectId.toString()));

    const newAssignmentsToInsert = [];
    for (const prospect of verifiedProspects) {
      if (!existingSet.has(prospect._id.toString())) {
        newAssignmentsToInsert.push({
          userId,
          websiteId,
          campaignId,
          prospectId: prospect._id,
          outreachStatus: 'uncontacted',
          notes: notes.trim(),
          assignedAt: new Date()
        });
      }
    }

    let insertedDocs = [];
    if (newAssignmentsToInsert.length > 0) {
      insertedDocs = await CampaignProspectAssignment.insertMany(newAssignmentsToInsert);

      // Record activity
      await this.recordActivity({
        userId,
        websiteId,
        campaignId,
        action: 'prospects_assigned',
        description: `Assigned ${insertedDocs.length} prospect${insertedDocs.length === 1 ? '' : 's'} to campaign.`,
        metadata: {
          assignedCount: insertedDocs.length,
          alreadyAssignedCount: existingSet.size
        }
      });
    }

    return {
      success: true,
      message: `Assigned ${insertedDocs.length} new prospect(s) to "${campaign.name}".`,
      assignedCount: insertedDocs.length,
      duplicateCount: existingSet.size,
      totalAssignedNow: insertedDocs.length,
      alreadyAssignedCount: existingSet.size,
      assignments: insertedDocs.map((doc) => (doc.toSafeObject ? doc.toSafeObject() : doc))
    };
  }

  /**
   * Retrieve assigned prospects for a campaign with search, filter, and pagination
   */
  async getCampaignProspects({
    userId,
    websiteId,
    campaignId,
    page = 1,
    limit = 20,
    search = '',
    outreachStatus = 'all',
    sortBy = 'assignedAt',
    sortOrder = 'desc'
  }) {
    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      const err = new Error('Invalid campaign ID format.');
      err.status = 400;
      throw err;
    }

    // Verify campaign ownership
    const campaign = await Campaign.findOne({ _id: campaignId, userId, websiteId });
    if (!campaign) {
      const err = new Error('Campaign not found or unauthorized.');
      err.status = 404;
      throw err;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(Math.max(1, parseInt(limit, 10) || 20), 100);
    const skip = (pageNum - 1) * limitNum;

    const query = {
      userId,
      websiteId,
      campaignId
    };

    if (outreachStatus && outreachStatus !== 'all') {
      query.outreachStatus = outreachStatus;
    }

    // If searching, find matching prospect IDs first
    if (search && search.trim()) {
      const escaped = escapeRegex(search.trim());
      const regex = new RegExp(escaped, 'i');
      const matchingProspects = await Prospect.find({
        userId,
        websiteId,
        $or: [{ prospectDomain: regex }, { prospectUrl: regex }, { notes: regex }]
      }).select('_id');

      const pIds = matchingProspects.map((p) => p._id);
      query.$or = [{ prospectId: { $in: pIds } }, { notes: regex }];
    }

    const sortField = ALLOWED_ASSIGNMENT_SORT_FIELDS.includes(sortBy) ? sortBy : 'assignedAt';
    const sortDirection = String(sortOrder).toLowerCase() === 'asc' ? 1 : -1;
    const sort = { [sortField]: sortDirection };

    const [total, assignments] = await Promise.all([
      CampaignProspectAssignment.countDocuments(query),
      CampaignProspectAssignment.find(query)
        .populate('prospectId')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;

    return {
      campaign: campaign.toSafeObject(),
      assignments: assignments.map((a) => a.toSafeObject()),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    };
  }

  /**
   * Update an assigned prospect's outreach status, notes, follow-up date
   */
  async updateAssignment({ userId, websiteId, campaignId, assignmentId, updateData }) {
    if (!mongoose.Types.ObjectId.isValid(campaignId) || !mongoose.Types.ObjectId.isValid(assignmentId)) {
      const err = new Error('Invalid ID format.');
      err.status = 400;
      throw err;
    }

    const assignment = await CampaignProspectAssignment.findOne({
      _id: assignmentId,
      campaignId,
      userId,
      websiteId
    }).populate('prospectId');

    if (!assignment) {
      const err = new Error('Campaign prospect assignment not found or unauthorized.');
      err.status = 404;
      throw err;
    }

    const { outreachStatus, notes, followUpAt, contactedAt } = updateData;

    let statusChanged = false;
    const prevStatus = assignment.outreachStatus;

    if (outreachStatus && OUTREACH_STATUSES.includes(outreachStatus)) {
      if (outreachStatus !== assignment.outreachStatus) {
        statusChanged = true;
        assignment.outreachStatus = outreachStatus;

        // Auto-set timestamps based on status transition
        if (outreachStatus === 'contacted' && !assignment.contactedAt) {
          assignment.contactedAt = new Date();
        } else if (outreachStatus === 'link_acquired') {
          assignment.acquiredAt = new Date();
        }
      }
    }

    if (notes !== undefined) {
      assignment.notes = String(notes).trim().slice(0, 2000);
    }

    if (followUpAt !== undefined) {
      assignment.followUpAt = followUpAt ? new Date(followUpAt) : null;
    }

    if (contactedAt !== undefined) {
      assignment.contactedAt = contactedAt ? new Date(contactedAt) : null;
    }

    await assignment.save();

    // Log activity
    const domainName = assignment.prospectId?.prospectDomain || 'prospect';
    if (statusChanged) {
      await this.recordActivity({
        userId,
        websiteId,
        campaignId,
        assignmentId: assignment._id,
        action: outreachStatus === 'link_acquired' ? 'link_acquired' : 'outreach_status_updated',
        description: outreachStatus === 'link_acquired'
          ? `Backlink acquired from ${domainName}!`
          : `Outreach status for ${domainName} updated to "${outreachStatus}".`,
        metadata: {
          prevStatus,
          newStatus: outreachStatus,
          domain: domainName
        }
      });
    }

    return assignment.toSafeObject();
  }

  /**
   * Remove a prospect from a campaign without deleting the underlying Phase 9 prospect record
   */
  async removeAssignment({ userId, websiteId, campaignId, assignmentId }) {
    if (!mongoose.Types.ObjectId.isValid(campaignId) || !mongoose.Types.ObjectId.isValid(assignmentId)) {
      const err = new Error('Invalid ID format.');
      err.status = 400;
      throw err;
    }

    const assignment = await CampaignProspectAssignment.findOne({
      _id: assignmentId,
      campaignId,
      userId,
      websiteId
    }).populate('prospectId');

    if (!assignment) {
      const err = new Error('Assignment not found or unauthorized.');
      err.status = 404;
      throw err;
    }

    const domainName = assignment.prospectId?.prospectDomain || 'prospect';

    await CampaignProspectAssignment.deleteOne({ _id: assignmentId });

    // Log activity
    await this.recordActivity({
      userId,
      websiteId,
      campaignId,
      action: 'prospect_removed',
      description: `Removed ${domainName} from campaign.`,
      metadata: { domain: domainName }
    });

    return {
      success: true,
      deleted: true,
      message: `Removed ${domainName} from campaign. Original Phase 9 prospect preserved.`,
      id: assignmentId
    };
  }

  /**
   * Bulk update outreach status for multiple assigned prospects
   */
  async bulkUpdateAssignmentsStatus({ userId, websiteId, campaignId, assignmentIds = [], outreachStatus }) {
    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      const err = new Error('Invalid campaign ID format.');
      err.status = 400;
      throw err;
    }

    if (!OUTREACH_STATUSES.includes(outreachStatus)) {
      const err = new Error(`Invalid outreach status "${outreachStatus}".`);
      err.status = 400;
      throw err;
    }

    if (!Array.isArray(assignmentIds) || assignmentIds.length === 0) {
      const err = new Error('assignmentIds array is required.');
      err.status = 400;
      throw err;
    }

    const validIds = assignmentIds.filter((id) => mongoose.Types.ObjectId.isValid(id));

    const updatePayload = {
      $set: {
        outreachStatus
      }
    };

    if (outreachStatus === 'link_acquired') {
      updatePayload.$set.acquiredAt = new Date();
    } else if (outreachStatus === 'contacted') {
      updatePayload.$set.contactedAt = new Date();
    }

    const result = await CampaignProspectAssignment.updateMany(
      {
        _id: { $in: validIds },
        campaignId,
        userId,
        websiteId
      },
      updatePayload
    );

    await this.recordActivity({
      userId,
      websiteId,
      campaignId,
      action: 'outreach_status_updated',
      description: `Bulk updated ${result.modifiedCount} prospects to "${outreachStatus}".`,
      metadata: {
        outreachStatus,
        modifiedCount: result.modifiedCount
      }
    });

    return {
      success: true,
      message: `Updated outreach status for ${result.modifiedCount} prospects.`,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount
    };
  }

  /**
   * Retrieve chronological activity timeline for a campaign
   */
  async getCampaignActivities({ userId, websiteId, campaignId, limit = 50 }) {
    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      const err = new Error('Invalid campaign ID format.');
      err.status = 400;
      throw err;
    }

    const activities = await CampaignActivity.find({
      campaignId,
      userId,
      websiteId
    })
      .sort({ createdAt: -1 })
      .limit(Math.min(Math.max(1, parseInt(limit, 10) || 50), 100));

    return activities.map((a) => a.toSafeObject());
  }
}

export const campaignService = new CampaignService();
export default campaignService;
