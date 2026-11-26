import mongoose from 'mongoose';
import Website from '../../models/Website.js';
import Campaign from '../../models/Campaign.js';
import Prospect, { normalizeDomain } from '../../models/Prospect.js';
import CampaignProspectAssignment from '../../models/CampaignProspectAssignment.js';
import { searchDiscoveryProvider } from './providers/searchDiscoveryProvider.js';
import { competitorDiscoveryProvider } from './providers/competitorDiscoveryProvider.js';
import { seoService } from '../seo/seoService.js';
import { calculateOpportunityScore } from './opportunityScorer.js';
import { contactDiscoveryService } from './contactDiscoveryService.js';
import { campaignService } from '../campaignService.js';

// Social, tech directory, and non-target utility domains
const IRRELEVANT_DOMAINS = new Set([
  'google.com',
  'google.co.in',
  'google.co.uk',
  'bing.com',
  'yahoo.com',
  'duckduckgo.com',
  'baidu.com',
  'yandex.com',
  'facebook.com',
  'twitter.com',
  'x.com',
  'instagram.com',
  'linkedin.com',
  'youtube.com',
  'tiktok.com',
  'pinterest.com',
  'reddit.com',
  'quora.com',
  'medium.com',
  'wikipedia.org',
  'wikimedia.org',
  'github.com',
  'gitlab.com',
  'bitbucket.org',
  'apple.com',
  'microsoft.com',
  'amazon.com',
  'w3.org',
  'schema.org',
  'wordpress.org',
  'wordpress.com',
  'cloudflare.com',
  'gravatar.com',
  't.co',
  'bit.ly',
  'tinyurl.com',
  'buffer.com',
  'canva.com',
  'spotify.com',
  'netflix.com',
  'zoom.us',
  'w3schools.com',
  'stackoverflow.com',
  'stackexchange.com'
]);

export class CampaignDiscoveryService {
  /**
   * Generate intelligent, niche-targeted queries based on campaign parameters
   */
  generateSearchQueries({
    niche = '',
    primaryKeywords = [],
    additionalKeywords = [],
    campaignType = 'General Link Building'
  } = {}) {
    const cleanNiche = niche.trim();
    const cleanPrimary = (primaryKeywords || []).map((k) => k.trim()).filter(Boolean);
    const cleanAdditional = (additionalKeywords || []).map((k) => k.trim()).filter(Boolean);

    const queries = [];

    // 1. Niche & authority queries
    if (cleanNiche) {
      queries.push(`"${cleanNiche}" blogs`);
      queries.push(`"${cleanNiche}" "write for us"`);
      queries.push(`"${cleanNiche}" "resources"`);
    }

    // 2. Primary keyword variations
    for (const kw of cleanPrimary) {
      queries.push(`"${kw}" blog`);
      if (campaignType === 'Guest Posting' || campaignType === 'General Link Building') {
        queries.push(`"${kw}" "write for us"`);
        queries.push(`"${kw}" "guest post"`);
      } else if (campaignType === 'Resource Page Outreach') {
        queries.push(`"${kw}" "resources"`);
        queries.push(`"${kw}" "useful links"`);
      } else {
        queries.push(`"${kw}" guides tutorials`);
      }
    }

    // 3. Additional keywords
    for (const kw of cleanAdditional.slice(0, 3)) {
      queries.push(`"${kw}" industry blog`);
    }

    // Fallback if no keywords provided
    if (queries.length === 0) {
      queries.push(cleanNiche ? `"${cleanNiche}" authority sites` : 'technology blogs resources');
    }

    // Return unique queries (max 6 to preserve search API quota)
    return Array.from(new Set(queries)).slice(0, 6);
  }

  /**
   * Check if a domain is irrelevant, blacklisted, or matches user website
   */
  isIrrelevantDomain(domain, userDomain = '', excludedSet = new Set()) {
    if (!domain) return true;
    const clean = normalizeDomain(domain);
    if (!clean) return true;

    // Check user domain
    if (userDomain && clean === normalizeDomain(userDomain)) return true;

    // Check excluded set
    if (excludedSet.has(clean)) return true;

    // Check blacklisted root domains
    if (IRRELEVANT_DOMAINS.has(clean)) return true;

    // Check if domain is subdomain of irrelevant domain (e.g. en.wikipedia.org)
    for (const bad of IRRELEVANT_DOMAINS) {
      if (clean === bad || clean.endsWith(`.${bad}`)) return true;
    }

    return false;
  }

  /**
   * Run the full automated campaign discovery, qualification, and assignment pipeline
   */
  async runCampaignDiscovery({ userId, websiteId, campaignId }) {
    if (!userId || !websiteId || !campaignId) {
      throw new Error('userId, websiteId, and campaignId are required.');
    }

    const website = await Website.findOne({ _id: websiteId, userId });
    if (!website) {
      const err = new Error('Website not found or does not belong to user.');
      err.status = 404;
      throw err;
    }

    const campaign = await Campaign.findOne({ _id: campaignId, userId, websiteId });
    if (!campaign) {
      const err = new Error('Campaign not found or unauthorized.');
      err.status = 404;
      throw err;
    }

    if (campaign.status === 'paused') {
      const err = new Error('Campaign is currently paused. Please resume the campaign to run automated discovery.');
      err.status = 400;
      throw err;
    }
    if (campaign.status === 'completed' || campaign.status === 'archived') {
      const err = new Error(`Cannot run discovery on a ${campaign.status} campaign.`);
      err.status = 400;
      throw err;
    }

    // Update status to discovering
    campaign.discoveryStatus = 'discovering';
    campaign.discoverySummary = campaign.discoverySummary || {};
    campaign.discoverySummary.startedAt = new Date();
    campaign.discoverySummary.errors = [];
    campaign.discoverySummary.warnings = [];
    await campaign.save();

    const userDomain = website.domain;
    const criteria = campaign.qualificationCriteria || {};
    const excludedDomainsList = Array.isArray(criteria.excludedDomains) ? criteria.excludedDomains : [];
    const excludedSet = new Set(excludedDomainsList.map(normalizeDomain).filter(Boolean));

    // Also exclude prospects that the user previously manually removed/excluded from this campaign
    const existingExcludedAssignments = await CampaignProspectAssignment.find({
      campaignId,
      userId,
      websiteId,
      isExcluded: true
    }).populate('prospectId');

    for (const a of existingExcludedAssignments) {
      if (a.prospectId?.prospectDomain) {
        excludedSet.add(a.prospectId.prospectDomain);
      }
    }

    const sources = campaign.discoverySources || {
      enableKeywordDiscovery: true,
      enableCompetitorDiscovery: true
    };

    let keywordResults = [];
    let competitorResults = [];
    let keywordFailed = false;
    let competitorFailed = false;

    // =========================================================================
    // 1. KEYWORD DISCOVERY
    // =========================================================================
    if (sources.enableKeywordDiscovery !== false) {
      try {
        const queries = this.generateSearchQueries({
          niche: campaign.niche,
          primaryKeywords: campaign.primaryKeywords,
          additionalKeywords: campaign.additionalKeywords,
          campaignType: campaign.campaignType
        });

        const perQueryLimit = Math.max(10, Math.ceil((campaign.targetProspects || 50) / queries.length));

        for (const q of queries) {
          try {
            const rawCandidates = await searchDiscoveryProvider.discover({
              keyword: q,
              userDomain,
              excludedDomains: excludedSet,
              limit: perQueryLimit
            });
            keywordResults.push(...rawCandidates);
          } catch (qErr) {
            console.warn(`[CampaignDiscovery] Query "${q}" failed:`, qErr.message);
            campaign.discoverySummary.warnings.push({
              source: 'keyword',
              message: `Search query "${q}" failed: ${qErr.message}`,
              timestamp: new Date()
            });
          }
        }

        if (queries.length > 0 && keywordResults.length === 0) {
          keywordFailed = true;
        }
      } catch (kwErr) {
        console.error('[CampaignDiscovery] Keyword discovery failed:', kwErr.message);
        keywordFailed = true;
        campaign.discoverySummary.warnings.push({
          source: 'keyword',
          message: `Keyword discovery could not execute: ${kwErr.message}`,
          timestamp: new Date()
        });
      }
    }

    // =========================================================================
    // 2. COMPETITOR BACKLINK DISCOVERY
    // =========================================================================
    const competitors = (campaign.competitorDomains || []).map(normalizeDomain).filter(Boolean);

    if (sources.enableCompetitorDiscovery !== false && competitors.length > 0) {
      try {
        competitorResults = await competitorDiscoveryProvider.discover({
          competitorDomains: competitors,
          userDomain,
          excludedDomains: excludedSet,
          limitPerCompetitor: Math.max(15, Math.ceil((campaign.targetProspects || 50) / competitors.length))
        });
      } catch (compErr) {
        console.error('[CampaignDiscovery] Competitor discovery failed:', compErr.message);
        competitorFailed = true;
        campaign.discoverySummary.warnings.push({
          source: 'competitor',
          message: `Competitor backlink discovery could not execute: ${compErr.message}`,
          timestamp: new Date()
        });
      }
    }

    // Check if all attempted sources failed
    const attemptedKeyword = sources.enableKeywordDiscovery !== false;
    const attemptedCompetitor = sources.enableCompetitorDiscovery !== false && competitors.length > 0;

    const allAttemptedFailed =
      (attemptedKeyword && keywordFailed && (!attemptedCompetitor || competitorFailed)) ||
      (attemptedCompetitor && competitorFailed && (!attemptedKeyword || keywordFailed));

    if (allAttemptedFailed) {
      campaign.discoveryStatus = 'failed';
      campaign.discoverySummary.errors.push({
        source: 'all',
        message: 'All attempted discovery providers failed to return results.',
        timestamp: new Date()
      });
      await campaign.save();

      throw new Error(
        'Campaign discovery failed: Both keyword discovery and competitor backlink providers were unavailable or failed.'
      );
    }

    // =========================================================================
    // 3. MERGE, DEDUPLICATE AND NORMALIZE
    // =========================================================================
    campaign.discoveryStatus = 'enriching';
    await campaign.save();

    const candidateMap = new Map();

    // Ingest keyword results
    for (const item of keywordResults) {
      const domain = normalizeDomain(item.prospectDomain || item.prospectUrl);
      if (this.isIrrelevantDomain(domain, userDomain, excludedSet)) continue;

      if (!candidateMap.has(domain)) {
        candidateMap.set(domain, {
          prospectDomain: domain,
          prospectUrl: item.prospectUrl || `https://${domain}`,
          source: 'keyword',
          discoveredFrom: item.discoveredFrom || `Keyword: ${campaign.niche}`,
          discoveryKeyword: item.discoveryKeyword || campaign.niche || '',
          competitorDomains: [],
          domainAuthority: item.domainAuthority ?? null,
          pageAuthority: item.pageAuthority ?? null,
          spamScore: item.spamScore ?? null,
          opportunityScore: item.opportunityScore ?? null,
          opportunityFactors: item.opportunityFactors || [],
          linkType: item.linkType || 'unknown'
        });
      }
    }

    // Ingest competitor results (merge overlapping)
    for (const item of competitorResults) {
      const domain = normalizeDomain(item.prospectDomain || item.prospectUrl);
      if (this.isIrrelevantDomain(domain, userDomain, excludedSet)) continue;

      if (candidateMap.has(domain)) {
        const existing = candidateMap.get(domain);
        // Merge competitor domains
        if (Array.isArray(item.competitorDomains)) {
          const compSet = new Set([...existing.competitorDomains, ...item.competitorDomains]);
          existing.competitorDomains = Array.from(compSet);
        }
        if (item.domainAuthority !== null && existing.domainAuthority === null) {
          existing.domainAuthority = item.domainAuthority;
        }
        if (item.pageAuthority !== null && existing.pageAuthority === null) {
          existing.pageAuthority = item.pageAuthority;
        }
      } else {
        candidateMap.set(domain, {
          prospectDomain: domain,
          prospectUrl: item.prospectUrl || `https://${domain}`,
          source: 'competitor',
          discoveredFrom: item.discoveredFrom || '',
          discoveryKeyword: campaign.niche || '',
          competitorDomains: item.competitorDomains || [],
          domainAuthority: item.domainAuthority ?? null,
          pageAuthority: item.pageAuthority ?? null,
          spamScore: item.spamScore ?? null,
          opportunityScore: item.opportunityScore ?? null,
          opportunityFactors: item.opportunityFactors || [],
          linkType: item.linkType || 'unknown'
        });
      }
    }

    const uniqueCandidates = Array.from(candidateMap.values());
    const totalDiscovered = keywordResults.length + competitorResults.length;
    const uniqueDomainsCount = uniqueCandidates.length;
    const duplicateCount = Math.max(0, totalDiscovered - uniqueDomainsCount);

    let enrichmentSuccessCount = 0;
    let enrichmentFailureCount = 0;

    // =========================================================================
    // 4. METRIC ENRICHMENT & SCORING
    // =========================================================================
    // Enrich candidates that are missing DA (limit batch to avoid exhausting quota)
    const candidatesToEnrich = uniqueCandidates.filter((c) => c.domainAuthority === null).slice(0, 20);

    for (let i = 0; i < candidatesToEnrich.length; i++) {
      const candidate = candidatesToEnrich[i];
      try {
        const overview = await seoService.getOverview(candidate.prospectDomain);
        if (overview?.data) {
          const d = overview.data;
          candidate.domainAuthority = d.domainAuthority ?? d.domainRating ?? candidate.domainAuthority;
          candidate.pageAuthority = d.pageAuthority ?? candidate.pageAuthority;
          candidate.spamScore = d.spamScore ?? candidate.spamScore;
          enrichmentSuccessCount++;
        }
      } catch (enrichErr) {
        enrichmentFailureCount++;
        console.warn(`[CampaignDiscovery] Enrichment skipped for ${candidate.prospectDomain}:`, enrichErr.message);

        // Record clear diagnostic warning instead of silently swallowing
        if (!campaign.discoverySummary.warnings.some((w) => w.source === 'enrichment')) {
          campaign.discoverySummary.warnings.push({
            source: 'enrichment',
            message: `SEO Provider (${seoService.provider?.name || 'Moz'}) metric enrichment notice: ${enrichErr.message}. Prospects evaluated using search ranking & baseline opportunity scoring.`,
            timestamp: new Date()
          });
        }

        // If provider fails with auth (401/403), unconfigured (503), or rate limit (429), break loop immediately
        if (enrichErr.status === 401 || enrichErr.status === 403 || enrichErr.status === 503 || enrichErr.status === 429) {
          const remaining = candidatesToEnrich.length - (i + 1);
          if (remaining > 0) {
            enrichmentFailureCount += remaining;
          }
          break;
        }
      }
    }

    // Recompute opportunity score for all candidates
    for (const candidate of uniqueCandidates) {
      const scoring = calculateOpportunityScore({
        domainAuthority: candidate.domainAuthority,
        spamScore: candidate.spamScore,
        competitorOverlap: candidate.competitorDomains.length,
        source: candidate.source,
        linkType: candidate.linkType
      });
      candidate.opportunityScore = scoring.score;
      candidate.opportunityFactors = scoring.factors;
    }

    // =========================================================================
    // 5. QUALIFICATION FILTERING
    // =========================================================================
    campaign.discoveryStatus = 'filtering';
    await campaign.save();

    // Check existing global prospects to respect user history
    const existingProspects = await Prospect.find({
      userId,
      websiteId,
      prospectDomain: { $in: uniqueCandidates.map((c) => c.prospectDomain) }
    }).lean();

    const existingProspectMap = new Map();
    for (const ep of existingProspects) {
      existingProspectMap.set(ep.prospectDomain, ep);
    }

    // Check previous contacts and rejections across all campaigns
    const existingAssignments = await CampaignProspectAssignment.find({
      userId,
      websiteId,
      prospectId: { $in: existingProspects.map((ep) => ep._id) }
    }).lean();

    const contactedProspectIds = new Set();
    const rejectedProspectIds = new Set();
    for (const a of existingAssignments) {
      const pId = a.prospectId.toString();
      if (a.outreachStatus !== 'uncontacted' || a.contactedAt) {
        contactedProspectIds.add(pId);
      }
      if (a.outreachStatus === 'rejected') {
        rejectedProspectIds.add(pId);
      }
    }

    const minDA = criteria.minDomainAuthority ?? 20;
    const minPA = criteria.minPageAuthority ?? 0;
    const maxSpam = criteria.maxSpamScore ?? 30;
    const minScore = criteria.minOpportunityScore ?? 40; // Align with schema default (40)
    const excludeContacted = criteria.excludeContacted !== false;
    const excludeRejected = criteria.excludeRejected !== false;

    const qualifiedCandidates = [];
    const provisionalCandidates = [];
    const rejectedCandidates = [];
    const rejectionBreakdown = {
      previouslyContacted: 0,
      previouslyRejected: 0,
      daBelowThreshold: 0,
      paBelowThreshold: 0,
      spamAboveThreshold: 0,
      scoreBelowThreshold: 0,
      userExcluded: 0
    };

    for (const candidate of uniqueCandidates) {
      const existing = existingProspectMap.get(candidate.prospectDomain);

      // Exclude if user explicitly excluded this domain
      if (excludedSet.has(candidate.prospectDomain)) {
        candidate.rejectionReason = 'Domain is in campaign excluded domains list';
        rejectionBreakdown.userExcluded++;
        rejectedCandidates.push(candidate);
        continue;
      }

      // Exclude if previously contacted
      if (excludeContacted && existing) {
        if (existing.lastContactedAt || contactedProspectIds.has(existing._id.toString())) {
          candidate.rejectionReason = 'Previously contacted in prior outreach';
          rejectionBreakdown.previouslyContacted++;
          rejectedCandidates.push(candidate);
          continue;
        }
      }

      // Exclude if previously rejected
      if (excludeRejected && existing) {
        if (existing.status === 'rejected' || rejectedProspectIds.has(existing._id.toString())) {
          candidate.rejectionReason = 'Previously marked as rejected';
          rejectionBreakdown.previouslyRejected++;
          rejectedCandidates.push(candidate);
          continue;
        }
      }

      // DA filter (if DA is known)
      if (candidate.domainAuthority !== null && candidate.domainAuthority < minDA) {
        candidate.qualificationStatus = 'rejected';
        candidate.rejectionReason = `Domain Authority (${candidate.domainAuthority}) is below required minimum (${minDA})`;
        rejectionBreakdown.daBelowThreshold++;
        rejectedCandidates.push(candidate);
        continue;
      }

      // PA filter (if PA is known)
      if (minPA > 0 && candidate.pageAuthority !== null && candidate.pageAuthority < minPA) {
        candidate.qualificationStatus = 'rejected';
        candidate.rejectionReason = `Page Authority (${candidate.pageAuthority}) is below required minimum (${minPA})`;
        rejectionBreakdown.paBelowThreshold++;
        rejectedCandidates.push(candidate);
        continue;
      }

      // Spam score filter (if Spam score is known)
      if (candidate.spamScore !== null && candidate.spamScore > maxSpam) {
        candidate.qualificationStatus = 'rejected';
        candidate.rejectionReason = `Spam Score (${candidate.spamScore}%) exceeds maximum limit (${maxSpam}%)`;
        rejectionBreakdown.spamAboveThreshold++;
        rejectedCandidates.push(candidate);
        continue;
      }

      // Opportunity score filter
      if ((candidate.opportunityScore || 0) < minScore) {
        candidate.qualificationStatus = 'rejected';
        candidate.rejectionReason = `Opportunity Score (${candidate.opportunityScore || 0}) is below minimum threshold (${minScore})`;
        rejectionBreakdown.scoreBelowThreshold++;
        rejectedCandidates.push(candidate);
        continue;
      }

      // Distinguish fully verified DA vs provisional (DA unassessed from SEO provider)
      if (candidate.domainAuthority !== null && candidate.domainAuthority >= minDA) {
        candidate.qualificationStatus = 'qualified';
        candidate.qualificationReason = `Qualified: Domain Authority (${candidate.domainAuthority} >= ${minDA}) verified; Opportunity Score (${candidate.opportunityScore} >= ${minScore})`;
        qualifiedCandidates.push(candidate);
      } else {
        candidate.qualificationStatus = 'provisional';
        candidate.qualificationReason = `Provisional: Topical match discovered via keyword search; Domain Authority unassessed from SEO provider (Opportunity Score ${candidate.opportunityScore} >= ${minScore})`;
        provisionalCandidates.push(candidate);
      }
    }

    // Combine all eligible candidates (both verified and provisional)
    const allEligibleCandidates = [...qualifiedCandidates, ...provisionalCandidates];

    // Sort eligible candidates by opportunityScore descending
    allEligibleCandidates.sort((a, b) => (b.opportunityScore || 0) - (a.opportunityScore || 0));

    // Slice to target count
    const targetCount = campaign.targetProspects || 50;
    const selectedProspects = allEligibleCandidates.slice(0, targetCount);

    // =========================================================================
    // 6. PERSIST PROSPECTS IN GLOBAL COLLECTION
    // =========================================================================
    campaign.discoveryStatus = 'assigning';
    await campaign.save();

    const prospectIdList = [];
    const prospectCandidateMap = new Map();

    // Save and link all qualified candidates
    for (const candidate of selectedProspects) {
      let prospectDoc = await Prospect.findOne({
        userId,
        websiteId,
        prospectDomain: candidate.prospectDomain
      });

      if (prospectDoc) {
        // Reuse existing record, merge new signals
        if (candidate.domainAuthority !== null && prospectDoc.domainAuthority === null) {
          prospectDoc.domainAuthority = candidate.domainAuthority;
        }
        if (candidate.pageAuthority !== null && prospectDoc.pageAuthority === null) {
          prospectDoc.pageAuthority = candidate.pageAuthority;
        }
        if (candidate.spamScore !== null && prospectDoc.spamScore === null) {
          prospectDoc.spamScore = candidate.spamScore;
        }
        if (candidate.opportunityScore !== null) {
          prospectDoc.opportunityScore = candidate.opportunityScore;
          prospectDoc.opportunityFactors = candidate.opportunityFactors;
        }
        if (candidate.competitorDomains?.length > 0) {
          const mergedComp = new Set([...(prospectDoc.competitorDomains || []), ...candidate.competitorDomains]);
          prospectDoc.competitorDomains = Array.from(mergedComp);
        }
        if (!prospectDoc.discoveredCampaigns.includes(campaign._id)) {
          prospectDoc.discoveredCampaigns.push(campaign._id);
        }
        prospectDoc.qualificationStatus = candidate.qualificationStatus || 'unassessed';
        await prospectDoc.save();
      } else {
        // Create new global prospect
        prospectDoc = await Prospect.create({
          userId,
          websiteId,
          prospectDomain: candidate.prospectDomain,
          prospectUrl: candidate.prospectUrl,
          source: candidate.source,
          discoveredFrom: candidate.discoveredFrom,
          discoveryKeyword: candidate.discoveryKeyword,
          competitorDomains: candidate.competitorDomains || [],
          domainAuthority: candidate.domainAuthority,
          pageAuthority: candidate.pageAuthority,
          spamScore: candidate.spamScore,
          opportunityScore: candidate.opportunityScore,
          opportunityFactors: candidate.opportunityFactors,
          status: 'saved',
          qualificationStatus: candidate.qualificationStatus || 'unassessed',
          discoveredCampaigns: [campaign._id]
        });
      }

      const pIdStr = prospectDoc._id.toString();
      prospectIdList.push(prospectDoc._id);
      prospectCandidateMap.set(pIdStr, candidate);
    }

    // Also persist/update rejected candidates so every discovered prospect is saved & inspectable in DB
    for (const rejected of rejectedCandidates) {
      try {
        let prospectDoc = await Prospect.findOne({
          userId,
          websiteId,
          prospectDomain: rejected.prospectDomain
        });

        if (prospectDoc) {
          if (!prospectDoc.discoveredCampaigns.includes(campaign._id)) {
            prospectDoc.discoveredCampaigns.push(campaign._id);
          }
          if (rejected.opportunityScore !== null && prospectDoc.opportunityScore === null) {
            prospectDoc.opportunityScore = rejected.opportunityScore;
            prospectDoc.opportunityFactors = rejected.opportunityFactors;
          }
          prospectDoc.qualificationStatus = 'rejected';
          await prospectDoc.save();
        } else {
          await Prospect.create({
            userId,
            websiteId,
            prospectDomain: rejected.prospectDomain,
            prospectUrl: rejected.prospectUrl,
            source: rejected.source,
            discoveredFrom: rejected.discoveredFrom,
            discoveryKeyword: rejected.discoveryKeyword,
            competitorDomains: rejected.competitorDomains || [],
            domainAuthority: rejected.domainAuthority,
            pageAuthority: rejected.pageAuthority,
            spamScore: rejected.spamScore,
            opportunityScore: rejected.opportunityScore,
            opportunityFactors: rejected.opportunityFactors,
            status: 'new',
            qualificationStatus: 'rejected',
            notes: `Disqualified during campaign discovery: ${rejected.rejectionReason}`,
            discoveredCampaigns: [campaign._id]
          });
        }
      } catch (err) {
        console.warn(`[CampaignDiscovery] Could not persist rejected prospect ${rejected.prospectDomain}:`, err.message);
      }
    }

    // =========================================================================
    // 7. ASSIGN QUALIFIED PROSPECTS TO CAMPAIGN
    // =========================================================================
    // Query already assigned prospects to prevent duplicates
    const currentAssignments = await CampaignProspectAssignment.find({
      campaignId,
      prospectId: { $in: prospectIdList }
    }).select('prospectId isExcluded');

    const existingAssignedSet = new Set(
      currentAssignments.filter((a) => !a.isExcluded).map((a) => a.prospectId.toString())
    );
    const existingExcludedSet = new Set(
      currentAssignments.filter((a) => a.isExcluded).map((a) => a.prospectId.toString())
    );

    const newAssignmentsToInsert = [];
    for (const pId of prospectIdList) {
      const pIdStr = pId.toString();
      // Skip if already assigned or if user previously manually excluded it
      if (!existingAssignedSet.has(pIdStr) && !existingExcludedSet.has(pIdStr)) {
        const candidateInfo = prospectCandidateMap.get(pIdStr) || {};
        newAssignmentsToInsert.push({
          userId,
          websiteId,
          campaignId,
          prospectId: pId,
          assignmentSource: 'automatic',
          qualificationStatus: candidateInfo.qualificationStatus || 'qualified',
          qualificationReason: candidateInfo.qualificationReason || '',
          outreachStatus: 'uncontacted',
          isExcluded: false,
          assignedAt: new Date()
        });
      }
    }

    let assignedCount = 0;
    if (newAssignmentsToInsert.length > 0) {
      const inserted = await CampaignProspectAssignment.insertMany(newAssignmentsToInsert);
      assignedCount = inserted.length;
    }

    // Determine final status
    const hasWarnings = campaign.discoverySummary.warnings.length > 0;
    campaign.discoveryStatus = hasWarnings ? 'completed_with_warnings' : 'completed';
    campaign.discoverySummary = {
      ...campaign.discoverySummary,
      keywordResultsCount: keywordResults.length,
      competitorResultsCount: competitorResults.length,
      totalDiscovered,
      rawProspectsFound: totalDiscovered,
      uniqueDomainsCount,
      duplicateCount,
      enrichmentSuccessCount,
      enrichmentFailureCount,
      qualifiedCount: allEligibleCandidates.length,
      provisionalCount: provisionalCandidates.length,
      rejectedCount: rejectedCandidates.length,
      rejectionBreakdown,
      assignedCount,
      completedAt: new Date()
    };

    await campaign.save();

    // Record audit activity
    await campaignService.recordActivity({
      userId,
      websiteId,
      campaignId,
      action: 'prospects_assigned',
      description: `Automated discovery assigned ${assignedCount} prospects (${qualifiedCandidates.length} verified DA >= ${minDA}, ${provisionalCandidates.length} provisional unassessed DA).`,
      metadata: {
        totalDiscovered,
        uniqueDomainsCount,
        qualifiedCount: qualifiedCandidates.length,
        assignedCount,
        discoveryStatus: campaign.discoveryStatus
      }
    });

    // =========================================================================
    // 8. TRIGGER AUTOMATIC CONTACT DISCOVERY ASYNCHRONOUSLY
    // =========================================================================
    contactDiscoveryService.runCampaignContactDiscovery({
      userId,
      websiteId,
      campaignId
    }).catch((err) => {
      console.warn('[CampaignDiscovery] Contact discovery async trigger warning:', err.message);
    });

    return {
      success: true,
      discoveryStatus: campaign.discoveryStatus,
      summary: campaign.discoverySummary,
      assignedCount
    };
  }
}

export const campaignDiscoveryService = new CampaignDiscoveryService();
export default campaignDiscoveryService;
