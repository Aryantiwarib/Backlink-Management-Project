import SeoSnapshot from '../models/SeoSnapshot.js';
import Backlink from '../models/Backlink.js';
import Website from '../models/Website.js';

/**
 * Calculates absolute and percentage change between two metric values
 */
function calculateDelta(currentVal, prevVal) {
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

  if (prevVal !== 0) {
    percentChange = Math.round(((currentVal - prevVal) / Math.abs(prevVal)) * 1000) / 10;
  } else if (currentVal > 0) {
    percentChange = 100;
  } else {
    percentChange = 0;
  }

  return {
    current: currentVal,
    previous: prevVal,
    absoluteChange,
    percentChange,
    hasComparison: true,
    isPositive: absoluteChange >= 0
  };
}

export class DashboardService {
  /**
   * Aggregate complete dashboard data for a verified website
   * Reads exclusively from MongoDB (zero external provider queries)
   *
   * @param {Object} params
   * @param {ObjectId|string} params.userId
   * @param {ObjectId|string} params.websiteId
   * @returns {Promise<Object>} Structured dynamic dashboard payload
   */
  async getDashboardData({ userId, websiteId }) {
    if (!userId || !websiteId) {
      throw new Error('userId and websiteId are required to retrieve dashboard data.');
    }

    // 1. Verify website ownership
    const website = await Website.findOne({ _id: websiteId, userId }).lean();
    if (!website) {
      const err = new Error('Website not found in your account or access denied.');
      err.status = 404;
      throw err;
    }

    // 2. Query historical SEO snapshots (limit 30 for chart timelines)
    const snapshots = await SeoSnapshot.find({ userId, websiteId })
      .sort({ snapshotDate: -1 })
      .limit(30)
      .lean();

    // 3. Query saved backlink metrics and recent backlinks
    const [totalSavedBacklinks, dofollowCount, nofollowCount, recentBacklinksList] =
      await Promise.all([
        Backlink.countDocuments({ userId, websiteId }),
        Backlink.countDocuments({ userId, websiteId, linkType: 'dofollow' }),
        Backlink.countDocuments({ userId, websiteId, linkType: 'nofollow' }),
        Backlink.find({ userId, websiteId })
          .sort({ fetchedAt: -1, _id: -1 })
          .limit(5)
          .lean()
      ]);

    // Handle empty state: No snapshots in database yet
    if (!snapshots || snapshots.length === 0) {
      return {
        success: true,
        website: {
          id: website._id.toString(),
          _id: website._id.toString(),
          name: website.name,
          domain: website.domain,
          url: website.url,
          verificationStatus: website.verificationStatus,
          isActive: website.isActive,
          createdAt: website.createdAt
        },
        hasData: false,
        lastUpdated: null,
        metrics: {
          totalBacklinks: { current: null, hasComparison: false, status: 'no_data' },
          referringDomains: { current: null, hasComparison: false, status: 'no_data' },
          domainAuthority: { current: null, hasComparison: false, status: 'no_data' },
          pageAuthority: { current: null, hasComparison: false, status: 'no_data' },
          spamScore: { current: null, hasComparison: false, status: 'no_data' }
        },
        charts: {
          history: [],
          hasTrend: false,
          totalSnapshots: 0
        },
        linkAttributes: {
          total: totalSavedBacklinks,
          dofollowRatio: 0,
          distribution: []
        },
        recentBacklinks: [],
        recentActivity: [
          {
            id: `act-site-created-${website._id}`,
            type: 'website_registered',
            iconType: 'CheckCircle2',
            title: `Website "${website.name}" registered`,
            description: `Domain ${website.domain} added to Linkora workspace (${website.verificationStatus}).`,
            timestamp: new Date(website.createdAt).toLocaleDateString(),
            severity: 'info'
          }
        ],
        alerts: [
          ...(website.verificationStatus !== 'verified'
            ? [
                {
                  id: `alert-verify-${website._id}`,
                  title: 'Domain verification is pending',
                  description: `Add TXT record to DNS for ${website.domain} to verify ownership.`,
                  severity: 'warning',
                  actionLabel: 'Verify Domain',
                  targetRoute: '/websites'
                }
              ]
            : []),
          {
            id: `alert-no-snap-${website._id}`,
            title: 'No SEO snapshot recorded yet',
            description: 'Fetch your first backlink snapshot to track domain authority and growth.',
            severity: 'info',
            actionLabel: 'Fetch Metrics',
            targetRoute: '/seo-tools'
          }
        ]
      };
    }

    // 4. Extract latest and previous snapshots
    const latestSnapshot = snapshots[0];
    const previousSnapshot = snapshots.length > 1 ? snapshots[1] : null;

    // 5. Calculate metric deltas
    const metrics = {
      totalBacklinks: calculateDelta(latestSnapshot.totalBacklinks, previousSnapshot?.totalBacklinks),
      referringDomains: calculateDelta(latestSnapshot.referringDomains, previousSnapshot?.referringDomains),
      domainAuthority: calculateDelta(latestSnapshot.domainAuthority, previousSnapshot?.domainAuthority),
      pageAuthority: calculateDelta(latestSnapshot.pageAuthority, previousSnapshot?.pageAuthority),
      spamScore: calculateDelta(latestSnapshot.spamScore, previousSnapshot?.spamScore)
    };

    // 6. Chronological chart data (oldest to newest)
    const chronologicalSnapshots = [...snapshots].reverse();
    const chartHistory = chronologicalSnapshots.map((snap) => ({
      date: new Date(snap.snapshotDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      }),
      fullDate: snap.snapshotDate,
      totalBacklinks: snap.totalBacklinks,
      referringDomains: snap.referringDomains,
      domainAuthority: snap.domainAuthority,
      pageAuthority: snap.pageAuthority,
      spamScore: snap.spamScore,
      provider: snap.provider
    }));

    // Sparklines for KPI cards (last 7 points or all available points)
    const sparklineBacklinks = chartHistory.map((h) => h.totalBacklinks).filter((v) => v !== null);
    const sparklineDomains = chartHistory.map((h) => h.referringDomains).filter((v) => v !== null);
    const sparklineDA = chartHistory.map((h) => h.domainAuthority).filter((v) => v !== null);
    const sparklinePA = chartHistory.map((h) => h.pageAuthority).filter((v) => v !== null);

    // 7. Calculate Link Attributes Donut distribution
    let linkDistribution = [];
    let dofollowRatio = 0;
    if (totalSavedBacklinks > 0) {
      const dofollowPct = Math.round((dofollowCount / totalSavedBacklinks) * 100);
      const nofollowPct = Math.round((nofollowCount / totalSavedBacklinks) * 100);
      const otherCount = Math.max(0, totalSavedBacklinks - (dofollowCount + nofollowCount));
      const otherPct = Math.max(0, 100 - (dofollowPct + nofollowPct));

      dofollowRatio = dofollowPct;
      linkDistribution = [
        { name: 'Dofollow', value: dofollowPct, count: dofollowCount, color: '#10B981' },
        { name: 'Nofollow', value: nofollowPct, count: nofollowCount, color: '#3B82F6' },
        ...(otherCount > 0
          ? [{ name: 'Other', value: otherPct, count: otherCount, color: '#6B7280' }]
          : [])
      ];
    }

    // 8. Format recent backlinks for dashboard table
    const formattedRecentBacklinks = recentBacklinksList.map((b) => {
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
        linkType: b.linkType || 'unknown',
        domainRating: b.sourceDomainAuthority ?? null,
        pageRating: b.sourcePageAuthority ?? null,
        status: b.status || 'Active',
        provider: b.provider,
        acquiredDate: new Date(b.fetchedAt || b.createdAt).toLocaleDateString(),
        fetchedAt: b.fetchedAt
      };
    });

    // 9. Generate dynamic activity timeline from real events
    const recentActivity = [];

    // Latest snapshot activity
    recentActivity.push({
      id: `act-snap-${latestSnapshot._id}`,
      type: 'snapshot_recorded',
      iconType: 'CheckCircle2',
      title: 'SEO snapshot recorded',
      description: `${latestSnapshot.provider.toUpperCase()} indexed DA ${latestSnapshot.domainAuthority ?? 'N/A'}, PA ${latestSnapshot.pageAuthority ?? 'N/A'}, and ${Number(latestSnapshot.totalBacklinks || 0).toLocaleString()} backlinks.`,
      timestamp: new Date(latestSnapshot.snapshotDate).toLocaleString(),
      severity: 'success'
    });

    // Backlinks discovery activity
    if (formattedRecentBacklinks.length > 0) {
      const topLink = formattedRecentBacklinks[0];
      recentActivity.push({
        id: `act-link-${topLink.id}`,
        type: 'backlink_discovered',
        iconType: 'Link2',
        title: 'New backlink indexed',
        description: `${topLink.domain} linked to ${topLink.targetUrl} (rel="${topLink.linkType}").`,
        timestamp: topLink.acquiredDate,
        severity: 'info'
      });
    }

    // Domain verification status activity
    recentActivity.push({
      id: `act-site-status-${website._id}`,
      type: 'domain_status',
      iconType: website.verificationStatus === 'verified' ? 'ShieldCheck' : 'AlertCircle',
      title: `Domain ${website.verificationStatus === 'verified' ? 'ownership verified' : 'verification pending'}`,
      description: `Domain ${website.domain} verification status: ${website.verificationStatus} (${website.verificationMethod || 'DNS TXT'}).`,
      timestamp: website.verifiedAt
        ? new Date(website.verifiedAt).toLocaleDateString()
        : new Date(website.createdAt).toLocaleDateString(),
      severity: website.verificationStatus === 'verified' ? 'success' : 'warning'
    });

    // 10. Generate dynamic actionable alerts from database state
    const alerts = [];

    if (website.verificationStatus !== 'verified') {
      alerts.push({
        id: `alert-verify-${website._id}`,
        title: 'Domain verification is pending',
        description: `Add TXT record to DNS for ${website.domain} to verify ownership.`,
        severity: 'warning',
        actionLabel: 'Verify Domain',
        targetRoute: '/websites'
      });
    }

    if (
      latestSnapshot.spamScore !== null &&
      latestSnapshot.spamScore !== undefined &&
      latestSnapshot.spamScore > 30
    ) {
      alerts.push({
        id: `alert-spam-${latestSnapshot._id}`,
        title: `Elevated Spam Score detected (${latestSnapshot.spamScore}%)`,
        description: `Moz reported a Spam Score of ${latestSnapshot.spamScore}% on ${website.domain}. Review linking domains.`,
        severity: 'error',
        actionLabel: 'Inspect Metrics',
        targetRoute: '/seo-tools'
      });
    }

    return {
      success: true,
      website: {
        id: website._id.toString(),
        _id: website._id.toString(),
        name: website.name,
        domain: website.domain,
        url: website.url,
        verificationStatus: website.verificationStatus,
        isActive: website.isActive,
        createdAt: website.createdAt
      },
      hasData: true,
      lastUpdated: latestSnapshot.snapshotDate || latestSnapshot.fetchedAt,
      provider: latestSnapshot.provider,
      metrics,
      sparklines: {
        totalBacklinks: sparklineBacklinks,
        referringDomains: sparklineDomains,
        domainAuthority: sparklineDA,
        pageAuthority: sparklinePA
      },
      charts: {
        history: chartHistory,
        hasTrend: chartHistory.length > 1,
        totalSnapshots: snapshots.length
      },
      linkAttributes: {
        total: totalSavedBacklinks,
        dofollowRatio,
        distribution: linkDistribution
      },
      recentBacklinks: formattedRecentBacklinks,
      recentActivity,
      alerts
    };
  }
}

export const dashboardService = new DashboardService();
