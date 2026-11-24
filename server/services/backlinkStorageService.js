import mongoose from 'mongoose';
import Backlink, { extractDomainFromUrl } from '../models/Backlink.js';
import SeoSnapshot from '../models/SeoSnapshot.js';

// Regex escape helper
function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

const ALLOWED_SORT_FIELDS = [
  'fetchedAt',
  'sourceDomain',
  'anchorText',
  'linkType',
  'firstSeen',
  'lastSeen',
  'sourceDomainAuthority',
  'sourcePageAuthority',
  'createdAt'
];

export class BacklinkStorageService {
  /**
   * Save a historical SEO snapshot for a website
   * Prevents accidental rapid duplicate snapshots (e.g. from retries within 15 mins with identical data)
   *
   * @param {Object} params
   * @param {string|ObjectId} params.userId
   * @param {string|ObjectId} params.websiteId
   * @param {string} params.domain
   * @param {Object} params.seoData - Normalized overview data from SeoService
   * @param {string} params.provider - 'moz' or 'dataforseo'
   * @returns {Promise<Object>} { snapshot, isNew, updatedExisting }
   */
  async saveSnapshot({ userId, websiteId, domain, seoData, provider = 'moz' }) {
    if (!userId || !websiteId || !domain || !seoData) {
      throw new Error('Missing required parameters to save SEO snapshot.');
    }

    const d = seoData.data || {};
    const domainAuthority = d.domainAuthority ?? d.domainRating ?? null;
    const pageAuthority = d.pageAuthority ?? null;
    const totalBacklinks = d.totalBacklinks ?? null;
    const referringDomains = d.referringDomains ?? null;
    const spamScore = d.spamScore ?? null;
    const crawledPages = d.crawledPages ?? null;
    const dofollowBacklinks = d.dofollowBacklinks ?? null;
    const nofollowBacklinks = d.nofollowBacklinks ?? null;
    const brokenBacklinks = d.brokenBacklinks ?? null;

    // Check for a very recent snapshot (within 15 minutes) with identical core values
    const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
    const latestSnapshot = await SeoSnapshot.findOne({
      userId,
      websiteId,
      provider: provider.toLowerCase()
    }).sort({ snapshotDate: -1 });

    if (latestSnapshot) {
      const elapsed = Date.now() - new Date(latestSnapshot.snapshotDate).getTime();
      const metricsUnchanged =
        latestSnapshot.domainAuthority === domainAuthority &&
        latestSnapshot.pageAuthority === pageAuthority &&
        latestSnapshot.totalBacklinks === totalBacklinks &&
        latestSnapshot.referringDomains === referringDomains &&
        latestSnapshot.spamScore === spamScore;

      if (elapsed < FIFTEEN_MINUTES_MS && metricsUnchanged) {
        // Prevent accidental duplicate snapshot due to rapid retries: update fetchedAt timestamp
        latestSnapshot.fetchedAt = new Date();
        await latestSnapshot.save();
        return {
          snapshot: latestSnapshot.toSafeObject ? latestSnapshot.toSafeObject() : latestSnapshot,
          isNew: false,
          updatedExisting: true
        };
      }
    }

    // Insert new historical snapshot
    const newSnapshot = await SeoSnapshot.create({
      userId,
      websiteId,
      domain: domain.toLowerCase(),
      provider: provider.toLowerCase(),
      domainAuthority,
      pageAuthority,
      totalBacklinks,
      referringDomains,
      spamScore,
      crawledPages,
      dofollowBacklinks,
      nofollowBacklinks,
      brokenBacklinks,
      metricsAvailability: seoData.availability || {},
      snapshotDate: new Date(),
      fetchedAt: new Date()
    });

    return {
      snapshot: newSnapshot.toSafeObject ? newSnapshot.toSafeObject() : newSnapshot,
      isNew: true,
      updatedExisting: false
    };
  }

  /**
   * Save or upsert a list of backlinks in MongoDB
   * Guaranteed duplicate prevention via unique index { websiteId: 1, sourceUrl: 1, targetUrl: 1 }
   *
   * @param {Object} params
   * @param {string|ObjectId} params.userId
   * @param {string|ObjectId} params.websiteId
   * @param {Array<Object>} params.backlinksList
   * @param {string} params.provider
   * @returns {Promise<Object>} { totalProcessed, upsertedCount }
   */
  async saveBacklinks({ userId, websiteId, backlinksList = [], provider = 'moz' }) {
    if (!userId || !websiteId) {
      throw new Error('userId and websiteId are required to persist backlinks.');
    }

    if (!Array.isArray(backlinksList) || backlinksList.length === 0) {
      return { totalProcessed: 0, upsertedCount: 0 };
    }

    let upsertedCount = 0;

    for (const item of backlinksList) {
      if (!item.sourceUrl || !item.targetUrl) continue;

      const sourceDomain = item.sourceDomain || extractDomainFromUrl(item.sourceUrl);

      const filter = {
        websiteId,
        sourceUrl: item.sourceUrl.trim(),
        targetUrl: item.targetUrl.trim()
      };

      const update = {
        $set: {
          userId,
          sourceDomain,
          anchorText: item.anchorText || '',
          linkType: item.linkType || 'unknown',
          sourceDomainAuthority: item.sourceDomainAuthority ?? null,
          sourcePageAuthority: item.sourcePageAuthority ?? null,
          lastSeen: item.lastSeen || new Date(),
          fetchedAt: new Date(),
          status: 'active',
          provider: (item.provider || provider || 'moz').toLowerCase(),
          meta: item.meta || {}
        },
        $setOnInsert: {
          firstSeen: item.firstSeen || new Date()
        }
      };

      await Backlink.findOneAndUpdate(filter, update, {
        upsert: true,
        returnDocument: 'after',
        setDefaultsOnInsert: true
      });

      upsertedCount++;
    }

    return {
      totalProcessed: backlinksList.length,
      upsertedCount
    };
  }

  /**
   * Retrieve saved backlinks with pagination, search, combined filters, and sorting
   * Strict user and website access enforcement
   */
  async getSavedBacklinks({
    userId,
    websiteId,
    page = 1,
    limit = 10,
    search,
    linkType,
    sourceDomain,
    targetUrl,
    provider,
    status,
    sortBy = 'fetchedAt',
    sortOrder = 'desc'
  }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(Math.max(1, parseInt(limit, 10) || 10), 100);
    const skip = (pageNum - 1) * limitNum;

    const query = {
      userId,
      websiteId
    };

    // Link Type Filter (dofollow, nofollow, unknown)
    if (linkType && linkType !== 'all') {
      query.linkType = linkType.toLowerCase();
    }

    // Status Filter (active, lost, broken)
    if (status && status !== 'all') {
      query.status = status.toLowerCase();
    }

    // Provider Filter (moz, dataforseo, manual)
    if (provider && provider !== 'all') {
      query.provider = provider.toLowerCase();
    }

    // Specific Source Domain Filter
    if (sourceDomain && sourceDomain.trim()) {
      const domainRegex = new RegExp(escapeRegex(sourceDomain.trim()), 'i');
      query.$or = [
        { sourceDomain: domainRegex },
        { sourceUrl: domainRegex }
      ];
    }

    // Specific Target Page Filter
    if (targetUrl && targetUrl.trim()) {
      query.targetUrl = new RegExp(escapeRegex(targetUrl.trim()), 'i');
    }

    // Free text search (partial, case-insensitive across 4 key fields)
    if (search && search.trim()) {
      const regex = new RegExp(escapeRegex(search.trim()), 'i');
      const searchConditions = [
        { anchorText: regex },
        { sourceUrl: regex },
        { sourceDomain: regex },
        { targetUrl: regex }
      ];

      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchConditions }];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    // Validate Sort Field and Direction
    const validSortField = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : 'fetchedAt';
    const sortDir = String(sortOrder).toLowerCase() === 'asc' ? 1 : -1;
    const sort = { [validSortField]: sortDir, _id: sortDir };

    const [total, records] = await Promise.all([
      Backlink.countDocuments(query),
      Backlink.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean()
    ]);

    const formatted = records.map((b) => ({
      id: b._id.toString(),
      _id: b._id.toString(),
      sourceUrl: b.sourceUrl,
      sourceDomain: b.sourceDomain || extractDomainFromUrl(b.sourceUrl),
      targetUrl: b.targetUrl,
      anchorText: b.anchorText || '',
      linkType: b.linkType || 'unknown',
      sourceDomainAuthority: b.sourceDomainAuthority ?? null,
      sourcePageAuthority: b.sourcePageAuthority ?? null,
      firstSeen: b.firstSeen || null,
      lastSeen: b.lastSeen || null,
      status: b.status || 'active',
      provider: b.provider || 'moz',
      fetchedAt: b.fetchedAt || b.createdAt,
      meta: b.meta || {}
    }));

    const totalPages = Math.ceil(total / limitNum) || 1;

    return {
      backlinks: formatted,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
        hasPrevPage: pageNum > 1,
        hasNextPage: pageNum < totalPages
      },
      activeFilters: {
        search: search || '',
        linkType: linkType || 'all',
        sourceDomain: sourceDomain || '',
        targetUrl: targetUrl || '',
        provider: provider || 'all',
        status: status || 'all',
        sortBy: validSortField,
        sortOrder: sortDir === 1 ? 'asc' : 'desc'
      }
    };
  }

  /**
   * Retrieve aggregated statistics for saved backlinks (totals, unique domains, dofollow ratio)
   */
  async getBacklinkStats({ userId, websiteId }) {
    if (!userId || !websiteId) {
      throw new Error('userId and websiteId are required to retrieve backlink stats.');
    }

    const [total, dofollow, nofollow, distinctDomains, latest, avgDaAgg] = await Promise.all([
      Backlink.countDocuments({ userId, websiteId }),
      Backlink.countDocuments({ userId, websiteId, linkType: 'dofollow' }),
      Backlink.countDocuments({ userId, websiteId, linkType: 'nofollow' }),
      Backlink.distinct('sourceDomain', { userId, websiteId, sourceDomain: { $ne: '' } }),
      Backlink.findOne({ userId, websiteId }).sort({ fetchedAt: -1 }).select('fetchedAt').lean(),
      Backlink.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            websiteId: new mongoose.Types.ObjectId(websiteId),
            sourceDomainAuthority: { $ne: null }
          }
        },
        { $group: { _id: null, avgDA: { $avg: '$sourceDomainAuthority' } } }
      ])
    ]);

    const otherCount = Math.max(0, total - (dofollow + nofollow));
    const dofollowRatio = total > 0 ? Math.round((dofollow / total) * 1000) / 10 : 0;
    const avgDA =
      avgDaAgg && avgDaAgg.length > 0 && avgDaAgg[0].avgDA !== null
        ? Math.round(avgDaAgg[0].avgDA)
        : null;

    return {
      totalSavedBacklinks: total,
      uniqueReferringDomains: distinctDomains?.length || 0,
      dofollowCount: dofollow,
      nofollowCount: nofollow,
      otherCount,
      dofollowRatio,
      avgDomainAuthority: avgDA,
      latestFetchedAt: latest?.fetchedAt || null
    };
  }

  /**
   * Retrieve in-depth backlink analysis & aggregations for visualization
   * Aggregates top referring domains, anchor texts, target pages, and DA tiers
   */
  async getBacklinkAnalysis({ userId, websiteId }) {
    if (!userId || !websiteId) {
      throw new Error('userId and websiteId are required for backlink analysis.');
    }

    const matchStage = {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        websiteId: new mongoose.Types.ObjectId(websiteId)
      }
    };

    const [stats, analysisResults] = await Promise.all([
      this.getBacklinkStats({ userId, websiteId }),
      Backlink.aggregate([
        matchStage,
        {
          $facet: {
            topReferringDomains: [
              {
                $group: {
                  _id: { $ifNull: ['$sourceDomain', 'unknown'] },
                  count: { $sum: 1 },
                  dofollowCount: {
                    $sum: { $cond: [{ $eq: ['$linkType', 'dofollow'] }, 1, 0] }
                  },
                  nofollowCount: {
                    $sum: { $cond: [{ $eq: ['$linkType', 'nofollow'] }, 1, 0] }
                  },
                  avgDA: { $avg: '$sourceDomainAuthority' }
                }
              },
              { $sort: { count: -1 } },
              { $limit: 10 },
              {
                $project: {
                  domain: '$_id',
                  count: 1,
                  dofollowCount: 1,
                  nofollowCount: 1,
                  avgDA: {
                    $cond: [{ $ne: ['$avgDA', null] }, { $round: ['$avgDA', 0] }, null]
                  }
                }
              }
            ],
            topAnchorTexts: [
              { $match: { anchorText: { $exists: true, $ne: '' } } },
              {
                $group: {
                  _id: '$anchorText',
                  count: { $sum: 1 }
                }
              },
              { $sort: { count: -1 } },
              { $limit: 10 },
              {
                $project: {
                  anchorText: '$_id',
                  count: 1
                }
              }
            ],
            topTargetPages: [
              {
                $group: {
                  _id: '$targetUrl',
                  count: { $sum: 1 }
                }
              },
              { $sort: { count: -1 } },
              { $limit: 10 },
              {
                $project: {
                  targetUrl: '$_id',
                  count: 1
                }
              }
            ],
            linkTypeDistribution: [
              {
                $group: {
                  _id: { $ifNull: ['$linkType', 'unknown'] },
                  count: { $sum: 1 }
                }
              },
              {
                $project: {
                  type: '$_id',
                  count: 1
                }
              }
            ],
            authorityDistribution: [
              { $match: { sourceDomainAuthority: { $ne: null } } },
              {
                $bucket: {
                  groupBy: '$sourceDomainAuthority',
                  boundaries: [0, 20, 40, 60, 80, 101],
                  default: 'Other',
                  output: { count: { $sum: 1 } }
                }
              }
            ]
          }
        }
      ])
    ]);

    const facet = analysisResults[0] || {};
    const totalBacklinks = stats.totalSavedBacklinks || 0;

    // Format top anchor texts with percentage
    const topAnchorTexts = (facet.topAnchorTexts || []).map((item) => ({
      ...item,
      percentage: totalBacklinks > 0 ? Math.round((item.count / totalBacklinks) * 1000) / 10 : 0
    }));

    // Format top referring domains with percentage
    const topReferringDomains = (facet.topReferringDomains || []).map((item) => ({
      ...item,
      percentage: totalBacklinks > 0 ? Math.round((item.count / totalBacklinks) * 1000) / 10 : 0
    }));

    // Map DA tiers to readable labels
    const tierLabels = {
      0: '0 - 19 (Low)',
      20: '20 - 39 (Developing)',
      40: '40 - 59 (Good)',
      60: '60 - 79 (Strong)',
      80: '80 - 100 (Authority)'
    };

    const domainAuthorityDistribution = (facet.authorityDistribution || []).map((b) => ({
      tier: tierLabels[b._id] || `${b._id}`,
      min: b._id,
      count: b.count,
      percentage: totalBacklinks > 0 ? Math.round((b.count / totalBacklinks) * 1000) / 10 : 0
    }));

    return {
      stats,
      topReferringDomains,
      topAnchorTexts,
      topTargetPages: facet.topTargetPages || [],
      linkTypeDistribution: facet.linkTypeDistribution || [],
      domainAuthorityDistribution,
      hasData: totalBacklinks > 0
    };
  }

  /**
   * Retrieve single backlink by ID with strict ownership validation
   */
  async getBacklinkById({ userId, backlinkId }) {
    if (!userId || !backlinkId) {
      throw new Error('userId and backlinkId are required.');
    }

    if (!mongoose.Types.ObjectId.isValid(backlinkId)) {
      const err = new Error('Invalid backlink ID format.');
      err.status = 400;
      throw err;
    }

    const backlink = await Backlink.findOne({
      _id: backlinkId,
      userId
    }).lean();

    if (!backlink) {
      const err = new Error('Backlink record not found or access denied.');
      err.status = 404;
      throw err;
    }

    return {
      id: backlink._id.toString(),
      _id: backlink._id.toString(),
      userId: backlink.userId.toString(),
      websiteId: backlink.websiteId.toString(),
      sourceUrl: backlink.sourceUrl,
      sourceDomain: backlink.sourceDomain || extractDomainFromUrl(backlink.sourceUrl),
      targetUrl: backlink.targetUrl,
      anchorText: backlink.anchorText || '',
      linkType: backlink.linkType || 'unknown',
      sourceDomainAuthority: backlink.sourceDomainAuthority ?? null,
      sourcePageAuthority: backlink.sourcePageAuthority ?? null,
      firstSeen: backlink.firstSeen || null,
      lastSeen: backlink.lastSeen || null,
      provider: backlink.provider || 'moz',
      status: backlink.status || 'active',
      fetchedAt: backlink.fetchedAt || backlink.createdAt,
      meta: backlink.meta || {},
      createdAt: backlink.createdAt,
      updatedAt: backlink.updatedAt
    };
  }

  /**
   * Retrieve the latest saved SEO snapshot for a website
   */
  async getLatestSnapshot({ userId, websiteId }) {
    const snapshot = await SeoSnapshot.findOne({ userId, websiteId })
      .sort({ snapshotDate: -1 })
      .lean();

    if (!snapshot) return null;

    return {
      id: snapshot._id.toString(),
      _id: snapshot._id.toString(),
      domain: snapshot.domain,
      provider: snapshot.provider,
      domainAuthority: snapshot.domainAuthority,
      pageAuthority: snapshot.pageAuthority,
      totalBacklinks: snapshot.totalBacklinks,
      referringDomains: snapshot.referringDomains,
      spamScore: snapshot.spamScore,
      crawledPages: snapshot.crawledPages,
      dofollowBacklinks: snapshot.dofollowBacklinks,
      nofollowBacklinks: snapshot.nofollowBacklinks,
      brokenBacklinks: snapshot.brokenBacklinks,
      metricsAvailability: snapshot.metricsAvailability,
      snapshotDate: snapshot.snapshotDate,
      fetchedAt: snapshot.fetchedAt
    };
  }

  /**
   * Retrieve historical snapshots for a website (for growth charts / comparisons)
   */
  async getSnapshotHistory({ userId, websiteId, limit = 30, startDate, endDate }) {
    const limitNum = Math.min(Math.max(1, parseInt(limit, 10) || 30), 100);

    const query = {
      userId,
      websiteId
    };

    if (startDate || endDate) {
      query.snapshotDate = {};
      if (startDate) query.snapshotDate.$gte = new Date(startDate);
      if (endDate) query.snapshotDate.$lte = new Date(endDate);
    }

    const snapshots = await SeoSnapshot.find(query)
      .sort({ snapshotDate: -1 })
      .limit(limitNum)
      .lean();

    return snapshots.map((s) => ({
      id: s._id.toString(),
      _id: s._id.toString(),
      domain: s.domain,
      provider: s.provider,
      domainAuthority: s.domainAuthority,
      pageAuthority: s.pageAuthority,
      totalBacklinks: s.totalBacklinks,
      referringDomains: s.referringDomains,
      spamScore: s.spamScore,
      crawledPages: s.crawledPages,
      snapshotDate: s.snapshotDate,
      fetchedAt: s.fetchedAt
    }));
  }
}

export const backlinkStorageService = new BacklinkStorageService();
