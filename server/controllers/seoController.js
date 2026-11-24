import { seoService } from '../services/seo/seoService.js';
import { backlinkStorageService } from '../services/backlinkStorageService.js';
import { resolveUserWebsite } from '../utils/websiteResolver.js';

export { resolveUserWebsite };

/**
 * Check provider integration status
 * GET /api/seo/provider-status
 */
export const getProviderStatus = (req, res) => {
  try {
    const status = seoService.getProviderStatus();
    return res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error fetching SEO provider status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve SEO provider status.'
    });
  }
};

/**
 * Fetch SEO overview for the active/selected website and persist to MongoDB
 * GET /api/seo/overview
 */
export const getOverview = async (req, res) => {
  try {
    const website = await resolveUserWebsite(req);
    const forceRefresh = req.query.force === 'true';

    // 1. Fetch normalized metrics from active provider (or in-memory cache)
    const result = await seoService.getOverview(website.domain, { forceRefresh });

    // 2. Persist to MongoDB (SeoSnapshot & Backlinks)
    let storage = {
      snapshotSaved: false,
      backlinksSaved: 0
    };

    try {
      // Save SEO snapshot in MongoDB (handles duplicate prevention)
      const snapshotResult = await backlinkStorageService.saveSnapshot({
        userId: req.user._id,
        websiteId: website._id,
        domain: website.domain,
        seoData: result,
        provider: result.providerId || 'moz'
      });

      // Also attempt to fetch and persist individual backlink rows if provider provides them
      let backlinkRows = [];
      try {
        backlinkRows = await seoService.fetchBacklinks(website.domain, { limit: 50 });
      } catch (linkErr) {
        // Individual link rows may be restricted on some free tiers; this does not invalidate the snapshot
        console.warn(`[SEO Overview] Row-level link fetch warning: ${linkErr.message}`);
      }

      let backlinkSaveResult = { upsertedCount: 0, totalProcessed: 0 };
      if (Array.isArray(backlinkRows) && backlinkRows.length > 0) {
        backlinkSaveResult = await backlinkStorageService.saveBacklinks({
          userId: req.user._id,
          websiteId: website._id,
          backlinksList: backlinkRows,
          provider: result.providerId || 'moz'
        });
      }

      storage = {
        snapshotSaved: true,
        snapshotId: snapshotResult.snapshot?.id || snapshotResult.snapshot?._id,
        snapshotDate: snapshotResult.snapshot?.snapshotDate,
        isNewSnapshot: snapshotResult.isNew,
        updatedExistingSnapshot: snapshotResult.updatedExisting,
        backlinksSaved: backlinkSaveResult.upsertedCount,
        totalProcessedBacklinks: backlinkSaveResult.totalProcessed
      };
    } catch (storageError) {
      // Log DB failure without failing the user's data presentation
      console.error('[SEO Overview] Database storage error:', storageError.message);
      storage.storageError = storageError.message;
    }

    return res.status(200).json({
      ...result,
      website: {
        id: website._id.toString(),
        name: website.name,
        domain: website.domain,
        verificationStatus: website.verificationStatus
      },
      storage
    });
  } catch (error) {
    return handleSeoError(error, res);
  }
};

/**
 * Fetch domain-level metrics
 * GET /api/seo/domain-metrics
 */
export const getDomainMetrics = async (req, res) => {
  try {
    const website = await resolveUserWebsite(req);
    const forceRefresh = req.query.force === 'true';

    const result = await seoService.getDomainMetrics(website.domain, { forceRefresh });

    return res.status(200).json({
      ...result,
      website: {
        id: website._id.toString(),
        name: website.name,
        domain: website.domain,
        verificationStatus: website.verificationStatus
      }
    });
  } catch (error) {
    return handleSeoError(error, res);
  }
};

/**
 * Fetch detailed backlink summary
 * GET /api/seo/backlink-summary
 */
export const getBacklinkSummary = async (req, res) => {
  try {
    const website = await resolveUserWebsite(req);
    const forceRefresh = req.query.force === 'true';

    const result = await seoService.getBacklinkSummary(website.domain, { forceRefresh });

    return res.status(200).json({
      ...result,
      website: {
        id: website._id.toString(),
        name: website.name,
        domain: website.domain,
        verificationStatus: website.verificationStatus
      }
    });
  } catch (error) {
    return handleSeoError(error, res);
  }
};

/**
 * Retrieve the latest saved SEO snapshot from MongoDB
 * GET /api/seo/snapshots/latest
 */
export const getLatestSnapshot = async (req, res) => {
  try {
    const website = await resolveUserWebsite(req);

    const snapshot = await backlinkStorageService.getLatestSnapshot({
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
      data: snapshot
    });
  } catch (error) {
    return handleSeoError(error, res);
  }
};

/**
 * Retrieve historical SEO snapshots for growth charts / comparisons
 * GET /api/seo/snapshots/history
 */
export const getSnapshotHistory = async (req, res) => {
  try {
    const website = await resolveUserWebsite(req);
    const { limit, startDate, endDate } = req.query;

    const snapshots = await backlinkStorageService.getSnapshotHistory({
      userId: req.user._id,
      websiteId: website._id,
      limit,
      startDate,
      endDate
    });

    return res.status(200).json({
      success: true,
      website: {
        id: website._id.toString(),
        name: website.name,
        domain: website.domain
      },
      count: snapshots.length,
      data: snapshots
    });
  } catch (error) {
    return handleSeoError(error, res);
  }
};

/**
 * Trigger an explicit live SEO fetch and save snapshot & backlinks
 * POST /api/seo/sync
 */
export const syncSeoData = async (req, res) => {
  try {
    const website = await resolveUserWebsite(req);

    // Bypass in-memory cache to guarantee a fresh live provider query
    const overview = await seoService.getOverview(website.domain, { forceRefresh: true });

    // Save snapshot
    const snapshotResult = await backlinkStorageService.saveSnapshot({
      userId: req.user._id,
      websiteId: website._id,
      domain: website.domain,
      seoData: overview,
      provider: overview.providerId || 'moz'
    });

    // Fetch and save backlinks
    let backlinkRows = [];
    let backlinkWarning = null;
    try {
      backlinkRows = await seoService.fetchBacklinks(website.domain, { limit: 50 });
    } catch (e) {
      console.warn(`[Sync SEO] Backlink row fetch note: ${e.message}`);
      backlinkWarning = e.message;
    }

    const backlinkSaveResult = await backlinkStorageService.saveBacklinks({
      userId: req.user._id,
      websiteId: website._id,
      backlinksList: backlinkRows,
      provider: overview.providerId || 'moz'
    });

    return res.status(200).json({
      success: true,
      message: `Successfully synchronized SEO data and backlinks for ${website.domain}.`,
      website: {
        id: website._id.toString(),
        name: website.name,
        domain: website.domain
      },
      snapshot: snapshotResult.snapshot,
      backlinksSaved: backlinkSaveResult.upsertedCount,
      totalProcessedBacklinks: backlinkSaveResult.totalProcessed,
      backlinkWarning,
      overview
    });
  } catch (error) {
    return handleSeoError(error, res);
  }
};

/**
 * Standardized SEO Error Handler
 */
function handleSeoError(error, res) {
  const status = error.status || 500;
  console.error(`[SEO API Error] (${status}):`, error.message);

  if (error.code === 'PROVIDER_UNCONFIGURED') {
    const isMoz = (process.env.SEO_PROVIDER || 'moz').toLowerCase() === 'moz';
    return res.status(503).json({
      success: false,
      code: 'PROVIDER_UNCONFIGURED',
      message: error.message,
      setup: error.setup || (isMoz
        ? {
            provider: 'Moz API',
            requiredEnvVars: ['MOZ_API_TOKEN', 'SEO_PROVIDER'],
            signupUrl: 'https://moz.com/api/dashboard',
            docsUrl: 'https://moz.com/api/docs'
          }
        : {
            provider: 'DataForSEO',
            requiredEnvVars: ['DATAFORSEO_LOGIN', 'DATAFORSEO_PASSWORD'],
            signupUrl: 'https://app.dataforseo.com/register',
            docsUrl: 'https://docs.dataforseo.com/v3/backlinks/summary/live/'
          })
    });
  }

  if (error.code === 'PROVIDER_AUTH_FAILED') {
    return res.status(401).json({
      success: false,
      code: 'PROVIDER_AUTH_FAILED',
      message: error.message
    });
  }

  if (error.code === 'PROVIDER_INSUFFICIENT_FUNDS') {
    return res.status(402).json({
      success: false,
      code: 'PROVIDER_INSUFFICIENT_FUNDS',
      message: error.message
    });
  }

  if (error.code === 'PROVIDER_RATE_LIMIT' || error.code === 'RATE_LIMIT_COOLDOWN') {
    return res.status(429).json({
      success: false,
      code: error.code,
      message: error.message
    });
  }

  return res.status(status).json({
    success: false,
    code: error.code || 'SEO_REQUEST_FAILED',
    message: error.message || 'An unexpected error occurred while processing SEO request.'
  });
}
