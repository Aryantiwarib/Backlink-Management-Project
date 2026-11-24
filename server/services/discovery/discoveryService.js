import Website from '../../models/Website.js';
import Backlink from '../../models/Backlink.js';
import Prospect, { normalizeDomain } from '../../models/Prospect.js';
import { competitorDiscoveryProvider } from './providers/competitorDiscoveryProvider.js';
import { searchDiscoveryProvider } from './providers/searchDiscoveryProvider.js';
import { seoService } from '../seo/seoService.js';
import { calculateOpportunityScore } from './opportunityScorer.js';

export class DiscoveryService {
  /**
   * Helper to retrieve existing backlinks for exclusion
   */
  async getExistingBacklinkDomains(websiteId) {
    const existing = await Backlink.find({ websiteId }).select('sourceDomain sourceUrl').lean();
    const set = new Set();
    for (const b of existing) {
      if (b.sourceDomain) set.add(normalizeDomain(b.sourceDomain));
      else if (b.sourceUrl) set.add(normalizeDomain(b.sourceUrl));
    }
    return set;
  }

  /**
   * Get overall discovery sources status (Moz competitor crawler + Search engine APIs)
   */
  getDiscoveryStatus() {
    const mozStatus = seoService.getProviderStatus();
    const searchStatus = searchDiscoveryProvider.getStatus();

    return {
      competitorDiscovery: {
        provider: mozStatus.activeProvider,
        configured: mozStatus.configured,
        ready: mozStatus.configured
      },
      keywordDiscovery: searchStatus
    };
  }

  /**
   * Discover prospects based on competitor domains
   */
  async discoverCompetitorProspects({ userId, websiteId, competitorDomains = [], limit = 30 }) {
    if (!userId || !websiteId) {
      throw new Error('userId and websiteId are required.');
    }

    const website = await Website.findOne({ _id: websiteId, userId });
    if (!website) {
      const err = new Error('Website not found or does not belong to user.');
      err.status = 404;
      throw err;
    }

    if (!Array.isArray(competitorDomains) || competitorDomains.length === 0) {
      throw new Error('At least one competitor domain is required.');
    }

    // 1. Fetch user's existing backlinks to exclude them
    const existingBacklinkDomains = await this.getExistingBacklinkDomains(websiteId);

    // 2. Discover candidates
    const rawCandidates = await competitorDiscoveryProvider.discover({
      competitorDomains,
      userDomain: website.domain,
      excludedDomains: existingBacklinkDomains,
      limitPerCompetitor: limit
    });

    // 3. Check which candidates are already saved in the user's Prospect list
    const candidateDomains = rawCandidates.map((c) => c.prospectDomain);
    const existingProspects = await Prospect.find({
      userId,
      websiteId,
      prospectDomain: { $in: candidateDomains }
    }).select('prospectDomain status notes createdAt').lean();

    const savedMap = new Map();
    for (const p of existingProspects) {
      savedMap.set(p.prospectDomain, p);
    }

    const annotatedProspects = rawCandidates.map((c) => {
      const saved = savedMap.get(c.prospectDomain);
      return {
        ...c,
        isSaved: Boolean(saved),
        savedStatus: saved ? saved.status : null,
        savedId: saved ? saved._id.toString() : null
      };
    });

    return {
      success: true,
      prospects: annotatedProspects,
      totalDiscovered: annotatedProspects.length,
      competitorsChecked: competitorDomains.length,
      targetDomain: website.domain
    };
  }

  /**
   * Discover prospects based on niche / topic keywords
   */
  async discoverKeywordProspects({ userId, websiteId, keyword, limit = 20 }) {
    if (!userId || !websiteId) {
      throw new Error('userId and websiteId are required.');
    }

    const website = await Website.findOne({ _id: websiteId, userId });
    if (!website) {
      const err = new Error('Website not found or does not belong to user.');
      err.status = 404;
      throw err;
    }

    if (!keyword || !keyword.trim()) {
      throw new Error('A keyword query is required.');
    }

    // 1. Fetch user's existing backlinks to exclude
    const existingBacklinkDomains = await this.getExistingBacklinkDomains(websiteId);

    // 2. Discover via search API
    const rawCandidates = await searchDiscoveryProvider.discover({
      keyword: keyword.trim(),
      userDomain: website.domain,
      excludedDomains: existingBacklinkDomains,
      limit
    });

    // 3. Annotate with saved status
    const candidateDomains = rawCandidates.map((c) => c.prospectDomain);
    const existingProspects = await Prospect.find({
      userId,
      websiteId,
      prospectDomain: { $in: candidateDomains }
    }).select('prospectDomain status notes').lean();

    const savedMap = new Map();
    for (const p of existingProspects) {
      savedMap.set(p.prospectDomain, p);
    }

    const annotatedProspects = rawCandidates.map((c) => {
      const saved = savedMap.get(c.prospectDomain);
      return {
        ...c,
        isSaved: Boolean(saved),
        savedStatus: saved ? saved.status : null,
        savedId: saved ? saved._id.toString() : null
      };
    });

    return {
      success: true,
      prospects: annotatedProspects,
      totalDiscovered: annotatedProspects.length,
      keyword: keyword.trim(),
      targetDomain: website.domain
    };
  }

  /**
   * Enrich a specific prospect domain with live Moz SEO metrics
   */
  async enrichDomain({ userId, websiteId, domain }) {
    if (!domain) throw new Error('Domain is required for enrichment.');

    const cleanDomain = normalizeDomain(domain);

    const overview = await seoService.getOverview(cleanDomain);
    const d = overview.data || {};

    const domainAuthority = d.domainAuthority ?? d.domainRating ?? null;
    const pageAuthority = d.pageAuthority ?? null;
    const spamScore = d.spamScore ?? null;

    // If prospect is already saved in database, update metrics without overwriting notes/status
    const updatedProspect = await Prospect.findOneAndUpdate(
      { userId, websiteId, prospectDomain: cleanDomain },
      {
        $set: {
          domainAuthority,
          pageAuthority,
          spamScore
        }
      },
      { returnDocument: 'after' }
    );

    // Recompute score if prospect was updated
    if (updatedProspect) {
      const scoring = calculateOpportunityScore({
        domainAuthority,
        spamScore,
        competitorOverlap: updatedProspect.competitorDomains?.length || 1,
        source: updatedProspect.source,
        linkType: updatedProspect.metrics?.linkType || 'unknown'
      });
      updatedProspect.opportunityScore = scoring.score;
      updatedProspect.opportunityFactors = scoring.factors;
      await updatedProspect.save();
    }

    return {
      domain: cleanDomain,
      domainAuthority,
      pageAuthority,
      spamScore,
      totalBacklinks: d.totalBacklinks ?? null,
      referringDomains: d.referringDomains ?? null,
      prospect: updatedProspect ? updatedProspect.toSafeObject() : null
    };
  }
}

export const discoveryService = new DiscoveryService();
export default discoveryService;
