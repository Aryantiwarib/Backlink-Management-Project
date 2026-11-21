import { backlinkStorageService } from '../services/backlinkStorageService.js';
import { resolveUserWebsite } from '../utils/websiteResolver.js';
import Backlink from '../models/Backlink.js';

/**
 * GET /api/backlinks
 * Retrieve saved backlinks for a website with pagination, search, and linkType filtering
 * Enforces strict user ownership of the website.
 */
export const getSavedBacklinks = async (req, res) => {
  try {
    const website = await resolveUserWebsite(req);
    const {
      page,
      limit,
      search,
      linkType,
      sourceDomain,
      targetUrl,
      provider,
      status,
      sortBy,
      sortOrder
    } = req.query;

    const result = await backlinkStorageService.getSavedBacklinks({
      userId: req.user._id,
      websiteId: website._id,
      page,
      limit,
      search,
      linkType,
      sourceDomain,
      targetUrl,
      provider,
      status,
      sortBy,
      sortOrder
    });

    return res.status(200).json({
      success: true,
      website: {
        id: website._id.toString(),
        name: website.name,
        domain: website.domain
      },
      ...result
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to retrieve saved backlinks.'
    });
  }
};

/**
 * GET /api/backlinks/stats
 * Retrieve aggregated statistics for saved backlinks (totals, unique domains, dofollow ratio)
 */
export const getBacklinkStats = async (req, res) => {
  try {
    const website = await resolveUserWebsite(req);

    const stats = await backlinkStorageService.getBacklinkStats({
      userId: req.user._id,
      websiteId: website._id
    });

    return res.status(200).json({
      success: true,
      website: {
        id: website._id.toString(),
        name: website.name,
        domain: website.domain
      },
      data: stats
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to retrieve backlink statistics.'
    });
  }
};

/**
 * GET /api/backlinks/analysis
 * Retrieve deep backlink analysis & aggregations for visualization
 */
export const getBacklinkAnalysis = async (req, res) => {
  try {
    const website = await resolveUserWebsite(req);

    const analysis = await backlinkStorageService.getBacklinkAnalysis({
      userId: req.user._id,
      websiteId: website._id
    });

    return res.status(200).json({
      success: true,
      website: {
        id: website._id.toString(),
        name: website.name,
        domain: website.domain
      },
      data: analysis
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to retrieve backlink analysis.'
    });
  }
};

/**
 * GET /api/backlinks/:id
 * Retrieve details for a single backlink ensuring user ownership
 */
export const getBacklinkById = async (req, res) => {
  try {
    const { id } = req.params;
    const backlink = await backlinkStorageService.getBacklinkById({
      userId: req.user._id,
      backlinkId: id
    });

    return res.status(200).json({
      success: true,
      data: backlink
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to retrieve backlink details.'
    });
  }
};

/**
 * POST /api/backlinks
 * Create or upsert a backlink manually (or via batch sync)
 */
export const createBacklink = async (req, res) => {
  try {
    const website = await resolveUserWebsite(req);
    const { sourceUrl, targetUrl, anchorText, linkType, sourceDomainAuthority, sourcePageAuthority } = req.body;

    if (!sourceUrl || !targetUrl) {
      return res.status(400).json({
        success: false,
        message: 'Both sourceUrl (linking page) and targetUrl (landing page) are required.'
      });
    }

    const result = await backlinkStorageService.saveBacklinks({
      userId: req.user._id,
      websiteId: website._id,
      backlinksList: [
        {
          sourceUrl,
          targetUrl,
          anchorText,
          linkType: linkType || 'unknown',
          sourceDomainAuthority,
          sourcePageAuthority,
          firstSeen: new Date(),
          lastSeen: new Date(),
          provider: 'manual'
        }
      ],
      provider: 'manual'
    });

    return res.status(201).json({
      success: true,
      message: 'Backlink record successfully saved to database.',
      website: {
        id: website._id.toString(),
        domain: website.domain
      },
      result
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to create backlink record.'
    });
  }
};

/**
 * DELETE /api/backlinks/:id
 * Delete a saved backlink record ensuring ownership
 */
export const deleteBacklink = async (req, res) => {
  try {
    const { id } = req.params;

    const backlink = await Backlink.findOneAndDelete({
      _id: id,
      userId: req.user._id
    });

    if (!backlink) {
      return res.status(404).json({
        success: false,
        message: 'Backlink record not found or access denied.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Backlink record successfully deleted.'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete backlink.'
    });
  }
};
