import mongoose from 'mongoose';
import Website from '../models/Website.js';
import { campaignService } from '../services/campaignService.js';

/**
 * Validate that websiteId is valid and belongs to the authenticated user
 */
async function validateWebsite(websiteId, userId) {
  if (!websiteId || !mongoose.Types.ObjectId.isValid(websiteId)) {
    const err = new Error('Invalid website ID format.');
    err.status = 400;
    throw err;
  }

  const website = await Website.findOne({ _id: websiteId, userId });
  if (!website) {
    const err = new Error('Website not found or does not belong to the authenticated user.');
    err.status = 404;
    throw err;
  }
  return website;
}

/**
 * POST /api/campaigns/:websiteId
 * Create a new campaign
 */
export async function createCampaign(req, res, next) {
  try {
    const userId = req.user._id;
    const { websiteId } = req.params;

    await validateWebsite(websiteId, userId);

    const campaign = await campaignService.createCampaign({
      userId,
      websiteId,
      campaignData: req.body
    });

    return res.status(201).json({
      success: true,
      message: 'Campaign created successfully.',
      campaign
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/campaigns/:websiteId
 * List campaigns for website with search, filter and pagination
 */
export async function getCampaigns(req, res, next) {
  try {
    const userId = req.user._id;
    const { websiteId } = req.params;
    const { page, limit, search, status, campaignType, sortBy, sortOrder } = req.query;

    await validateWebsite(websiteId, userId);

    const result = await campaignService.getCampaigns({
      userId,
      websiteId,
      page,
      limit,
      search,
      status,
      campaignType,
      sortBy,
      sortOrder
    });

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/campaigns/:websiteId/stats
 * Aggregate dashboard stats for campaigns of website
 */
export async function getCampaignStats(req, res, next) {
  try {
    const userId = req.user._id;
    const { websiteId } = req.params;

    await validateWebsite(websiteId, userId);

    const stats = await campaignService.getCampaignStats({ userId, websiteId });

    return res.status(200).json({
      success: true,
      stats
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/campaigns/:websiteId/:campaignId
 * Fetch single campaign details with status breakdown
 */
export async function getCampaignById(req, res, next) {
  try {
    const userId = req.user._id;
    const { websiteId, campaignId } = req.params;

    await validateWebsite(websiteId, userId);

    const campaign = await campaignService.getCampaignById({
      userId,
      websiteId,
      campaignId
    });

    return res.status(200).json({
      success: true,
      campaign
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/campaigns/:websiteId/:campaignId
 * Update campaign details
 */
export async function updateCampaign(req, res, next) {
  try {
    const userId = req.user._id;
    const { websiteId, campaignId } = req.params;

    await validateWebsite(websiteId, userId);

    const campaign = await campaignService.updateCampaign({
      userId,
      websiteId,
      campaignId,
      updateData: req.body
    });

    return res.status(200).json({
      success: true,
      message: 'Campaign updated successfully.',
      campaign
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/campaigns/:websiteId/:campaignId/status
 * Transition campaign lifecycle status
 */
export async function updateCampaignStatus(req, res, next) {
  try {
    const userId = req.user._id;
    const { websiteId, campaignId } = req.params;
    const { status } = req.body;

    await validateWebsite(websiteId, userId);

    const campaign = await campaignService.updateCampaignStatus({
      userId,
      websiteId,
      campaignId,
      status
    });

    return res.status(200).json({
      success: true,
      message: `Campaign status updated to ${status}.`,
      campaign
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/campaigns/:websiteId/:campaignId
 * Delete campaign and associated assignments
 */
export async function deleteCampaign(req, res, next) {
  try {
    const userId = req.user._id;
    const { websiteId, campaignId } = req.params;

    await validateWebsite(websiteId, userId);

    const result = await campaignService.deleteCampaign({
      userId,
      websiteId,
      campaignId
    });

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/campaigns/:websiteId/:campaignId/prospects
 * Assign Phase 9 prospects to campaign
 */
export async function assignProspects(req, res, next) {
  try {
    const userId = req.user._id;
    const { websiteId, campaignId } = req.params;
    const { prospectIds, notes } = req.body;

    await validateWebsite(websiteId, userId);

    const result = await campaignService.assignProspects({
      userId,
      websiteId,
      campaignId,
      prospectIds,
      notes
    });

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/campaigns/:websiteId/:campaignId/prospects
 * List assigned prospects with outreach status and metrics
 */
export async function getCampaignProspects(req, res, next) {
  try {
    const userId = req.user._id;
    const { websiteId, campaignId } = req.params;
    const { page, limit, search, outreachStatus, contactFilter, sortBy, sortOrder } = req.query;

    await validateWebsite(websiteId, userId);

    const result = await campaignService.getCampaignProspects({
      userId,
      websiteId,
      campaignId,
      page,
      limit,
      search,
      outreachStatus,
      contactFilter,
      sortBy,
      sortOrder
    });

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/campaigns/:websiteId/:campaignId/prospects/:assignmentId
 * Update outreach status or notes for an assigned prospect
 */
export async function updateAssignment(req, res, next) {
  try {
    const userId = req.user._id;
    const { websiteId, campaignId, assignmentId } = req.params;

    await validateWebsite(websiteId, userId);

    const assignment = await campaignService.updateAssignment({
      userId,
      websiteId,
      campaignId,
      assignmentId,
      updateData: req.body
    });

    return res.status(200).json({
      success: true,
      message: 'Prospect assignment updated.',
      assignment
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/campaigns/:websiteId/:campaignId/prospects/:assignmentId
 * Remove prospect from campaign without deleting original Phase 9 prospect
 */
export async function removeAssignment(req, res, next) {
  try {
    const userId = req.user._id;
    const { websiteId, campaignId, assignmentId } = req.params;

    await validateWebsite(websiteId, userId);

    const result = await campaignService.removeAssignment({
      userId,
      websiteId,
      campaignId,
      assignmentId
    });

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/campaigns/:websiteId/:campaignId/prospects/bulk-status
 * Bulk update outreach status for multiple assigned prospects
 */
export async function bulkUpdateAssignmentsStatus(req, res, next) {
  try {
    const userId = req.user._id;
    const { websiteId, campaignId } = req.params;
    const { assignmentIds, outreachStatus } = req.body;

    await validateWebsite(websiteId, userId);

    const result = await campaignService.bulkUpdateAssignmentsStatus({
      userId,
      websiteId,
      campaignId,
      assignmentIds,
      outreachStatus
    });

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/campaigns/:websiteId/:campaignId/activities
 * Retrieve chronological activity timeline
 */
export async function getCampaignActivities(req, res, next) {
  try {
    const userId = req.user._id;
    const { websiteId, campaignId } = req.params;
    const { limit } = req.query;

    await validateWebsite(websiteId, userId);

    const activities = await campaignService.getCampaignActivities({
      userId,
      websiteId,
      campaignId,
      limit
    });

    return res.status(200).json({
      success: true,
      activities
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/campaigns/:websiteId/:campaignId/prospects/:assignmentId/contact
 * Add, edit, or remove contact emails for an assigned prospect
 */
export async function updateProspectContact(req, res, next) {
  try {
    const userId = req.user._id;
    const { websiteId, campaignId, assignmentId } = req.params;

    await validateWebsite(websiteId, userId);

    const result = await campaignService.updateProspectContact({
      userId,
      websiteId,
      campaignId,
      assignmentId,
      contactData: req.body
    });

    return res.status(200).json({
      success: true,
      message: 'Prospect contact information updated.',
      ...result
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/campaigns/:websiteId/:campaignId/discover
 * Run or re-run automated discovery for a campaign
 */
export async function runDiscovery(req, res, next) {
  try {
    const userId = req.user._id;
    const { websiteId, campaignId } = req.params;

    await validateWebsite(websiteId, userId);

    const result = await campaignService.runDiscovery({
      userId,
      websiteId,
      campaignId
    });

    return res.status(200).json({
      success: true,
      message: 'Campaign discovery process completed.',
      ...result
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/campaigns/:websiteId/:campaignId/contact-discovery
 * Run or re-run automated contact discovery for a campaign
 */
export async function runContactDiscovery(req, res, next) {
  try {
    const userId = req.user._id;
    const { websiteId, campaignId } = req.params;
    const { forceRetry } = req.body || {};

    await validateWebsite(websiteId, userId);

    const result = await campaignService.runContactDiscovery({
      userId,
      websiteId,
      campaignId,
      forceRetry: Boolean(forceRetry)
    });

    return res.status(200).json({
      success: true,
      message: result.message || 'Contact discovery process initiated.',
      ...result
    });
  } catch (err) {
    next(err);
  }
}
