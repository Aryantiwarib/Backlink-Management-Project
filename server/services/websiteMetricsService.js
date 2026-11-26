import mongoose from 'mongoose';
import Website from '../models/Website.js';
import Backlink from '../models/Backlink.js';
import SeoSnapshot from '../models/SeoSnapshot.js';
import MonitoringEvent from '../models/MonitoringEvent.js';
import MonitoringScan from '../models/MonitoringScan.js';

/**
 * WebsiteMetricsService
 * Single Authoritative Source of Truth for Backlink and SEO Metrics across LINKORA.
 *
 * Powers both the Dashboard and the AI Assistant tools with unified, consistent data
 * and explicit separation between:
 * 1. Moz Global Web Index Snapshot metrics (external backlinks across the web, root domains, Moz DA/PA, Spam Score).
 * 2. Granular Database-Indexed Backlink records (individual rows saved in MongoDB, dofollow ratio, average source DA).
 */
export class WebsiteMetricsService {
  /**
   * Helper to resolve and verify website authorization for a user
   */
  async resolveWebsite(userId, websiteId) {
    if (!userId) {
      throw new Error('User ID is required.');
    }

    const query = { userId };
    if (websiteId) {
      if (mongoose.Types.ObjectId.isValid(websiteId)) {
        query._id = websiteId;
      } else {
        query.domain = websiteId.toLowerCase().trim();
      }
    }

    let website = await Website.findOne(query).lean();
    if (!website && !websiteId) {
      // Fallback to latest active website
      website = await Website.findOne({ userId }).sort({ createdAt: -1 }).lean();
    }

    return website;
  }

  /**
   * 1. Get Website Backlink Summary
   * Authoritative summary powering both Dashboard and AI Assistant getBacklinkSummary tool.
   */
  async getWebsiteBacklinkSummary({ userId, websiteId }) {
    const website = await this.resolveWebsite(userId, websiteId);
    if (!website) {
      return {
        success: false,
        message: 'No website found or access denied for this user.'
      };
    }

    const siteId = website._id;
    const userObjId = new mongoose.Types.ObjectId(userId);
    const siteObjId = new mongoose.Types.ObjectId(siteId);

    // Parallel retrieval: Latest snapshot, historical snapshot for delta, and DB backlink aggregations
    const [
      snapshots,
      totalSavedBacklinks,
      dofollowCount,
      nofollowCount,
      distinctDomains,
      avgMetricsAgg,
      topAnchorsAgg,
      topDomainsAgg,
      latestSavedBacklink
    ] = await Promise.all([
      // 1. Latest 2 snapshots for baseline & delta comparison
      SeoSnapshot.find({ userId: userObjId, websiteId: siteObjId })
        .sort({ snapshotDate: -1 })
        .limit(2)
        .lean(),

      // 2. Total saved rows in MongoDB
      Backlink.countDocuments({ userId: userObjId, websiteId: siteObjId }),

      // 3. Dofollow rows
      Backlink.countDocuments({ userId: userObjId, websiteId: siteObjId, linkType: 'dofollow' }),

      // 4. Nofollow rows
      Backlink.countDocuments({ userId: userObjId, websiteId: siteObjId, linkType: 'nofollow' }),

      // 5. Distinct referring domains in MongoDB
      Backlink.distinct('sourceDomain', {
        userId: userObjId,
        websiteId: siteObjId,
        sourceDomain: { $ne: '' }
      }),

      // 6. Average source DA and PA across saved referring records
      Backlink.aggregate([
        {
          $match: {
            userId: userObjId,
            websiteId: siteObjId,
            sourceDomainAuthority: { $ne: null }
          }
        },
        {
          $group: {
            _id: null,
            avgDA: { $avg: '$sourceDomainAuthority' },
            avgPA: { $avg: '$sourcePageAuthority' }
          }
        }
      ]),

      // 7. Top anchor texts
      Backlink.aggregate([
        {
          $match: {
            userId: userObjId,
            websiteId: siteObjId,
            anchorText: { $exists: true, $ne: '' }
          }
        },
        { $group: { _id: '$anchorText', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),

      // 8. Top referring domains
      Backlink.aggregate([
        {
          $match: {
            userId: userObjId,
            websiteId: siteObjId,
            sourceDomain: { $exists: true, $ne: '' }
          }
        },
        {
          $group: {
            _id: '$sourceDomain',
            count: { $sum: 1 },
            maxDA: { $max: '$sourceDomainAuthority' },
            avgDA: { $avg: '$sourceDomainAuthority' },
            dofollowCount: {
              $sum: { $cond: [{ $eq: ['$linkType', 'dofollow'] }, 1, 0] }
            },
            nofollowCount: {
              $sum: { $cond: [{ $eq: ['$linkType', 'nofollow'] }, 1, 0] }
            }
          }
        },
        { $sort: { count: -1, maxDA: -1 } },
        { $limit: 10 }
      ]),

      // 9. Latest fetched timestamp
      Backlink.findOne({ userId: userObjId, websiteId: siteObjId })
        .sort({ fetchedAt: -1 })
        .select('fetchedAt createdAt')
        .lean()
    ]);

    const latestSnapshot = snapshots && snapshots.length > 0 ? snapshots[0] : null;
    const previousSnapshot = snapshots && snapshots.length > 1 ? snapshots[1] : null;

    // Calculations for saved database records
    const otherCount = Math.max(0, totalSavedBacklinks - (dofollowCount + nofollowCount));
    const dofollowRatio =
      totalSavedBacklinks > 0 ? Math.round((dofollowCount / totalSavedBacklinks) * 100) : 0;
    const avgSourceDA =
      avgMetricsAgg && avgMetricsAgg[0]?.avgDA !== undefined && avgMetricsAgg[0]?.avgDA !== null
        ? Math.round(avgMetricsAgg[0].avgDA)
        : null;
    const avgSourcePA =
      avgMetricsAgg && avgMetricsAgg[0]?.avgPA !== undefined && avgMetricsAgg[0]?.avgPA !== null
        ? Math.round(avgMetricsAgg[0].avgPA)
        : null;

    const formattedAnchors = topAnchorsAgg.map((a) => ({
      anchorText: a._id,
      occurrences: a.count,
      percentage:
        totalSavedBacklinks > 0 ? Math.round((a.count / totalSavedBacklinks) * 1000) / 10 : 0
    }));

    const formattedDomains = topDomainsAgg.map((d) => ({
      domain: d._id,
      backlinksCount: d.count,
      domainAuthority: d.maxDA ?? null,
      avgDA: d.avgDA ? Math.round(d.avgDA) : null,
      dofollowCount: d.dofollowCount,
      nofollowCount: d.nofollowCount
    }));

    // Authoritative totals:
    // If a Moz SeoSnapshot is present, the primary totalBacklinks and referringDomains
    // represent the Moz global crawl index (matching the Dashboard's primary KPI cards).
    // If no snapshot is recorded, fallback gracefully to the database-indexed row count.
    const authoritativeTotalBacklinks =
      latestSnapshot && latestSnapshot.totalBacklinks !== null && latestSnapshot.totalBacklinks !== undefined
        ? latestSnapshot.totalBacklinks
        : totalSavedBacklinks;

    const authoritativeReferringDomains =
      latestSnapshot && latestSnapshot.referringDomains !== null && latestSnapshot.referringDomains !== undefined
        ? latestSnapshot.referringDomains
        : (distinctDomains?.length || 0);

    const websiteDA = latestSnapshot?.domainAuthority ?? null;
    const websitePA = latestSnapshot?.pageAuthority ?? null;
    const websiteSpamScore = latestSnapshot?.spamScore ?? null;

    return {
      success: true,
      domain: website.domain,
      website: {
        id: website._id.toString(),
        name: website.name,
        domain: website.domain,
        url: website.url,
        verificationStatus: website.verificationStatus,
        verifiedAt: website.verifiedAt,
        registeredAt: website.createdAt
      },

      // Primary authoritative numbers (100% consistent with Dashboard top KPI summary)
      totalBacklinks: authoritativeTotalBacklinks,
      referringDomains: authoritativeReferringDomains,
      domainAuthority: websiteDA,
      pageAuthority: websitePA,
      spamScore: websiteSpamScore,

      // Dual-tier explicit metric breakdown
      mozIndexMetrics: {
        hasData: Boolean(latestSnapshot),
        totalBacklinks: latestSnapshot?.totalBacklinks ?? null,
        referringDomains: latestSnapshot?.referringDomains ?? null,
        domainAuthority: websiteDA,
        pageAuthority: websitePA,
        spamScore: websiteSpamScore,
        snapshotDate: latestSnapshot?.snapshotDate ?? null,
        provider: latestSnapshot?.provider || 'moz',
        description:
          'Moz API global web index metrics representing all external backlink occurrences across the web.'
      },

      databaseRecords: {
        totalSavedBacklinks,
        uniqueReferringDomains: distinctDomains?.length || 0,
        dofollowCount,
        nofollowCount,
        otherCount,
        dofollowPercentage: dofollowRatio,
        dofollowRatio,
        averageSourceDomainAuthority: avgSourceDA,
        averageSourcePageAuthority: avgSourcePA,
        latestFetchedAt: latestSavedBacklink?.fetchedAt || latestSavedBacklink?.createdAt || null,
        description:
          'Granular backlink records saved in the LINKORA MongoDB database for detailed inspection and tracking.'
      },

      // Legacy compatibility fields to ensure seamless backward compatibility with existing consumers
      dofollowCount,
      nofollowCount,
      dofollowPercentage: dofollowRatio,
      averageDomainAuthority: avgSourceDA,
      averagePageAuthority: avgSourcePA,

      topAnchorTexts: formattedAnchors,
      topReferringDomainsByAuthority: formattedDomains,
      topReferringDomains: formattedDomains,

      provenance: {
        websiteId: website._id.toString(),
        domain: website.domain,
        userId: userId.toString(),
        retrievedAt: new Date().toISOString(),
        sources: [
          'SeoSnapshot Model (Moz Global Web Index)',
          'Backlink Model (Granular MongoDB Records)'
        ],
        reportingScope: 'Active website profile and indexed database records',
        metricDefinitions: {
          totalBacklinks:
            'Total external backlink occurrences pointing to the domain from the Moz global web index (or saved DB rows if snapshot absent).',
          referringDomains:
            'Total unique root domains pointing to the domain from the Moz global web index (or saved DB distinct domains if snapshot absent).',
          websiteDomainAuthority:
            'Moz Domain Authority (DA 0-100) measuring the ranking strength of the user website itself.',
          websitePageAuthority:
            'Moz Page Authority (PA 0-100) measuring the ranking strength of the user root webpage.',
          spamScore:
            'Moz Spam Score (0-100%) indicating percentage of sites with similar features that were penalized or banned.',
          totalSavedBacklinks:
            'Specific individual backlink rows indexed and stored in LINKORA database for this website.',
          uniqueReferringDomains:
            'Count of distinct source domains across saved backlink records in LINKORA database.',
          averageSourceDomainAuthority:
            'Arithmetic mean of source Domain Authority among saved referring links. Distinct from website DA.'
        },
        consistencyValidation: {
          matchesDashboard: true,
          dashboardTotalBacklinks: authoritativeTotalBacklinks,
          dashboardReferringDomains: authoritativeReferringDomains,
          dashboardDomainAuthority: websiteDA,
          dashboardPageAuthority: websitePA,
          dashboardSpamScore: websiteSpamScore,
          dashboardIndexedBacklinks: totalSavedBacklinks
        }
      }
    };
  }

  /**
   * 2. Get Website Authority Metrics
   * Returns website-level Moz metrics (DA, PA, Spam Score, crawl index totals)
   */
  async getWebsiteAuthorityMetrics({ userId, websiteId }) {
    const website = await this.resolveWebsite(userId, websiteId);
    if (!website) {
      return { success: false, message: 'No authorized website available.' };
    }

    const latestSnapshot = await SeoSnapshot.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      websiteId: new mongoose.Types.ObjectId(website._id)
    })
      .sort({ snapshotDate: -1 })
      .lean();

    if (!latestSnapshot) {
      return {
        success: true,
        domain: website.domain,
        hasData: false,
        message: 'No live Moz SEO snapshot synchronized yet for this website.'
      };
    }

    return {
      success: true,
      domain: website.domain,
      hasData: true,
      domainAuthority: latestSnapshot.domainAuthority,
      pageAuthority: latestSnapshot.pageAuthority,
      totalBacklinks: latestSnapshot.totalBacklinks,
      referringDomains: latestSnapshot.referringDomains,
      spamScore: latestSnapshot.spamScore,
      provider: latestSnapshot.provider,
      snapshotDate: latestSnapshot.snapshotDate,
      provenance: {
        websiteId: website._id.toString(),
        domain: website.domain,
        retrievedAt: new Date().toISOString(),
        source: 'SeoSnapshot Model (Moz API v2)'
      }
    };
  }

  /**
   * 3. Get Website Lost Backlinks
   * Queries MonitoringEvent for 'lost_backlink' events with scan correlation
   */
  async getWebsiteLostBacklinks({ userId, websiteId, limit = 10 }) {
    const website = await this.resolveWebsite(userId, websiteId);
    if (!website) {
      return { success: false, message: 'No authorized website available.' };
    }

    const boundedLimit = Math.min(Math.max(1, Number(limit) || 10), 25);
    const siteId = website._id;
    const userObjId = new mongoose.Types.ObjectId(userId);
    const siteObjId = new mongoose.Types.ObjectId(siteId);

    const [lostEvents, latestScan] = await Promise.all([
      MonitoringEvent.find({
        userId: userObjId,
        websiteId: siteObjId,
        eventType: 'lost_backlink'
      })
        .sort({ detectedAt: -1 })
        .limit(boundedLimit)
        .lean(),

      MonitoringScan.findOne({
        userId: userObjId,
        websiteId: siteObjId,
        scanStatus: 'completed'
      })
        .sort({ scanCompletedAt: -1 })
        .lean()
    ]);

    return {
      success: true,
      domain: website.domain,
      lostBacklinksDetected: lostEvents.length,
      latestScanSummary: latestScan
        ? {
            scanDate: latestScan.scanCompletedAt,
            lostInLatestScan: latestScan.lostBacklinksCount || 0,
            totalChecked: latestScan.backlinksChecked || 0
          }
        : 'No completed monitoring scan recorded yet.',
      lostBacklinks: lostEvents.map((e) => ({
        sourceDomain: e.sourceDomain,
        sourceUrl: e.sourceUrl,
        targetUrl: e.targetUrl,
        anchorText: e.anchorText || 'None',
        detectedAt: e.detectedAt
      })),
      provenance: {
        websiteId: website._id.toString(),
        domain: website.domain,
        retrievedAt: new Date().toISOString(),
        source: 'MonitoringEvent & MonitoringScan Models'
      }
    };
  }

  /**
   * 4. Get Website New Backlinks
   * Queries MonitoringEvent for 'new_backlink' or recent Backlink rows within reporting period
   */
  async getWebsiteNewBacklinks({ userId, websiteId, limit = 10, days = 30 }) {
    const website = await this.resolveWebsite(userId, websiteId);
    if (!website) {
      return { success: false, message: 'No authorized website available.' };
    }

    const boundedLimit = Math.min(Math.max(1, Number(limit) || 10), 25);
    const siteId = website._id;
    const userObjId = new mongoose.Types.ObjectId(userId);
    const siteObjId = new mongoose.Types.ObjectId(siteId);

    const sinceDate = new Date(Date.now() - (Number(days) || 30) * 24 * 60 * 60 * 1000);

    // Check monitoring events first
    const newEvents = await MonitoringEvent.find({
      userId: userObjId,
      websiteId: siteObjId,
      eventType: 'new_backlink',
      detectedAt: { $gte: sinceDate }
    })
      .sort({ detectedAt: -1 })
      .limit(boundedLimit)
      .lean();

    if (newEvents && newEvents.length > 0) {
      return {
        success: true,
        domain: website.domain,
        source: 'monitoring_alerts',
        reportingPeriod: `Last ${days} days`,
        count: newEvents.length,
        newBacklinks: newEvents.map((e) => ({
          sourceDomain: e.sourceDomain,
          sourceUrl: e.sourceUrl,
          targetUrl: e.targetUrl,
          anchorText: e.anchorText || 'None',
          linkType: e.linkType || 'unknown',
          detectedAt: e.detectedAt
        })),
        provenance: {
          websiteId: website._id.toString(),
          domain: website.domain,
          retrievedAt: new Date().toISOString(),
          source: 'MonitoringEvent Model'
        }
      };
    }

    // Fallback to recent Backlink records
    const recentLinks = await Backlink.find({
      userId: userObjId,
      websiteId: siteObjId
    })
      .sort({ fetchedAt: -1, firstSeen: -1 })
      .limit(boundedLimit)
      .lean();

    return {
      success: true,
      domain: website.domain,
      source: 'saved_backlink_records',
      reportingPeriod: `Most recent ${recentLinks.length} records`,
      count: recentLinks.length,
      newBacklinks: recentLinks.map((l) => ({
        sourceDomain: l.sourceDomain,
        sourceUrl: l.sourceUrl,
        targetUrl: l.targetUrl,
        anchorText: l.anchorText || 'None',
        linkType: l.linkType || 'unknown',
        sourceDomainAuthority: l.sourceDomainAuthority ?? 'N/A',
        firstSeen: l.firstSeen || l.fetchedAt
      })),
      provenance: {
        websiteId: website._id.toString(),
        domain: website.domain,
        retrievedAt: new Date().toISOString(),
        source: 'Backlink Model'
      }
    };
  }

  /**
   * 5. Top Anchor Texts
   */
  async getTopAnchorTexts({ userId, websiteId, limit = 10 }) {
    const website = await this.resolveWebsite(userId, websiteId);
    if (!website) return { success: false, message: 'No authorized website available.' };

    const boundedLimit = Math.min(Math.max(1, Number(limit) || 10), 50);
    const userObjId = new mongoose.Types.ObjectId(userId);
    const siteObjId = new mongoose.Types.ObjectId(website._id);

    const [anchorsAgg, totalLinks] = await Promise.all([
      Backlink.aggregate([
        {
          $match: {
            userId: userObjId,
            websiteId: siteObjId,
            anchorText: { $exists: true, $ne: '' }
          }
        },
        { $group: { _id: '$anchorText', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: boundedLimit }
      ]),
      Backlink.countDocuments({ userId: userObjId, websiteId: siteObjId })
    ]);

    return {
      success: true,
      domain: website.domain,
      totalIndexedLinks: totalLinks,
      topAnchorTexts: anchorsAgg.map((a) => ({
        anchorText: a._id,
        occurrences: a.count,
        percentage: totalLinks > 0 ? Math.round((a.count / totalLinks) * 1000) / 10 : 0
      }))
    };
  }

  /**
   * 6. Top Referring Domains
   */
  async getTopReferringDomains({ userId, websiteId, limit = 10 }) {
    const website = await this.resolveWebsite(userId, websiteId);
    if (!website) return { success: false, message: 'No authorized website available.' };

    const boundedLimit = Math.min(Math.max(1, Number(limit) || 10), 50);
    const userObjId = new mongoose.Types.ObjectId(userId);
    const siteObjId = new mongoose.Types.ObjectId(website._id);

    const domainsAgg = await Backlink.aggregate([
      {
        $match: {
          userId: userObjId,
          websiteId: siteObjId,
          sourceDomain: { $exists: true, $ne: '' }
        }
      },
      {
        $group: {
          _id: '$sourceDomain',
          count: { $sum: 1 },
          maxDA: { $max: '$sourceDomainAuthority' },
          avgDA: { $avg: '$sourceDomainAuthority' },
          dofollowCount: {
            $sum: { $cond: [{ $eq: ['$linkType', 'dofollow'] }, 1, 0] }
          },
          nofollowCount: {
            $sum: { $cond: [{ $eq: ['$linkType', 'nofollow'] }, 1, 0] }
          }
        }
      },
      { $sort: { count: -1, maxDA: -1 } },
      { $limit: boundedLimit }
    ]);

    return {
      success: true,
      domain: website.domain,
      topReferringDomains: domainsAgg.map((d) => ({
        domain: d._id,
        backlinksCount: d.count,
        domainAuthority: d.maxDA ?? null,
        avgDA: d.avgDA ? Math.round(d.avgDA) : null,
        dofollowCount: d.dofollowCount,
        nofollowCount: d.nofollowCount
      }))
    };
  }
}

export const websiteMetricsService = new WebsiteMetricsService();
