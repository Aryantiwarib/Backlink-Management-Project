import mongoose from 'mongoose';
import Website from '../models/Website.js';
import Backlink from '../models/Backlink.js';
import SeoSnapshot from '../models/SeoSnapshot.js';
import MonitoringEvent from '../models/MonitoringEvent.js';
import MonitoringScan from '../models/MonitoringScan.js';
import Campaign from '../models/Campaign.js';
import CampaignProspectAssignment from '../models/CampaignProspectAssignment.js';
import Prospect from '../models/Prospect.js';
import OutreachEmail from '../models/OutreachEmail.js';
import ScheduledFollowUp from '../models/ScheduledFollowUp.js';
import { websiteMetricsService } from './websiteMetricsService.js';

/**
 * Parse date range string into current and comparison (previous) time windows
 * Supported presets: '7d', '30d', '90d', '6m', '12m', 'custom'
 */
export function parseDateRange(range = '30d', customStart = null, customEnd = null) {
  const now = new Date();
  let endDate = customEnd ? new Date(customEnd) : now;
  if (customEnd && typeof customEnd === 'string' && !customEnd.includes('T')) {
    endDate.setHours(23, 59, 59, 999);
  }

  let startDate = new Date();
  switch (range) {
    case '7d':
      startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '6m':
      startDate = new Date(endDate.getTime() - 180 * 24 * 60 * 60 * 1000);
      break;
    case '12m':
      startDate = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    case 'custom':
      if (customStart) {
        startDate = new Date(customStart);
        if (typeof customStart === 'string' && !customStart.includes('T')) {
          startDate.setHours(0, 0, 0, 0);
        }
      } else {
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      break;
    default:
      startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
  }

  const durationMs = Math.max(1000, endDate.getTime() - startDate.getTime());
  const prevEndDate = new Date(startDate.getTime());
  const prevStartDate = new Date(prevEndDate.getTime() - durationMs);

  return {
    current: { startDate, endDate },
    previous: { startDate: prevStartDate, endDate: prevEndDate },
    durationMs,
    rangeLabel: range
  };
}

/**
 * Calculates absolute and percentage change between two metric values.
 * Strictly adheres to rule: If previous value is 0 or unavailable, percentChange is null.
 */
export function calculateComparison(currentVal, prevVal) {
  if (currentVal === null || currentVal === undefined) {
    return {
      current: null,
      previous: null,
      absoluteChange: null,
      percentChange: null,
      hasComparison: false,
      status: 'unavailable'
    };
  }

  if (prevVal === null || prevVal === undefined) {
    return {
      current: currentVal,
      previous: null,
      absoluteChange: null,
      percentChange: null,
      hasComparison: false,
      status: 'first_record'
    };
  }

  const absoluteChange = currentVal - prevVal;
  let percentChange = null;
  let hasComparison = true;

  if (prevVal !== 0) {
    percentChange = Math.round(((currentVal - prevVal) / Math.abs(prevVal)) * 1000) / 10;
  } else {
    // If previous value is 0, percentage change is mathematically invalid or infinite; do not compute
    percentChange = null;
    hasComparison = false;
  }

  return {
    current: currentVal,
    previous: prevVal,
    absoluteChange,
    percentChange,
    hasComparison,
    isPositive: absoluteChange >= 0
  };
}

export class AnalyticsService {
  /**
   * Helper to verify and resolve authorized website
   */
  async resolveWebsite(userId, websiteId) {
    return await websiteMetricsService.resolveWebsite(userId, websiteId);
  }

  /**
   * 1. Analytics Overview
   * 8 Key Performance Indicators with current vs. previous period comparison,
   * net backlink growth, and period metadata.
   */
  async getOverviewAnalytics({ userId, websiteId, dateRange = '30d', customStart = null, customEnd = null }) {
    const website = await this.resolveWebsite(userId, websiteId);
    if (!website) {
      throw new Error('Website not found or access denied.');
    }

    const { current, previous, rangeLabel } = parseDateRange(dateRange, customStart, customEnd);
    const siteObjId = new mongoose.Types.ObjectId(website._id);
    const userObjId = new mongoose.Types.ObjectId(userId);

    // Fetch authoritative backlink and authority baseline
    const summary = await websiteMetricsService.getWebsiteBacklinkSummary({
      userId,
      websiteId: website._id
    });

    // Parallel aggregation for current period vs previous period
    const [
      currNewLinksCount,
      prevNewLinksCount,
      currLostLinksCount,
      prevLostLinksCount,
      activeCampaignsCount,
      prevActiveCampaignsCount,
      qualifiedProspectsCount,
      prevQualifiedProspectsCount,
      snapshots
    ] = await Promise.all([
      // New backlinks (current vs prev)
      MonitoringEvent.countDocuments({
        userId: userObjId,
        websiteId: siteObjId,
        eventType: 'new_backlink',
        detectedAt: { $gte: current.startDate, $lte: current.endDate }
      }),
      MonitoringEvent.countDocuments({
        userId: userObjId,
        websiteId: siteObjId,
        eventType: 'new_backlink',
        detectedAt: { $gte: previous.startDate, $lte: previous.endDate }
      }),

      // Lost backlinks (current vs prev)
      MonitoringEvent.countDocuments({
        userId: userObjId,
        websiteId: siteObjId,
        eventType: 'lost_backlink',
        detectedAt: { $gte: current.startDate, $lte: current.endDate }
      }),
      MonitoringEvent.countDocuments({
        userId: userObjId,
        websiteId: siteObjId,
        eventType: 'lost_backlink',
        detectedAt: { $gte: previous.startDate, $lte: previous.endDate }
      }),

      // Active Campaigns
      Campaign.countDocuments({ userId: userObjId, websiteId: siteObjId, status: 'active' }),
      Campaign.countDocuments({
        userId: userObjId,
        websiteId: siteObjId,
        status: 'active',
        createdAt: { $lte: previous.endDate }
      }),

      // Qualified prospects
      Prospect.countDocuments({
        userId: userObjId,
        websiteId: siteObjId,
        qualificationStatus: 'qualified'
      }),
      Prospect.countDocuments({
        userId: userObjId,
        websiteId: siteObjId,
        qualificationStatus: 'qualified',
        createdAt: { $lte: previous.endDate }
      }),

      // SEO Snapshots for authority trend comparison
      SeoSnapshot.find({ userId: userObjId, websiteId: siteObjId })
        .sort({ snapshotDate: -1 })
        .limit(10)
        .lean()
    ]);

    // Snapshot comparisons
    const latestSnapshot = snapshots && snapshots.length > 0 ? snapshots[0] : null;
    // Find closest snapshot representing the previous period baseline
    let previousPeriodSnapshot = null;
    if (snapshots && snapshots.length > 1) {
      previousPeriodSnapshot =
        snapshots.find((s) => new Date(s.snapshotDate) <= previous.endDate) || snapshots[1];
    }

    // Build KPI comparisons
    const kpis = {
      totalBacklinks: calculateComparison(
        summary.totalBacklinks,
        previousPeriodSnapshot?.totalBacklinks ?? null
      ),
      referringDomains: calculateComparison(
        summary.referringDomains,
        previousPeriodSnapshot?.referringDomains ?? null
      ),
      domainAuthority: calculateComparison(
        summary.domainAuthority,
        previousPeriodSnapshot?.domainAuthority ?? null
      ),
      pageAuthority: calculateComparison(
        summary.pageAuthority,
        previousPeriodSnapshot?.pageAuthority ?? null
      ),
      newBacklinks: calculateComparison(currNewLinksCount, prevNewLinksCount),
      lostBacklinks: calculateComparison(currLostLinksCount, prevLostLinksCount),
      activeCampaigns: calculateComparison(activeCampaignsCount, prevActiveCampaignsCount),
      qualifiedProspects: calculateComparison(qualifiedProspectsCount, prevQualifiedProspectsCount)
    };

    const netBacklinksCurrent = currNewLinksCount - currLostLinksCount;
    const netBacklinksPrevious = prevNewLinksCount - prevLostLinksCount;

    return {
      success: true,
      website: {
        id: website._id.toString(),
        name: website.name,
        domain: website.domain,
        url: website.url,
        verificationStatus: website.verificationStatus
      },
      period: {
        range: rangeLabel,
        current: {
          startDate: current.startDate.toISOString(),
          endDate: current.endDate.toISOString()
        },
        previous: {
          startDate: previous.startDate.toISOString(),
          endDate: previous.endDate.toISOString()
        }
      },
      kpis,
      netBacklinks: {
        current: netBacklinksCurrent,
        previous: netBacklinksPrevious,
        change: netBacklinksCurrent - netBacklinksPrevious
      },
      provenance: summary.provenance
    };
  }

  /**
   * 2. Backlink Growth Analytics
   * Historical growth timeline, new vs lost bar chart, dofollow distribution,
   * status distribution, anchor text distribution, and referring domain authority tiers.
   */
  async getBacklinkAnalytics({ userId, websiteId, dateRange = '30d', customStart = null, customEnd = null }) {
    const website = await this.resolveWebsite(userId, websiteId);
    if (!website) {
      throw new Error('Website not found or access denied.');
    }

    const { current } = parseDateRange(dateRange, customStart, customEnd);
    const siteObjId = new mongoose.Types.ObjectId(website._id);
    const userObjId = new mongoose.Types.ObjectId(userId);

    // Parallel database aggregations
    const [
      snapshots,
      monitoringEvents,
      statusAgg,
      linkTypeAgg,
      anchorTextAgg,
      authorityTiersAgg,
      totalSavedBacklinks
    ] = await Promise.all([
      // 1. Historical Snapshots for Growth Trend
      SeoSnapshot.find({
        userId: userObjId,
        websiteId: siteObjId,
        snapshotDate: { $gte: current.startDate, $lte: current.endDate }
      })
        .sort({ snapshotDate: 1 })
        .lean(),

      // 2. Monitoring events (new vs lost) within period
      MonitoringEvent.find({
        userId: userObjId,
        websiteId: siteObjId,
        eventType: { $in: ['new_backlink', 'lost_backlink'] },
        detectedAt: { $gte: current.startDate, $lte: current.endDate }
      })
        .sort({ detectedAt: 1 })
        .lean(),

      // 3. Status distribution (Active, Lost, Broken)
      Backlink.aggregate([
        { $match: { userId: userObjId, websiteId: siteObjId } },
        {
          $group: {
            _id: { $ifNull: ['$status', 'active'] },
            count: { $sum: 1 }
          }
        }
      ]),

      // 4. Link type distribution (dofollow vs nofollow)
      Backlink.aggregate([
        { $match: { userId: userObjId, websiteId: siteObjId } },
        {
          $group: {
            _id: { $ifNull: ['$linkType', 'unknown'] },
            count: { $sum: 1 }
          }
        }
      ]),

      // 5. Top Anchor Texts with occurrences and percentages
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

      // 6. Referring Domain Authority Tier Distribution
      Backlink.aggregate([
        {
          $match: {
            userId: userObjId,
            websiteId: siteObjId,
            sourceDomainAuthority: { $ne: null }
          }
        },
        {
          $bucket: {
            groupBy: '$sourceDomainAuthority',
            boundaries: [0, 21, 41, 61, 81, 101],
            default: 'Other',
            output: { count: { $sum: 1 } }
          }
        }
      ]),

      // 7. Total saved rows for percentage calculations
      Backlink.countDocuments({ userId: userObjId, websiteId: siteObjId })
    ]);

    // Build Time-Series Growth Points from real snapshots
    const growthTrend = snapshots.map((s) => ({
      date: new Date(s.snapshotDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      fullDate: s.snapshotDate,
      totalBacklinks: s.totalBacklinks || 0,
      referringDomains: s.referringDomains || 0,
      domainAuthority: s.domainAuthority || 0,
      pageAuthority: s.pageAuthority || 0
    }));

    // Build New vs Lost Bar Chart timeline grouped by date
    const dateBucketMap = new Map();
    for (const event of monitoringEvents) {
      const dayKey = new Date(event.detectedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
      if (!dateBucketMap.has(dayKey)) {
        dateBucketMap.set(dayKey, { date: dayKey, newBacklinks: 0, lostBacklinks: 0, netGrowth: 0 });
      }
      const bucket = dateBucketMap.get(dayKey);
      if (event.eventType === 'new_backlink') {
        bucket.newBacklinks += 1;
        bucket.netGrowth += 1;
      } else if (event.eventType === 'lost_backlink') {
        bucket.lostBacklinks += 1;
        bucket.netGrowth -= 1;
      }
    }
    const newVsLostTimeline = Array.from(dateBucketMap.values());

    // Format Link Type Distribution
    const linkTypeDistribution = linkTypeAgg.map((item) => {
      const name = item._id.charAt(0).toUpperCase() + item._id.slice(1);
      const percentage =
        totalSavedBacklinks > 0 ? Math.round((item.count / totalSavedBacklinks) * 1000) / 10 : 0;
      return {
        name,
        type: item._id,
        count: item.count,
        percentage,
        color: item._id === 'dofollow' ? '#10B981' : item._id === 'nofollow' ? '#3B82F6' : '#6B7280'
      };
    });

    // Format Backlink Status Distribution
    const statusDistribution = statusAgg.map((item) => {
      const name = item._id.charAt(0).toUpperCase() + item._id.slice(1);
      const percentage =
        totalSavedBacklinks > 0 ? Math.round((item.count / totalSavedBacklinks) * 1000) / 10 : 0;
      return {
        name,
        status: item._id,
        count: item.count,
        percentage,
        color: item._id === 'active' ? '#10B981' : item._id === 'lost' ? '#EF4444' : '#F59E0B'
      };
    });

    // Format Anchor Texts
    const anchorTextDistribution = anchorTextAgg.map((a) => ({
      anchorText: a._id,
      count: a.count,
      percentage:
        totalSavedBacklinks > 0 ? Math.round((a.count / totalSavedBacklinks) * 1000) / 10 : 0
    }));

    // Format Authority Tiers (0-20, 21-40, 41-60, 61-80, 81-100)
    const tierLabels = {
      0: '0 - 20 (Low)',
      21: '21 - 40 (Moderate)',
      41: '41 - 60 (Good)',
      61: '61 - 80 (High)',
      81: '81 - 100 (Authority)'
    };
    const authorityDistribution = [0, 21, 41, 61, 81].map((boundary) => {
      const found = authorityTiersAgg.find((t) => t._id === boundary);
      return {
        tier: tierLabels[boundary],
        minDa: boundary,
        count: found ? found.count : 0
      };
    });

    return {
      success: true,
      domain: website.domain,
      growthTrend,
      hasGrowthTrend: growthTrend.length > 0,
      newVsLostTimeline,
      linkTypeDistribution,
      statusDistribution,
      anchorTextDistribution,
      authorityDistribution,
      totalSavedBacklinks
    };
  }

  /**
   * 3. Campaign Performance Analytics
   * Campaign status distribution, progress comparison, prospect pipeline funnel,
   * and top-performing campaigns.
   */
  async getCampaignAnalytics({ userId, websiteId, dateRange = '30d', customStart = null, customEnd = null }) {
    const website = await this.resolveWebsite(userId, websiteId);
    if (!website) {
      throw new Error('Website not found or access denied.');
    }

    const { current } = parseDateRange(dateRange, customStart, customEnd);
    const siteObjId = new mongoose.Types.ObjectId(website._id);
    const userObjId = new mongoose.Types.ObjectId(userId);

    const campaigns = await Campaign.find({
      userId: userObjId,
      websiteId: siteObjId,
      status: { $ne: 'archived' }
    })
      .sort({ createdAt: -1 })
      .lean();

    const campaignIds = campaigns.map((c) => c._id);

    // Aggregate prospect assignments across campaigns
    const assignmentsAgg = await CampaignProspectAssignment.aggregate([
      { $match: { campaignId: { $in: campaignIds } } },
      {
        $group: {
          _id: { campaignId: '$campaignId', status: '$outreachStatus' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Build assignment map per campaign
    const assignmentMap = new Map();
    for (const a of assignmentsAgg) {
      const campIdStr = a._id.campaignId.toString();
      if (!assignmentMap.has(campIdStr)) {
        assignmentMap.set(campIdStr, {
          uncontacted: 0,
          contacted: 0,
          in_discussion: 0,
          link_acquired: 0,
          rejected: 0,
          total: 0
        });
      }
      const stats = assignmentMap.get(campIdStr);
      const st = a._id.status;
      if (stats[st] !== undefined) {
        stats[st] += a.count;
      }
      stats.total += a.count;
    }

    // Status counts
    const statusCounts = {
      total: campaigns.length,
      active: campaigns.filter((c) => c.status === 'active').length,
      paused: campaigns.filter((c) => c.status === 'paused').length,
      completed: campaigns.filter((c) => c.status === 'completed').length,
      draft: campaigns.filter((c) => c.status === 'draft').length
    };

    // Calculate aggregated metrics
    let totalTarget = 0;
    let totalAcquired = 0;
    let totalAssigned = 0;

    const campaignList = campaigns.map((c) => {
      const campIdStr = c._id.toString();
      const aStats = assignmentMap.get(campIdStr) || {
        uncontacted: 0,
        contacted: 0,
        in_discussion: 0,
        link_acquired: 0,
        rejected: 0,
        total: 0
      };

      const target = c.targetBacklinks || 0;
      const acquired = aStats.link_acquired || c.metrics?.acquiredCount || 0;
      const progress = target > 0 ? Math.min(100, Math.round((acquired / target) * 100)) : 0;
      const conversionRate =
        aStats.total > 0 ? Math.round((acquired / aStats.total) * 1000) / 10 : 0;

      totalTarget += target;
      totalAcquired += acquired;
      totalAssigned += aStats.total;

      return {
        id: campIdStr,
        name: c.name,
        campaignType: c.campaignType,
        status: c.status,
        targetBacklinks: target,
        acquiredBacklinks: acquired,
        progressPercentage: progress,
        assignedProspects: aStats.total,
        conversionRate,
        pipeline: aStats,
        createdAt: c.createdAt
      };
    });

    // Top performing campaigns (sorted by acquired links descending)
    const topPerforming = [...campaignList]
      .sort((a, b) => b.acquiredBacklinks - a.acquiredBacklinks || b.progressPercentage - a.progressPercentage)
      .slice(0, 5);

    const overallProgress =
      totalTarget > 0 ? Math.min(100, Math.round((totalAcquired / totalTarget) * 100)) : 0;

    return {
      success: true,
      domain: website.domain,
      statusCounts,
      totals: {
        totalTargetBacklinks: totalTarget,
        totalAcquiredBacklinks: totalAcquired,
        totalAssignedProspects: totalAssigned,
        overallProgressPercentage: overallProgress
      },
      campaigns: campaignList,
      topPerforming
    };
  }

  /**
   * 4. Prospecting Analytics
   * Pipeline health, qualification distribution, opportunity score tiers,
   * contact email discovery rate, and discovery trends.
   */
  async getProspectAnalytics({ userId, websiteId, dateRange = '30d', customStart = null, customEnd = null }) {
    const website = await this.resolveWebsite(userId, websiteId);
    if (!website) {
      throw new Error('Website not found or access denied.');
    }

    const { current } = parseDateRange(dateRange, customStart, customEnd);
    const siteObjId = new mongoose.Types.ObjectId(website._id);
    const userObjId = new mongoose.Types.ObjectId(userId);

    const [
      totalProspects,
      qualificationAgg,
      contactStatusAgg,
      sourceAgg,
      scoreTiersAgg,
      discoveryEvents
    ] = await Promise.all([
      Prospect.countDocuments({ userId: userObjId, websiteId: siteObjId }),

      // Qualification status breakdown
      Prospect.aggregate([
        { $match: { userId: userObjId, websiteId: siteObjId } },
        { $group: { _id: { $ifNull: ['$qualificationStatus', 'unassessed'] }, count: { $sum: 1 } } }
      ]),

      // Contact discovery breakdown
      Prospect.aggregate([
        { $match: { userId: userObjId, websiteId: siteObjId } },
        { $group: { _id: { $ifNull: ['$contactStatus', 'not_searched'] }, count: { $sum: 1 } } }
      ]),

      // Source distribution
      Prospect.aggregate([
        { $match: { userId: userObjId, websiteId: siteObjId } },
        { $group: { _id: { $ifNull: ['$source', 'manual'] }, count: { $sum: 1 } } }
      ]),

      // Opportunity Score Tiers (0-20, 21-40, 41-60, 61-80, 81-100)
      Prospect.aggregate([
        {
          $match: {
            userId: userObjId,
            websiteId: siteObjId,
            opportunityScore: { $ne: null }
          }
        },
        {
          $bucket: {
            groupBy: '$opportunityScore',
            boundaries: [0, 21, 41, 61, 81, 101],
            default: 'Other',
            output: { count: { $sum: 1 } }
          }
        }
      ]),

      // Discovery trend (prospects created in range)
      Prospect.find({
        userId: userObjId,
        websiteId: siteObjId,
        createdAt: { $gte: current.startDate, $lte: current.endDate }
      })
        .select('createdAt')
        .sort({ createdAt: 1 })
        .lean()
    ]);

    // Format Qualification Distribution
    const qualificationMap = {
      qualified: 0,
      provisional: 0,
      rejected: 0,
      unassessed: 0
    };
    for (const q of qualificationAgg) {
      if (qualificationMap[q._id] !== undefined) {
        qualificationMap[q._id] = q.count;
      }
    }

    // Format Contact Status
    let emailsFound = 0;
    for (const c of contactStatusAgg) {
      if (c._id === 'found') emailsFound = c.count;
    }
    const contactDiscoveryRate =
      totalProspects > 0 ? Math.round((emailsFound / totalProspects) * 1000) / 10 : 0;

    // Format Score Tiers
    const scoreTierLabels = {
      0: '0 - 20 (Low Opportunity)',
      21: '21 - 40 (Moderate)',
      41: '41 - 60 (Good Potential)',
      61: '61 - 80 (High Priority)',
      81: '81 - 100 (Prime Target)'
    };
    const scoreTiers = [0, 21, 41, 61, 81].map((b) => {
      const found = scoreTiersAgg.find((t) => t._id === b);
      return {
        tier: scoreTierLabels[b],
        minScore: b,
        count: found ? found.count : 0
      };
    });

    // Group discovery by date
    const trendMap = new Map();
    for (const p of discoveryEvents) {
      const dayKey = new Date(p.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
      trendMap.set(dayKey, (trendMap.get(dayKey) || 0) + 1);
    }
    const discoveryTrend = Array.from(trendMap.entries()).map(([date, count]) => ({
      date,
      prospectsDiscovered: count
    }));

    return {
      success: true,
      domain: website.domain,
      totalProspects,
      qualificationStatus: qualificationMap,
      contactDiscovery: {
        emailsFound,
        totalProspects,
        contactDiscoveryRate
      },
      sources: sourceAgg.map((s) => ({ source: s._id, count: s.count })),
      opportunityScoreTiers: scoreTiers,
      discoveryTrend
    };
  }

  /**
   * 5. Outreach Analytics
   * Delivery status, sent timeline, follow-up queue, and campaign breakdown.
   * Genuinely tracks only what is stored in MongoDB (no fake open/click rates).
   */
  async getOutreachAnalytics({ userId, websiteId, dateRange = '30d', customStart = null, customEnd = null }) {
    const website = await this.resolveWebsite(userId, websiteId);
    if (!website) {
      throw new Error('Website not found or access denied.');
    }

    const { current } = parseDateRange(dateRange, customStart, customEnd);
    const siteObjId = new mongoose.Types.ObjectId(website._id);
    const userObjId = new mongoose.Types.ObjectId(userId);

    const [
      statusAgg,
      totalEmails,
      pendingFollowUps,
      completedFollowUps,
      emailsSentInRange,
      campaignOutreachAgg
    ] = await Promise.all([
      // Status breakdown (sent, pending, failed, cancelled)
      OutreachEmail.aggregate([
        { $match: { userId: userObjId, websiteId: siteObjId } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),

      OutreachEmail.countDocuments({ userId: userObjId, websiteId: siteObjId }),

      // Scheduled follow-ups
      ScheduledFollowUp.countDocuments({
        userId: userObjId,
        websiteId: siteObjId,
        status: 'scheduled'
      }),
      ScheduledFollowUp.countDocuments({
        userId: userObjId,
        websiteId: siteObjId,
        status: { $in: ['executed', 'sent'] }
      }),

      // Sent emails in date range for timeline
      OutreachEmail.find({
        userId: userObjId,
        websiteId: siteObjId,
        status: 'sent',
        sentAt: { $gte: current.startDate, $lte: current.endDate }
      })
        .select('sentAt openCount clickCount')
        .sort({ sentAt: 1 })
        .lean(),

      // Outreach by campaign
      OutreachEmail.aggregate([
        { $match: { userId: userObjId, websiteId: siteObjId } },
        {
          $group: {
            _id: '$campaignId',
            totalEmails: { $sum: 1 },
            sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } }
          }
        },
        { $sort: { totalEmails: -1 } },
        { $limit: 10 }
      ])
    ]);

    // Populate campaign names
    const campIds = campaignOutreachAgg.map((c) => c._id);
    const campaigns = await Campaign.find({ _id: { $in: campIds } })
      .select('name')
      .lean();
    const campNameMap = new Map(campaigns.map((c) => [c._id.toString(), c.name]));

    const campaignBreakdown = campaignOutreachAgg.map((item) => ({
      campaignId: item._id?.toString(),
      campaignName: campNameMap.get(item._id?.toString()) || 'General Outreach',
      totalEmails: item.totalEmails,
      sent: item.sent,
      pending: item.pending,
      failed: item.failed
    }));

    // Status map
    const statusMap = {
      sent: 0,
      pending: 0,
      failed: 0,
      cancelled: 0
    };
    for (const s of statusAgg) {
      if (statusMap[s._id] !== undefined) {
        statusMap[s._id] = s.count;
      }
    }

    // Timeline grouping by day
    const sentTimelineMap = new Map();
    let totalTrackedOpens = 0;
    let totalTrackedClicks = 0;

    for (const email of emailsSentInRange) {
      if (email.openCount > 0) totalTrackedOpens += email.openCount;
      if (email.clickCount > 0) totalTrackedClicks += email.clickCount;

      const dayKey = new Date(email.sentAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
      sentTimelineMap.set(dayKey, (sentTimelineMap.get(dayKey) || 0) + 1);
    }

    const sentActivityTimeline = Array.from(sentTimelineMap.entries()).map(([date, count]) => ({
      date,
      emailsSent: count
    }));

    return {
      success: true,
      domain: website.domain,
      overview: {
        totalEmails,
        sent: statusMap.sent,
        pending: statusMap.pending,
        failed: statusMap.failed,
        scheduledFollowUps: pendingFollowUps,
        executedFollowUps: completedFollowUps
      },
      statusDistribution: [
        { name: 'Sent', count: statusMap.sent, color: '#10B981' },
        { name: 'Pending Queue', count: statusMap.pending, color: '#F59E0B' },
        { name: 'Failed', count: statusMap.failed, color: '#EF4444' }
      ],
      sentActivityTimeline,
      campaignBreakdown,
      realEngagementTracking: {
        totalTrackedOpens,
        totalTrackedClicks,
        hasTrackingActivity: totalTrackedOpens > 0 || totalTrackedClicks > 0
      }
    };
  }

  /**
   * 6. SEO Performance Insights
   * Deterministic, data-backed insights derived from actual metrics.
   */
  async getSeoInsights({ userId, websiteId, dateRange = '30d', customStart = null, customEnd = null }) {
    const website = await this.resolveWebsite(userId, websiteId);
    if (!website) {
      throw new Error('Website not found or access denied.');
    }

    const [overview, backlinkAnalytics, campaignAnalytics, prospectAnalytics] =
      await Promise.all([
        this.getOverviewAnalytics({ userId, websiteId, dateRange, customStart, customEnd }),
        this.getBacklinkAnalytics({ userId, websiteId, dateRange, customStart, customEnd }),
        this.getCampaignAnalytics({ userId, websiteId, dateRange, customStart, customEnd }),
        this.getProspectAnalytics({ userId, websiteId, dateRange, customStart, customEnd })
      ]);

    const insights = [];

    // Insight 1: Net Backlink Growth
    const netGrowth = overview.netBacklinks.current;
    if (netGrowth > 0) {
      insights.push({
        type: 'growth',
        priority: 'high',
        title: 'Positive Net Backlink Growth',
        observation: `Acquired a net positive growth of +${netGrowth} backlinks during the selected period.`,
        metric: `+${netGrowth} Net Links`,
        whyItMatters: 'Positive backlink velocity signals increasing domain authority and relevance to search engines.',
        suggestedNextStep: 'Continue current outreach campaigns to maintain positive momentum.'
      });
    } else if (netGrowth < 0) {
      insights.push({
        type: 'warning',
        priority: 'high',
        title: 'Backlink Erosion Detected',
        observation: `Lost ${Math.abs(netGrowth)} more backlinks than were newly discovered in this period.`,
        metric: `${netGrowth} Net Loss`,
        whyItMatters: 'Sustained backlink loss leads to authority decay and ranking drops.',
        suggestedNextStep: 'Inspect dropped links in Backlink Monitoring and deploy reclaim outreach.'
      });
    }

    // Insight 2: Dofollow Ratio
    const dofollowEntry = backlinkAnalytics.linkTypeDistribution.find((l) => l.type === 'dofollow');
    const dofollowPct = dofollowEntry?.percentage || 0;
    if (backlinkAnalytics.totalSavedBacklinks > 0) {
      if (dofollowPct >= 60) {
        insights.push({
          type: 'success',
          priority: 'medium',
          title: 'Strong Dofollow Equity Balance',
          observation: `${dofollowPct}% of your indexed backlinks are dofollow (${dofollowEntry?.count || 0} links).`,
          metric: `${dofollowPct}% Dofollow`,
          whyItMatters: 'Dofollow links pass PageRank equity that directly strengthens your search engine rankings.',
          suggestedNextStep: 'Maintain high editorial standards for ongoing link acquisitions.'
        });
      } else {
        insights.push({
          type: 'recommendation',
          priority: 'high',
          title: 'Low Dofollow Ratio',
          observation: `Only ${dofollowPct}% of your indexed backlinks pass equity (dofollow).`,
          metric: `${dofollowPct}% Dofollow`,
          whyItMatters: 'A low dofollow ratio dampens the organic ranking impact of your link profile.',
          suggestedNextStep: 'Prioritize guest blogging and resource mentions that guarantee dofollow links.'
        });
      }
    }

    // Insight 3: Anchor Text Concentration
    if (backlinkAnalytics.anchorTextDistribution.length > 0) {
      const topAnchor = backlinkAnalytics.anchorTextDistribution[0];
      if (topAnchor.percentage > 35) {
        insights.push({
          type: 'warning',
          priority: 'medium',
          title: 'Anchor Text Concentration Alert',
          observation: `Anchor text "${topAnchor.anchorText}" accounts for ${topAnchor.percentage}% of all indexed backlinks.`,
          metric: `${topAnchor.percentage}% Dominance`,
          whyItMatters: 'Heavy concentration in a single commercial anchor text risks algorithmic over-optimization flags.',
          suggestedNextStep: 'Diversify future outreach anchors with branded and natural phrase variations.'
        });
      }
    }

    // Insight 4: High Potential Uncontacted Prospects
    const qualifiedProspects = prospectAnalytics.qualificationStatus.qualified || 0;
    const emailsFound = prospectAnalytics.contactDiscovery.emailsFound || 0;
    if (qualifiedProspects > 0 && emailsFound > 0) {
      insights.push({
        type: 'action',
        priority: 'high',
        title: 'Actionable Outreach Opportunities Ready',
        observation: `You have ${qualifiedProspects} qualified prospects with ${emailsFound} verified contact emails.`,
        metric: `${emailsFound} Verified Contacts`,
        whyItMatters: 'Pre-qualified prospects with valid email addresses have the highest reply and link-acquisition rates.',
        suggestedNextStep: 'Queue personalized outreach pitches in Outreach & Email Hub.'
      });
    }

    // Insight 5: Campaign Velocity
    if (campaignAnalytics.statusCounts.active === 0) {
      insights.push({
        type: 'warning',
        priority: 'high',
        title: 'No Active Campaigns Running',
        observation: 'You currently have zero active link-building campaigns.',
        metric: '0 Active Campaigns',
        whyItMatters: 'Without active outreach campaigns, backlink acquisition stalls.',
        suggestedNextStep: 'Create a new campaign or resume a paused campaign in Campaign Management.'
      });
    } else {
      const lagging = campaignAnalytics.campaigns.filter((c) => c.progressPercentage < 20);
      if (lagging.length > 0) {
        insights.push({
          type: 'recommendation',
          priority: 'medium',
          title: 'Campaign Momentum Check',
          observation: `${lagging.length} active campaign(s) are currently under 20% target completion.`,
          metric: `${lagging.length} Lagging Campaigns`,
          whyItMatters: 'Identifying stalled campaigns early prevents outreach pipelines from running dry.',
          suggestedNextStep: 'Expand discovery keywords or assign additional qualified prospects.'
        });
      }
    }

    return {
      success: true,
      domain: website.domain,
      totalInsights: insights.length,
      insights
    };
  }

  /**
   * 7. Executive Report Generation Data
   * Produces a comprehensive report payload ready for on-screen viewing,
   * printing, or PDF generation.
   */
  async generateReportData({ userId, websiteId, dateRange = '30d', customStart = null, customEnd = null }) {
    const website = await this.resolveWebsite(userId, websiteId);
    if (!website) {
      throw new Error('Website not found or access denied.');
    }

    const [overview, backlinkAnalytics, campaignAnalytics, prospectAnalytics, outreachAnalytics, insights] =
      await Promise.all([
        this.getOverviewAnalytics({ userId, websiteId, dateRange, customStart, customEnd }),
        this.getBacklinkAnalytics({ userId, websiteId, dateRange, customStart, customEnd }),
        this.getCampaignAnalytics({ userId, websiteId, dateRange, customStart, customEnd }),
        this.getProspectAnalytics({ userId, websiteId, dateRange, customStart, customEnd }),
        this.getOutreachAnalytics({ userId, websiteId, dateRange, customStart, customEnd }),
        this.getSeoInsights({ userId, websiteId, dateRange, customStart, customEnd })
      ]);

    const authoritySummary = await websiteMetricsService.getWebsiteAuthorityMetrics({
      userId,
      websiteId: website._id
    });

    return {
      success: true,
      meta: {
        reportTitle: 'Executive SEO & Backlink Performance Report',
        websiteName: website.name,
        domain: website.domain,
        url: website.url,
        generatedAt: new Date().toISOString(),
        reportingPeriod: overview.period.range,
        periodDates: `${new Date(overview.period.current.startDate).toLocaleDateString()} - ${new Date(overview.period.current.endDate).toLocaleDateString()}`
      },
      executiveSummary: {
        totalBacklinks: overview.kpis.totalBacklinks.current,
        referringDomains: overview.kpis.referringDomains.current,
        domainAuthority: authoritySummary.domainAuthority,
        pageAuthority: authoritySummary.pageAuthority,
        spamScore: authoritySummary.spamScore,
        netGrowth: overview.netBacklinks.current,
        activeCampaigns: campaignAnalytics.statusCounts.active,
        qualifiedProspects: prospectAnalytics.qualificationStatus.qualified,
        outreachEmailsSent: outreachAnalytics.overview.sent
      },
      kpis: overview.kpis,
      backlinks: {
        totalSaved: backlinkAnalytics.totalSavedBacklinks,
        linkTypeDistribution: backlinkAnalytics.linkTypeDistribution,
        statusDistribution: backlinkAnalytics.statusDistribution,
        topAnchors: backlinkAnalytics.anchorTextDistribution.slice(0, 5),
        authorityDistribution: backlinkAnalytics.authorityDistribution
      },
      campaigns: {
        statusCounts: campaignAnalytics.statusCounts,
        totals: campaignAnalytics.totals,
        topPerforming: campaignAnalytics.topPerforming
      },
      prospecting: {
        totalProspects: prospectAnalytics.totalProspects,
        qualificationStatus: prospectAnalytics.qualificationStatus,
        contactDiscoveryRate: prospectAnalytics.contactDiscovery.contactDiscoveryRate
      },
      outreach: outreachAnalytics.overview,
      recommendations: insights.insights
    };
  }
}

export const analyticsService = new AnalyticsService();
