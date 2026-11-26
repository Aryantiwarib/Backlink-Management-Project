import mongoose from 'mongoose';
import Website from '../models/Website.js';
import Backlink from '../models/Backlink.js';
import SeoSnapshot from '../models/SeoSnapshot.js';
import MonitoringEvent from '../models/MonitoringEvent.js';
import MonitoringScan from '../models/MonitoringScan.js';
import Campaign from '../models/Campaign.js';
import CampaignProspectAssignment from '../models/CampaignProspectAssignment.js';
import Prospect, { normalizeDomain } from '../models/Prospect.js';
import OutreachEmail from '../models/OutreachEmail.js';
import ScheduledFollowUp from '../models/ScheduledFollowUp.js';
import ConnectedEmailAccount from '../models/ConnectedEmailAccount.js';
import { websiteMetricsService } from './websiteMetricsService.js';

/**
 * OpenAI Tool/Function Definitions for LINKORA SEO Assistant
 */
export const ASSISTANT_TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'getWebsiteOverview',
      description: 'Get comprehensive profile, verification status, target keywords, Moz authority metrics, and database summary for the active website.',
      parameters: {
        type: 'object',
        properties: {
          websiteId: {
            type: 'string',
            description: 'Optional website ID. If omitted, uses the currently active website.'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getBacklinkSummary',
      description: 'Get authoritative backlink statistics including Moz web index metrics (total external backlinks, referring domains, Moz DA/PA, Spam Score) and LINKORA database records (saved backlink count, unique referring domains, dofollow/nofollow breakdown, average source DA, top anchor texts).',
      parameters: {
        type: 'object',
        properties: {
          websiteId: {
            type: 'string',
            description: 'Optional website ID.'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getNewBacklinks',
      description: 'Get recently discovered or mapped backlinks for the website.',
      parameters: {
        type: 'object',
        properties: {
          websiteId: {
            type: 'string',
            description: 'Optional website ID.'
          },
          limit: {
            type: 'number',
            description: 'Number of recent backlinks to retrieve (default 10, max 25).'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getLostBacklinks',
      description: 'Get backlinks detected as dropped, missing, or broken by the monitoring crawler.',
      parameters: {
        type: 'object',
        properties: {
          websiteId: {
            type: 'string',
            description: 'Optional website ID.'
          },
          limit: {
            type: 'number',
            description: 'Number of lost backlinks to retrieve (default 10, max 25).'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getCampaignSummary',
      description: 'Get a list of outreach campaigns with statuses, objectives, target backlinks, acquired links, and progress percentages.',
      parameters: {
        type: 'object',
        properties: {
          websiteId: {
            type: 'string',
            description: 'Optional website ID.'
          },
          status: {
            type: 'string',
            enum: ['all', 'active', 'paused', 'completed'],
            description: 'Filter by campaign status (default all).'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getCampaignDetails',
      description: 'Get in-depth details for a specific campaign, including assigned prospects, outreach pipeline stage counts, and discovery summary.',
      parameters: {
        type: 'object',
        properties: {
          campaignId: {
            type: 'string',
            description: 'Specific campaign ID.'
          },
          campaignName: {
            type: 'string',
            description: 'Optional campaign name to search if ID is unknown.'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getTopProspects',
      description: 'Retrieve top qualified link prospecting opportunities sorted by opportunity score and domain authority.',
      parameters: {
        type: 'object',
        properties: {
          websiteId: {
            type: 'string',
            description: 'Optional website ID.'
          },
          minScore: {
            type: 'number',
            description: 'Minimum opportunity score threshold (e.g. 50).'
          },
          hasEmail: {
            type: 'boolean',
            description: 'Filter to prospects with discovered contact email addresses.'
          },
          limit: {
            type: 'number',
            description: 'Maximum prospects to return (default 10, max 25).'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getProspectDetails',
      description: 'Get comprehensive details for a specific prospect domain or URL.',
      parameters: {
        type: 'object',
        properties: {
          domain: {
            type: 'string',
            description: 'The target domain name (e.g. "techcrunch.com").'
          }
        },
        required: ['domain']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getOutreachSummary',
      description: 'Get cold outreach statistics: queued, sent, opened, clicked, and pending follow-ups.',
      parameters: {
        type: 'object',
        properties: {
          websiteId: {
            type: 'string',
            description: 'Optional website ID.'
          },
          campaignId: {
            type: 'string',
            description: 'Optional campaign ID filter.'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getSeoRecommendations',
      description: 'Generate evidence-based SEO and link-building recommendations based on real lost backlinks, prospect availability, and campaign gaps.',
      parameters: {
        type: 'object',
        properties: {
          websiteId: {
            type: 'string',
            description: 'Optional website ID.'
          }
        }
      }
    }
  }
];

/**
 * Validate and resolve the authorized website for the user
 */
async function resolveAuthorizedWebsite(userId, websiteIdCandidate) {
  if (websiteIdCandidate) {
    let query = { userId };
    if (mongoose.Types.ObjectId.isValid(websiteIdCandidate)) {
      query._id = websiteIdCandidate;
    } else {
      query.domain = websiteIdCandidate.toLowerCase().trim();
    }
    const website = await Website.findOne(query);
    if (website) return website;
  }

  // Fallback only if no website was explicitly provided
  const defaultWebsite =
    (await Website.findOne({ userId, isActive: true })) ||
    (await Website.findOne({ userId }).sort({ createdAt: -1 }));
  return defaultWebsite;
}

/**
 * Tool Implementations
 */

// 1. Website Overview
async function executeGetWebsiteOverview({ userId, websiteId }) {
  const website = await resolveAuthorizedWebsite(userId, websiteId);
  if (!website) {
    return {
      success: false,
      message: 'No website found or registered for this account. Please register a website in Website Management.'
    };
  }

  const siteId = website._id;

  // Retrieve unified backlink & authority summary via single source of truth
  const summary = await websiteMetricsService.getWebsiteBacklinkSummary({
    userId,
    websiteId: siteId
  });

  // Campaign and prospect aggregates
  const [activeCampaigns, totalCampaigns, totalProspects, qualifiedProspects] =
    await Promise.all([
      Campaign.countDocuments({ websiteId: siteId, userId, status: 'active' }),
      Campaign.countDocuments({ websiteId: siteId, userId, status: { $ne: 'archived' } }),
      Prospect.countDocuments({ websiteId: siteId, userId }),
      Prospect.countDocuments({ websiteId: siteId, userId, qualificationStatus: 'qualified' })
    ]);

  return {
    success: true,
    website: {
      id: website._id.toString(),
      name: website.name,
      domain: website.domain,
      url: website.url,
      description: website.description || 'Not provided',
      verificationStatus: website.verificationStatus,
      verifiedAt: website.verifiedAt,
      registeredAt: website.createdAt
    },
    seoMetrics: summary.mozIndexMetrics?.hasData
      ? {
          domainAuthority: summary.domainAuthority,
          pageAuthority: summary.pageAuthority,
          referringDomainsMoz: summary.mozIndexMetrics.referringDomains,
          totalExternalBacklinksMoz: summary.mozIndexMetrics.totalBacklinks,
          spamScore: summary.spamScore,
          lastUpdated: summary.mozIndexMetrics.snapshotDate,
          provider: summary.mozIndexMetrics.provider
        }
      : {
          status: 'No live Moz SEO snapshot synchronized yet.'
        },
    databaseSummary: {
      savedBacklinks: summary.databaseRecords?.totalSavedBacklinks || 0,
      uniqueReferringDomains: summary.databaseRecords?.uniqueReferringDomains || 0,
      dofollowRatio: summary.databaseRecords?.dofollowRatio || 0,
      averageSourceDomainAuthority: summary.databaseRecords?.averageSourceDomainAuthority || null,
      totalProspects,
      qualifiedProspects,
      activeCampaigns,
      totalCampaigns
    },
    provenance: summary.provenance
  };
}

// 2. Backlink Summary
async function executeGetBacklinkSummary({ userId, websiteId }) {
  const website = await resolveAuthorizedWebsite(userId, websiteId);
  if (!website) {
    return { success: false, message: 'No authorized website available.' };
  }

  const summary = await websiteMetricsService.getWebsiteBacklinkSummary({
    userId,
    websiteId: website._id
  });

  if (!summary.success) {
    return summary;
  }

  if (summary.totalBacklinks === 0 && (!summary.databaseRecords || summary.databaseRecords.totalSavedBacklinks === 0)) {
    return {
      success: true,
      domain: website.domain,
      totalBacklinks: 0,
      referringDomains: 0,
      domainAuthority: null,
      pageAuthority: null,
      spamScore: null,
      mozIndexMetrics: {
        hasData: false,
        totalBacklinks: null,
        referringDomains: null,
        domainAuthority: null,
        pageAuthority: null,
        spamScore: null,
        snapshotDate: null,
        provider: 'moz'
      },
      databaseRecords: {
        totalSavedBacklinks: 0,
        uniqueReferringDomains: 0,
        dofollowCount: 0,
        nofollowCount: 0,
        dofollowPercentage: 0,
        dofollowRatio: 0,
        averageSourceDomainAuthority: null,
        averageSourcePageAuthority: null
      },
      message:
        'No backlink records or snapshots currently stored in MongoDB. Click "Sync Moz Data" on the Backlinks page to import live records.',
      provenance: summary.provenance
    };
  }

  return summary;
}

// 3. New Backlinks
async function executeGetNewBacklinks({ userId, websiteId, limit = 10, days = 30 }) {
  const website = await resolveAuthorizedWebsite(userId, websiteId);
  if (!website) return { success: false, message: 'No authorized website available.' };

  return await websiteMetricsService.getWebsiteNewBacklinks({
    userId,
    websiteId: website._id,
    limit,
    days
  });
}

// 4. Lost Backlinks
async function executeGetLostBacklinks({ userId, websiteId, limit = 10 }) {
  const website = await resolveAuthorizedWebsite(userId, websiteId);
  if (!website) return { success: false, message: 'No authorized website available.' };

  return await websiteMetricsService.getWebsiteLostBacklinks({
    userId,
    websiteId: website._id,
    limit
  });
}

// 5. Campaign Summary
async function executeGetCampaignSummary({ userId, websiteId, status = 'all' }) {
  const website = await resolveAuthorizedWebsite(userId, websiteId);
  if (!website) return { success: false, message: 'No authorized website available.' };

  const siteId = website._id;
  const filter = { websiteId: siteId, userId };
  if (status && status !== 'all') {
    filter.status = status;
  } else {
    filter.status = { $ne: 'archived' };
  }

  const campaigns = await Campaign.find(filter).sort({ updatedAt: -1 }).lean();

  const counts = {
    total: campaigns.length,
    active: campaigns.filter((c) => c.status === 'active').length,
    paused: campaigns.filter((c) => c.status === 'paused').length,
    completed: campaigns.filter((c) => c.status === 'completed').length,
    draft: campaigns.filter((c) => c.status === 'draft').length
  };

  return {
    success: true,
    domain: website.domain,
    overview: counts,
    campaigns: campaigns.map((c) => ({
      id: c._id.toString(),
      name: c.name,
      campaignType: c.campaignType,
      status: c.status,
      targetBacklinks: c.targetBacklinks || 0,
      acquiredBacklinks: c.metrics?.acquiredCount || 0,
      progressPercentage: c.metrics?.progressPercentage || 0,
      totalAssignedProspects: c.metrics?.totalAssigned || 0,
      discoveryStatus: c.discoveryStatus || 'pending',
      createdAt: c.createdAt
    }))
  };
}

// 6. Campaign Details
async function executeGetCampaignDetails({ userId, campaignId, campaignName }) {
  let query = { userId };
  if (campaignId && mongoose.Types.ObjectId.isValid(campaignId)) {
    query._id = campaignId;
  } else if (campaignName) {
    query.name = new RegExp(campaignName.trim(), 'i');
  } else {
    return { success: false, message: 'Please provide either campaignId or campaignName.' };
  }

  const campaign = await Campaign.findOne(query).lean();
  if (!campaign) {
    return { success: false, message: 'Campaign not found or access denied.' };
  }

  // Get prospect assignments
  const [assignments, totalAssigned, acquiredCount] = await Promise.all([
    CampaignProspectAssignment.find({ campaignId: campaign._id })
      .populate('prospectId', 'prospectDomain prospectUrl domainAuthority opportunityScore contactEmail')
      .limit(20)
      .lean(),
    CampaignProspectAssignment.countDocuments({ campaignId: campaign._id }),
    CampaignProspectAssignment.countDocuments({ campaignId: campaign._id, outreachStatus: 'link_acquired' })
  ]);

  const target = campaign.targetBacklinks || 0;
  const progressPercentage = target > 0 ? Math.min(100, Math.round((acquiredCount / target) * 100)) : 0;

  const statusBreakdown = {
    uncontacted: 0,
    contacted: 0,
    in_discussion: 0,
    link_acquired: 0,
    rejected: 0,
    archived: 0
  };

  for (const a of assignments) {
    if (statusBreakdown[a.outreachStatus] !== undefined) {
      statusBreakdown[a.outreachStatus]++;
    }
  }

  return {
    success: true,
    campaign: {
      id: campaign._id.toString(),
      name: campaign.name,
      objective: campaign.objective || campaign.description,
      campaignType: campaign.campaignType,
      status: campaign.status,
      targetBacklinks: campaign.targetBacklinks,
      acquiredCount,
      totalAssigned,
      progressPercentage,
      discoveryStatus: campaign.discoveryStatus,
      discoverySummary: campaign.discoverySummary || null,
      statusBreakdown,
      sampleAssignedProspects: assignments.slice(0, 8).map((a) => ({
        domain: a.prospectId?.prospectDomain || a.domain || 'Unknown',
        outreachStatus: a.outreachStatus,
        contactEmail: a.prospectId?.contactEmail || 'None',
        domainAuthority: a.prospectId?.domainAuthority ?? 'N/A',
        opportunityScore: a.prospectId?.opportunityScore ?? 'N/A'
      }))
    }
  };
}

// 7. Top Prospects
async function executeGetTopProspects({ userId, websiteId, minScore = 0, hasEmail = false, limit = 10 }) {
  const website = await resolveAuthorizedWebsite(userId, websiteId);
  if (!website) return { success: false, message: 'No authorized website available.' };

  const boundedLimit = Math.min(Math.max(1, Number(limit) || 10), 25);
  const siteId = website._id;

  const query = { websiteId: siteId, userId };
  if (minScore > 0) {
    query.opportunityScore = { $gte: Number(minScore) };
  }
  if (hasEmail) {
    query.contactEmail = { $exists: true, $ne: '' };
  }

  const prospects = await Prospect.find(query)
    .sort({ opportunityScore: -1, domainAuthority: -1 })
    .limit(boundedLimit)
    .lean();

  const totalInDb = await Prospect.countDocuments({ websiteId: siteId, userId });

  return {
    success: true,
    domain: website.domain,
    totalProspectsInPipeline: totalInDb,
    returnedCount: prospects.length,
    prospects: prospects.map((p) => ({
      domain: p.prospectDomain,
      opportunityScore: p.opportunityScore ?? 0,
      domainAuthority: p.domainAuthority ?? 'N/A',
      pageAuthority: p.pageAuthority ?? 'N/A',
      qualificationStatus: p.qualificationStatus,
      contactEmail: p.contactEmail || 'No email found',
      contactStatus: p.contactStatus,
      source: p.source,
      notes: p.notes || ''
    }))
  };
}

// 8. Prospect Details
async function executeGetProspectDetails({ userId, domain }) {
  if (!domain) return { success: false, message: 'Domain is required.' };
  const normalized = normalizeDomain(domain);

  const prospect = await Prospect.findOne({ userId, prospectDomain: normalized }).lean();
  if (!prospect) {
    return {
      success: false,
      message: `No prospect record found for domain "${normalized}". Try searching in Link Prospecting or adding it manually.`
    };
  }

  // Check campaign assignments
  const assignments = await CampaignProspectAssignment.find({ prospectId: prospect._id })
    .populate('campaignId', 'name status campaignType')
    .lean();

  return {
    success: true,
    prospect: {
      domain: prospect.prospectDomain,
      url: prospect.prospectUrl,
      domainAuthority: prospect.domainAuthority ?? 'N/A',
      pageAuthority: prospect.pageAuthority ?? 'N/A',
      opportunityScore: prospect.opportunityScore ?? 0,
      qualificationStatus: prospect.qualificationStatus,
      qualificationReasons: prospect.qualificationReasons || [],
      contactEmail: prospect.contactEmail || null,
      contactEmails: prospect.contactEmails || [],
      contactStatus: prospect.contactStatus,
      source: prospect.source,
      discoveredFrom: prospect.discoveredFrom,
      notes: prospect.notes || '',
      assignedCampaigns: assignments.map((a) => ({
        campaignId: a.campaignId?._id,
        campaignName: a.campaignId?.name || 'Unnamed',
        campaignStatus: a.campaignId?.status,
        outreachStatus: a.outreachStatus,
        notes: a.notes
      }))
    }
  };
}

// 9. Outreach Summary
async function executeGetOutreachSummary({ userId, websiteId, campaignId }) {
  const website = await resolveAuthorizedWebsite(userId, websiteId);
  if (!website) return { success: false, message: 'No authorized website available.' };

  const siteId = website._id;
  const filter = { websiteId: siteId, userId };
  if (campaignId && mongoose.Types.ObjectId.isValid(campaignId)) {
    filter.campaignId = campaignId;
  }

  const [totalQueued, totalSent, totalFailed, totalFollowUps, connectedAccount] = await Promise.all([
    OutreachEmail.countDocuments({ ...filter, status: 'pending' }),
    OutreachEmail.countDocuments({ ...filter, status: 'sent' }),
    OutreachEmail.countDocuments({ ...filter, status: 'failed' }),
    ScheduledFollowUp.countDocuments({ websiteId: siteId, userId, status: 'scheduled' }),
    ConnectedEmailAccount.findOne({ userId, status: 'connected' })
  ]);

  return {
    success: true,
    domain: website.domain,
    gmailConnection: {
      isConnected: Boolean(connectedAccount),
      email: connectedAccount?.email || 'Not connected'
    },
    outreachQueue: {
      queued: totalQueued,
      sent: totalSent,
      failed: totalFailed,
      scheduledFollowUps: totalFollowUps
    }
  };
}

// 10. SEO Recommendations
async function executeGetSeoRecommendations({ userId, websiteId }) {
  const website = await resolveAuthorizedWebsite(userId, websiteId);
  if (!website) return { success: false, message: 'No authorized website available.' };

  const siteId = website._id;

  // Gather real metrics for diagnosis
  const [
    lostEventsCount,
    backlinkCount,
    dofollowCount,
    totalProspects,
    highScoreUncontacted,
    activeCampaigns
  ] = await Promise.all([
    MonitoringEvent.countDocuments({ websiteId: siteId, eventType: 'lost_backlink' }),
    Backlink.countDocuments({ websiteId: siteId }),
    Backlink.countDocuments({ websiteId: siteId, linkType: 'dofollow' }),
    Prospect.countDocuments({ websiteId: siteId }),
    Prospect.countDocuments({
      websiteId: siteId,
      opportunityScore: { $gte: 60 },
      contactEmail: { $exists: true, $ne: '' }
    }),
    Campaign.find({ websiteId: siteId, status: 'active' }).lean()
  ]);

  const recommendations = [];

  // Rec 1: Lost backlink reclaim
  if (lostEventsCount > 0) {
    recommendations.push({
      priority: 'high',
      area: 'Backlink Retention',
      finding: `Detected ${lostEventsCount} dropped or lost backlink${lostEventsCount === 1 ? '' : 's'}.`,
      action: 'Review your lost backlinks in Backlink Monitoring and launch reclaim outreach before authority equity decays.'
    });
  }

  // Rec 2: Dofollow equity
  if (backlinkCount > 0) {
    const dofollowPct = Math.round((dofollowCount / backlinkCount) * 100);
    if (dofollowPct < 40) {
      recommendations.push({
        priority: 'high',
        area: 'Link Profile Balance',
        finding: `Only ${dofollowPct}% of your saved backlinks are dofollow (${dofollowCount} of ${backlinkCount}).`,
        action: 'Focus upcoming outreach campaigns on editorial guest posts and resource inclusions to increase dofollow link equity.'
      });
    }
  } else {
    recommendations.push({
      priority: 'medium',
      area: 'Backlink Inventory',
      finding: 'No backlink records are currently indexed in MongoDB for this domain.',
      action: 'Click "Sync Moz Data" on the Backlinks page to pull and store your live backlink profile.'
    });
  }

  // Rec 3: High score uncontacted prospects
  if (highScoreUncontacted > 0) {
    recommendations.push({
      priority: 'high',
      area: 'Outreach Pipeline',
      finding: `Found ${highScoreUncontacted} qualified prospects with Opportunity Score ≥ 60 and verified contact emails ready for outreach.`,
      action: 'Assign these prospects to an active campaign and queue customized outreach in Outreach & Email Hub.'
    });
  } else if (totalProspects < 10) {
    recommendations.push({
      priority: 'medium',
      area: 'Prospecting Volume',
      finding: `Pipeline currently has only ${totalProspects} prospects.`,
      action: 'Run automated campaign discovery or add keyword and competitor targets in Link Prospecting to populate fresh opportunities.'
    });
  }

  // Rec 4: Campaign progress check
  if (activeCampaigns.length === 0) {
    recommendations.push({
      priority: 'medium',
      area: 'Campaign Strategy',
      finding: 'You currently have no active link-building campaigns.',
      action: 'Create a new campaign (e.g. Guest Posting or Resource Page Outreach) to organize your prospects and outreach targets.'
    });
  } else {
    const stagnantCampaigns = activeCampaigns.filter(
      (c) => (c.metrics?.progressPercentage || 0) < 10 && (c.metrics?.totalAssigned || 0) > 0
    );
    if (stagnantCampaigns.length > 0) {
      recommendations.push({
        priority: 'medium',
        area: 'Campaign Momentum',
        finding: `${stagnantCampaigns.length} active campaign(s) have assigned prospects but less than 10% acquisition progress.`,
        action: 'Review campaign follow-up schedules and personalize outreach copy in templates to improve reply rates.'
      });
    }
  }

  return {
    success: true,
    domain: website.domain,
    summary: {
      backlinkCount,
      lostEventsCount,
      totalProspects,
      highScoreReadyProspects: highScoreUncontacted,
      activeCampaignsCount: activeCampaigns.length
    },
    recommendations
  };
}

/**
 * Main Tool Dispatcher
 */
export async function executeAssistantTool({ name, args = {}, context }) {
  const { userId, websiteId } = context;
  if (!userId) {
    throw new Error('Authentication required for assistant tool execution');
  }

  const effectiveArgs = {
    ...args,
    userId,
    websiteId: args.websiteId || websiteId
  };

  switch (name) {
    case 'getWebsiteOverview':
      return await executeGetWebsiteOverview(effectiveArgs);
    case 'getBacklinkSummary':
      return await executeGetBacklinkSummary(effectiveArgs);
    case 'getNewBacklinks':
      return await executeGetNewBacklinks(effectiveArgs);
    case 'getLostBacklinks':
      return await executeGetLostBacklinks(effectiveArgs);
    case 'getCampaignSummary':
      return await executeGetCampaignSummary(effectiveArgs);
    case 'getCampaignDetails':
      return await executeGetCampaignDetails(effectiveArgs);
    case 'getTopProspects':
      return await executeGetTopProspects(effectiveArgs);
    case 'getProspectDetails':
      return await executeGetProspectDetails(effectiveArgs);
    case 'getOutreachSummary':
      return await executeGetOutreachSummary(effectiveArgs);
    case 'getSeoRecommendations':
      return await executeGetSeoRecommendations(effectiveArgs);
    default:
      return {
        success: false,
        message: `Unknown tool "${name}". Supported tools: getWebsiteOverview, getBacklinkSummary, getNewBacklinks, getLostBacklinks, getCampaignSummary, getCampaignDetails, getTopProspects, getProspectDetails, getOutreachSummary, getSeoRecommendations.`
      };
  }
}
