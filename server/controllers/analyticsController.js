import { analyticsService } from '../services/analyticsService.js';
import { resolveUserWebsite } from '../utils/websiteResolver.js';

/**
 * Helper to extract common analytics query options from request
 */
function extractAnalyticsParams(req, website) {
  return {
    userId: req.user._id,
    websiteId: website._id,
    dateRange: req.query.range || req.query.dateRange || '30d',
    customStart: req.query.startDate || req.query.start || null,
    customEnd: req.query.endDate || req.query.end || null
  };
}

/**
 * GET /api/analytics/overview
 * Overview analytics with 8 KPIs, period comparison deltas, and net growth
 */
export const getOverview = async (req, res) => {
  try {
    const website = await resolveUserWebsite(req);
    const params = extractAnalyticsParams(req, website);
    const data = await analyticsService.getOverviewAnalytics(params);
    return res.status(200).json(data);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to retrieve analytics overview.'
    });
  }
};

/**
 * GET /api/analytics/backlinks
 * Backlink growth timeline, new vs lost bar chart, dofollow distribution,
 * anchor text distribution, and referring domain authority distribution
 */
export const getBacklinkAnalytics = async (req, res) => {
  try {
    const website = await resolveUserWebsite(req);
    const params = extractAnalyticsParams(req, website);
    const data = await analyticsService.getBacklinkAnalytics(params);
    return res.status(200).json(data);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to retrieve backlink analytics.'
    });
  }
};

/**
 * GET /api/analytics/campaigns
 * Campaign status distribution, progress comparison, prospect pipeline funnel
 */
export const getCampaignAnalytics = async (req, res) => {
  try {
    const website = await resolveUserWebsite(req);
    const params = extractAnalyticsParams(req, website);
    const data = await analyticsService.getCampaignAnalytics(params);
    return res.status(200).json(data);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to retrieve campaign analytics.'
    });
  }
};

/**
 * GET /api/analytics/prospects
 * Prospecting pipeline health, qualification distribution, score tiers, and contact rates
 */
export const getProspectAnalytics = async (req, res) => {
  try {
    const website = await resolveUserWebsite(req);
    const params = extractAnalyticsParams(req, website);
    const data = await analyticsService.getProspectAnalytics(params);
    return res.status(200).json(data);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to retrieve prospect analytics.'
    });
  }
};

/**
 * GET /api/analytics/outreach
 * Outreach email delivery status, sent activity timeline, follow-up queue
 */
export const getOutreachAnalytics = async (req, res) => {
  try {
    const website = await resolveUserWebsite(req);
    const params = extractAnalyticsParams(req, website);
    const data = await analyticsService.getOutreachAnalytics(params);
    return res.status(200).json(data);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to retrieve outreach analytics.'
    });
  }
};

/**
 * GET /api/analytics/insights
 * Deterministic actionable SEO performance insights
 */
export const getSeoInsights = async (req, res) => {
  try {
    const website = await resolveUserWebsite(req);
    const params = extractAnalyticsParams(req, website);
    const data = await analyticsService.getSeoInsights(params);
    return res.status(200).json(data);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to retrieve SEO insights.'
    });
  }
};

/**
 * GET /api/analytics/report
 * Complete executive report payload
 */
export const getExecutiveReport = async (req, res) => {
  try {
    const website = await resolveUserWebsite(req);
    const params = extractAnalyticsParams(req, website);
    const data = await analyticsService.generateReportData(params);
    return res.status(200).json(data);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to generate executive report.'
    });
  }
};

/**
 * GET /api/analytics/export/csv
 * Server-generated CSV export file
 */
export const exportAnalyticsCsv = async (req, res) => {
  try {
    const website = await resolveUserWebsite(req);
    const params = extractAnalyticsParams(req, website);
    const report = await analyticsService.generateReportData(params);

    const filename = `linkora-report-${website.domain}-${params.dateRange}-${new Date().toISOString().split('T')[0]}.csv`;

    let csv = '\uFEFF'; // UTF-8 BOM
    csv += '=== LINKORA EXECUTIVE SEO & BACKLINK PERFORMANCE REPORT ===\r\n';
    csv += `Target Website,${website.name} (${website.domain})\r\n`;
    csv += `Website URL,${website.url}\r\n`;
    csv += `Reporting Period,${report.meta.reportingPeriod} (${report.meta.periodDates})\r\n`;
    csv += `Generated At,${new Date(report.meta.generatedAt).toLocaleString()}\r\n\r\n`;

    // Section 1: Executive KPIs
    csv += '--- SECTION 1: KEY PERFORMANCE INDICATORS ---\r\n';
    csv += 'Metric,Current Value,Previous Period,Change,Status\r\n';
    const k = report.kpis;
    csv += `Total Backlinks,${k.totalBacklinks.current ?? 'N/A'},${k.totalBacklinks.previous ?? 'N/A'},${k.totalBacklinks.percentChange !== null ? `${k.totalBacklinks.percentChange}%` : 'N/A'},${k.totalBacklinks.hasComparison ? 'Compared' : 'First Record'}\r\n`;
    csv += `Referring Domains,${k.referringDomains.current ?? 'N/A'},${k.referringDomains.previous ?? 'N/A'},${k.referringDomains.percentChange !== null ? `${k.referringDomains.percentChange}%` : 'N/A'},${k.referringDomains.hasComparison ? 'Compared' : 'First Record'}\r\n`;
    csv += `Moz Domain Authority (DA),${k.domainAuthority.current ?? 'N/A'},${k.domainAuthority.previous ?? 'N/A'},${k.domainAuthority.absoluteChange !== null ? k.domainAuthority.absoluteChange : 'N/A'},${k.domainAuthority.hasComparison ? 'Compared' : 'First Record'}\r\n`;
    csv += `Moz Page Authority (PA),${k.pageAuthority.current ?? 'N/A'},${k.pageAuthority.previous ?? 'N/A'},${k.pageAuthority.absoluteChange !== null ? k.pageAuthority.absoluteChange : 'N/A'},${k.pageAuthority.hasComparison ? 'Compared' : 'First Record'}\r\n`;
    csv += `New Backlinks (Period),${k.newBacklinks.current ?? 0},${k.newBacklinks.previous ?? 0},${k.newBacklinks.percentChange !== null ? `${k.newBacklinks.percentChange}%` : 'N/A'},${k.newBacklinks.hasComparison ? 'Compared' : 'No Prior'}\r\n`;
    csv += `Lost Backlinks (Period),${k.lostBacklinks.current ?? 0},${k.lostBacklinks.previous ?? 0},${k.lostBacklinks.percentChange !== null ? `${k.lostBacklinks.percentChange}%` : 'N/A'},${k.lostBacklinks.hasComparison ? 'Compared' : 'No Prior'}\r\n`;
    csv += `Active Campaigns,${k.activeCampaigns.current ?? 0},${k.activeCampaigns.previous ?? 0},${k.activeCampaigns.absoluteChange !== null ? k.activeCampaigns.absoluteChange : 'N/A'},Active\r\n`;
    csv += `Qualified Prospects,${k.qualifiedProspects.current ?? 0},${k.qualifiedProspects.previous ?? 0},${k.qualifiedProspects.absoluteChange !== null ? k.qualifiedProspects.absoluteChange : 'N/A'},Qualified\r\n\r\n`;

    // Section 2: Top Anchors
    csv += '--- SECTION 2: TOP ANCHOR TEXTS ---\r\n';
    csv += 'Anchor Text,Occurrences,Percentage of Indexed Links\r\n';
    if (report.backlinks.topAnchors && report.backlinks.topAnchors.length > 0) {
      report.backlinks.topAnchors.forEach((a) => {
        csv += `"${(a.anchorText || '').replace(/"/g, '""')}",${a.count},${a.percentage}%\r\n`;
      });
    } else {
      csv += 'No anchor texts recorded,0,0%\r\n';
    }
    csv += '\r\n';

    // Section 3: Campaign Performance
    csv += '--- SECTION 3: TOP CAMPAIGNS ---\r\n';
    csv += 'Campaign Name,Type,Status,Target Links,Acquired Links,Progress,Assigned Prospects\r\n';
    if (report.campaigns.topPerforming && report.campaigns.topPerforming.length > 0) {
      report.campaigns.topPerforming.forEach((c) => {
        csv += `"${(c.name || '').replace(/"/g, '""')}",${c.campaignType},${c.status},${c.targetBacklinks},${c.acquiredBacklinks},${c.progressPercentage}%,${c.assignedProspects}\r\n`;
      });
    } else {
      csv += 'No campaigns found,N/A,N/A,0,0,0%,0\r\n';
    }
    csv += '\r\n';

    // Section 4: Strategic Recommendations
    csv += '--- SECTION 4: STRATEGIC SEO RECOMMENDATIONS ---\r\n';
    csv += 'Priority,Category,Finding,Action\r\n';
    if (report.recommendations && report.recommendations.length > 0) {
      report.recommendations.forEach((r) => {
        csv += `"${r.priority || 'medium'}","${r.title || ''}","${(r.observation || '').replace(/"/g, '""')}","${(r.suggestedNextStep || '').replace(/"/g, '""')}"\r\n`;
      });
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csv);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to export CSV.'
    });
  }
};
