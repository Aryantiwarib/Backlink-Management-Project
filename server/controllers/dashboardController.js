import { dashboardService } from '../services/dashboardService.js';
import { resolveUserWebsite } from '../utils/websiteResolver.js';
import Backlink from '../models/Backlink.js';
import SeoSnapshot from '../models/SeoSnapshot.js';

/**
 * GET /api/dashboard/:websiteId?
 * Primary unified dynamic dashboard endpoint.
 * Retrieves real database metrics, snapshot deltas, historical charts,
 * link attribute distribution, and recent backlinks for the active website.
 */
export const getDashboardData = async (req, res) => {
  try {
    const website = await resolveUserWebsite(req);

    const data = await dashboardService.getDashboardData({
      userId: req.user._id,
      websiteId: website._id
    });

    return res.status(200).json(data);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to retrieve dashboard data.'
    });
  }
};

/**
 * Legacy / compatibility endpoint: GET /api/dashboard/overview
 * Redirects to real database metrics
 */
export const getOverview = async (req, res) => {
  try {
    const website = await resolveUserWebsite(req);
    const data = await dashboardService.getDashboardData({
      userId: req.user._id,
      websiteId: website._id
    });

    return res.status(200).json({
      success: true,
      meta: {
        website: website.domain,
        timestamp: new Date().toISOString()
      },
      data: {
        totalBacklinks: data.metrics.totalBacklinks.current || 0,
        referringDomains: data.metrics.referringDomains.current || 0,
        domainAuthority: data.metrics.domainAuthority.current || 0,
        pageAuthority: data.metrics.pageAuthority.current || 0,
        spamScore: data.metrics.spamScore.current || 0,
        metrics: {
          totalBacklinksChange: data.metrics.totalBacklinks.percentChange || 0,
          referringDomainsChange: data.metrics.referringDomains.percentChange || 0,
          domainAuthorityChange: data.metrics.domainAuthority.absoluteChange || 0,
          pageAuthorityChange: data.metrics.pageAuthority.absoluteChange || 0
        },
        sparklines: data.sparklines || {},
        linkAttributes: data.linkAttributes?.distribution || []
      }
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to retrieve overview.'
    });
  }
};

/**
 * Legacy / compatibility endpoint: GET /api/dashboard/backlink-growth
 * Returns real historical snapshot points for charts
 */
export const getBacklinkGrowth = async (req, res) => {
  try {
    const website = await resolveUserWebsite(req);
    const snapshots = await SeoSnapshot.find({
      userId: req.user._id,
      websiteId: website._id
    })
      .sort({ snapshotDate: 1 })
      .limit(30)
      .lean();

    const chartPoints = snapshots.map((s) => ({
      date: new Date(s.snapshotDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      }),
      fullDate: s.snapshotDate,
      totalBacklinks: s.totalBacklinks || 0,
      referringDomains: s.referringDomains || 0,
      domainAuthority: s.domainAuthority || 0,
      pageAuthority: s.pageAuthority || 0
    }));

    return res.status(200).json({
      success: true,
      meta: {
        dataPoints: chartPoints.length
      },
      data: chartPoints
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to retrieve backlink growth.'
    });
  }
};

/**
 * Legacy / compatibility endpoint: GET /api/dashboard/recent-backlinks
 * Returns real recent backlinks from MongoDB
 */
export const getRecentBacklinks = async (req, res) => {
  try {
    const website = await resolveUserWebsite(req);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit, 10) || 5), 20);

    const backlinks = await Backlink.find({
      userId: req.user._id,
      websiteId: website._id
    })
      .sort({ fetchedAt: -1, _id: -1 })
      .limit(limit)
      .lean();

    const formatted = backlinks.map((b) => {
      let domainStr = '';
      try {
        const u = new URL(b.sourceUrl.startsWith('http') ? b.sourceUrl : `https://${b.sourceUrl}`);
        domainStr = u.hostname.replace(/^www\./, '');
      } catch (_) {
        domainStr = b.sourceUrl.split('/')[0] || b.sourceUrl;
      }

      return {
        id: b._id.toString(),
        domain: domainStr,
        sourceUrl: b.sourceUrl,
        sourcePath: b.sourceUrl.replace(/^https?:\/\/[^/]+/, '') || '/',
        targetUrl: b.targetUrl,
        anchorText: b.anchorText || 'No anchor text',
        domainRating: b.sourceDomainAuthority ?? null,
        type: b.linkType || 'unknown',
        status: b.status || 'Active',
        acquiredDate: new Date(b.fetchedAt || b.createdAt).toLocaleDateString()
      };
    });

    return res.status(200).json({
      success: true,
      meta: {
        total: formatted.length
      },
      data: formatted
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to retrieve recent backlinks.'
    });
  }
};

/**
 * GET /api/dashboard/recent-activity
 */
export const getRecentActivity = async (req, res) => {
  try {
    const website = await resolveUserWebsite(req);
    const data = await dashboardService.getDashboardData({
      userId: req.user._id,
      websiteId: website._id
    });

    return res.status(200).json({
      success: true,
      data: data.recentActivity || []
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve recent activity.'
    });
  }
};

/**
 * GET /api/dashboard/content-overview
 */
export const getContentOverview = async (req, res) => {
  try {
    const website = await resolveUserWebsite(req);
    const totalBacklinks = await Backlink.countDocuments({
      userId: req.user._id,
      websiteId: website._id
    });

    return res.status(200).json({
      success: true,
      data: {
        planned: 0,
        inProgress: 0,
        inReview: 0,
        published: totalBacklinks,
        monthlyGoal: {
          published: totalBacklinks,
          target: 20,
          percentage: Math.min(Math.round((totalBacklinks / 20) * 100), 100)
        }
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve content overview.'
    });
  }
};

/**
 * GET /api/dashboard/alerts
 */
export const getAlerts = async (req, res) => {
  try {
    const website = await resolveUserWebsite(req);
    const alerts = [];

    if (website.verificationStatus === 'pending') {
      alerts.push({
        id: 'alert-verification-pending',
        title: 'Domain verification is pending.',
        description: `Add TXT record to DNS for ${website.domain} to verify domain ownership.`,
        severity: 'warning',
        category: 'system',
        actionLabel: 'Verify Domain',
        targetRoute: '/websites'
      });
    }

    const latestSnap = await SeoSnapshot.findOne({
      userId: req.user._id,
      websiteId: website._id
    }).sort({ snapshotDate: -1 });

    if (!latestSnap) {
      alerts.push({
        id: 'alert-no-seo-data',
        title: 'No SEO snapshot recorded yet.',
        description: 'Fetch live metrics from Moz API to establish your baseline.',
        severity: 'info',
        category: 'backlinks',
        actionLabel: 'Fetch Metrics',
        targetRoute: '/seo-tools'
      });
    } else if (latestSnap.spamScore > 30) {
      alerts.push({
        id: 'alert-high-spam-score',
        title: `Elevated Spam Score detected (${latestSnap.spamScore}%).`,
        description: 'Review inbound referring domains and disavow toxic links.',
        severity: 'warning',
        category: 'backlinks',
        actionLabel: 'Inspect Spam Score',
        targetRoute: '/seo-tools'
      });
    }

    return res.status(200).json({
      success: true,
      data: alerts
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve alerts.'
    });
  }
};
