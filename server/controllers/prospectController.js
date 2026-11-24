import mongoose from 'mongoose';
import Website from '../models/Website.js';
import { discoveryService } from '../services/discovery/discoveryService.js';
import { prospectService } from '../services/discovery/prospectService.js';

/**
 * Validate website ownership helper
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
 * GET /api/prospects/discovery/status
 */
export async function getDiscoveryStatus(req, res, next) {
  try {
    const status = discoveryService.getDiscoveryStatus();
    return res.status(200).json({
      success: true,
      status
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/prospects/:websiteId/discover/competitor
 */
export async function discoverCompetitors(req, res, next) {
  try {
    const userId = req.user._id;
    const { websiteId } = req.params;
    const { competitorDomains, limit } = req.body;

    await validateWebsite(websiteId, userId);

    const result = await discoveryService.discoverCompetitorProspects({
      userId,
      websiteId,
      competitorDomains: Array.isArray(competitorDomains)
        ? competitorDomains
        : typeof competitorDomains === 'string'
        ? competitorDomains.split(',').map((d) => d.trim()).filter(Boolean)
        : [],
      limit: parseInt(limit, 10) || 30
    });

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/prospects/:websiteId/discover/keyword
 */
export async function discoverKeywords(req, res, next) {
  try {
    const userId = req.user._id;
    const { websiteId } = req.params;
    const { keyword, limit } = req.body;

    await validateWebsite(websiteId, userId);

    const result = await discoveryService.discoverKeywordProspects({
      userId,
      websiteId,
      keyword,
      limit: parseInt(limit, 10) || 20
    });

    return res.status(200).json(result);
  } catch (err) {
    if (err.code === 'DISCOVERY_PROVIDER_UNCONFIGURED') {
      return res.status(503).json({
        success: false,
        code: 'DISCOVERY_PROVIDER_UNCONFIGURED',
        message: err.message,
        details: err.details
      });
    }
    next(err);
  }
}

/**
 * POST /api/prospects/:websiteId/enrich
 */
export async function enrichDomain(req, res, next) {
  try {
    const userId = req.user._id;
    const { websiteId } = req.params;
    const { domain } = req.body;

    await validateWebsite(websiteId, userId);

    const result = await discoveryService.enrichDomain({
      userId,
      websiteId,
      domain
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
 * POST /api/prospects/:websiteId
 * Save a single prospect
 */
export async function saveProspect(req, res, next) {
  try {
    const userId = req.user._id;
    const { websiteId } = req.params;

    await validateWebsite(websiteId, userId);

    const result = await prospectService.saveProspect({
      userId,
      websiteId,
      prospectData: req.body
    });

    return res.status(200).json({
      success: true,
      message: result.isNew ? 'Prospect saved successfully.' : 'Prospect updated.',
      ...result
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/prospects/:websiteId/bulk-save
 */
export async function bulkSaveProspects(req, res, next) {
  try {
    const userId = req.user._id;
    const { websiteId } = req.params;
    const { prospectsList } = req.body;

    await validateWebsite(websiteId, userId);

    const result = await prospectService.bulkSave({
      userId,
      websiteId,
      prospectsList: Array.isArray(prospectsList) ? prospectsList : []
    });

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/prospects/:websiteId
 * Retrieve saved prospects with search, filters, sorting, and pagination
 */
export async function getSavedProspects(req, res, next) {
  try {
    const userId = req.user._id;
    const { websiteId } = req.params;
    const {
      page,
      limit,
      search,
      status,
      source,
      minDA,
      maxDA,
      minScore,
      maxScore,
      sortBy,
      sortOrder
    } = req.query;

    await validateWebsite(websiteId, userId);

    const result = await prospectService.getSavedProspects({
      userId,
      websiteId,
      page,
      limit,
      search,
      status,
      source,
      minDA,
      maxDA,
      minScore,
      maxScore,
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
 * GET /api/prospects/:websiteId/stats
 */
export async function getStats(req, res, next) {
  try {
    const userId = req.user._id;
    const { websiteId } = req.params;

    await validateWebsite(websiteId, userId);

    const stats = await prospectService.getStats({ userId, websiteId });

    return res.status(200).json({
      success: true,
      stats
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/prospects/:websiteId/:prospectId
 */
export async function getProspectById(req, res, next) {
  try {
    const userId = req.user._id;
    const { websiteId, prospectId } = req.params;

    await validateWebsite(websiteId, userId);

    const prospect = await prospectService.getProspectById({
      userId,
      websiteId,
      prospectId
    });

    return res.status(200).json({
      success: true,
      prospect
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/prospects/:websiteId/:prospectId
 */
export async function updateProspect(req, res, next) {
  try {
    const userId = req.user._id;
    const { websiteId, prospectId } = req.params;
    const { status, notes, tags, contactEmail } = req.body;

    await validateWebsite(websiteId, userId);

    const prospect = await prospectService.updateProspect({
      userId,
      websiteId,
      prospectId,
      status,
      notes,
      tags,
      contactEmail
    });

    return res.status(200).json({
      success: true,
      message: 'Prospect updated successfully.',
      prospect
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/prospects/:websiteId/:prospectId
 */
export async function deleteProspect(req, res, next) {
  try {
    const userId = req.user._id;
    const { websiteId, prospectId } = req.params;

    await validateWebsite(websiteId, userId);

    const result = await prospectService.deleteProspect({
      userId,
      websiteId,
      prospectId
    });

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/prospects/:websiteId/bulk-update
 */
export async function bulkUpdateStatus(req, res, next) {
  try {
    const userId = req.user._id;
    const { websiteId } = req.params;
    const { prospectIds, status } = req.body;

    await validateWebsite(websiteId, userId);

    const result = await prospectService.bulkUpdateStatus({
      userId,
      websiteId,
      prospectIds,
      status
    });

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/prospects/:websiteId/bulk-delete
 */
export async function bulkDelete(req, res, next) {
  try {
    const userId = req.user._id;
    const { websiteId } = req.params;
    const { prospectIds } = req.body;

    await validateWebsite(websiteId, userId);

    const result = await prospectService.bulkDelete({
      userId,
      websiteId,
      prospectIds
    });

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/prospects/:websiteId/export/csv
 */
export async function exportCsv(req, res, next) {
  try {
    const userId = req.user._id;
    const { websiteId } = req.params;
    const { search, status, source } = req.query;

    const website = await validateWebsite(websiteId, userId);

    const csvData = await prospectService.exportCsv({
      userId,
      websiteId,
      search,
      status,
      source
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="linkora-prospects-${website.domain}-${new Date().toISOString().split('T')[0]}.csv"`
    );
    return res.status(200).send(csvData);
  } catch (err) {
    next(err);
  }
}
