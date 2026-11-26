import { seoService } from '../../seo/seoService.js';
import { normalizeDomain } from '../../../models/Prospect.js';
import { calculateOpportunityScore } from '../opportunityScorer.js';

export class CompetitorDiscoveryProvider {
  /**
   * Discover candidate link prospects by analyzing backlinks of competitor domains.
   *
   * @param {Object} params
   * @param {Array<string>} params.competitorDomains - One or more competitor domains
   * @param {string} params.userDomain - The user's active website domain to exclude
   * @param {Set<string>|Array<string>} [params.excludedDomains] - Existing backlinks or user-owned domains to exclude
   * @param {number} [params.limitPerCompetitor=30] - Max links to query per competitor
   * @returns {Promise<Array<Object>>} Normalized candidate prospect objects
   */
  async discover({
    competitorDomains = [],
    userDomain = '',
    excludedDomains = new Set(),
    limitPerCompetitor = 30
  } = {}) {
    const cleanUserDomain = normalizeDomain(userDomain);
    const excludeSet = new Set(
      Array.isArray(excludedDomains)
        ? excludedDomains.map(normalizeDomain)
        : Array.from(excludedDomains).map(normalizeDomain)
    );
    if (cleanUserDomain) {
      excludeSet.add(cleanUserDomain);
    }

    // Clean and validate competitor domains
    const cleanCompetitors = competitorDomains
      .map(normalizeDomain)
      .filter((d) => d && d !== cleanUserDomain);

    if (cleanCompetitors.length === 0) {
      return [];
    }

    // candidateMap: domain -> aggregated prospect candidate
    const candidateMap = new Map();

    for (const compDomain of cleanCompetitors) {
      try {
        const backlinks = await seoService.fetchBacklinks(compDomain, {
          limit: limitPerCompetitor
        });

        if (!Array.isArray(backlinks)) continue;

        for (const link of backlinks) {
          if (!link.sourceUrl) continue;

          const refDomain = normalizeDomain(link.sourceDomain || link.sourceUrl);
          if (!refDomain) continue;

          // Exclude user's own domain, existing linking domains, and self-links
          if (excludeSet.has(refDomain) || refDomain === compDomain) {
            continue;
          }

          if (candidateMap.has(refDomain)) {
            // Domain already discovered: merge competitor reference
            const existing = candidateMap.get(refDomain);
            if (!existing.competitorDomains.includes(compDomain)) {
              existing.competitorDomains.push(compDomain);
            }
            // Update linkType if current is dofollow
            if (link.linkType === 'dofollow') {
              existing.linkType = 'dofollow';
            }
            if (existing.domainAuthority === null && (link.sourceDomainAuthority != null || link.domainAuthority != null)) {
              existing.domainAuthority = link.sourceDomainAuthority ?? link.domainAuthority;
            }
            if (existing.pageAuthority === null && (link.sourcePageAuthority != null || link.pageAuthority != null)) {
              existing.pageAuthority = link.sourcePageAuthority ?? link.pageAuthority;
            }
            if (existing.spamScore === null && (link.meta?.spamScore != null || link.spamScore != null)) {
              existing.spamScore = link.meta?.spamScore ?? link.spamScore;
            }
          } else {
            // New candidate prospect
            candidateMap.set(refDomain, {
              prospectDomain: refDomain,
              prospectUrl: link.sourceUrl,
              source: 'competitor',
              discoveredFrom: compDomain,
              competitorDomains: [compDomain],
              domainAuthority: link.sourceDomainAuthority ?? link.domainAuthority ?? null,
              pageAuthority: link.sourcePageAuthority ?? link.pageAuthority ?? null,
              spamScore: link.meta?.spamScore ?? link.spamScore ?? null,
              linkType: link.linkType || 'unknown',
              sampleAnchorText: link.anchorText || '',
              targetUrl: link.targetUrl || ''
            });
          }
        }
      } catch (err) {
        console.warn(`[CompetitorDiscovery] Error querying backlinks for ${compDomain}:`, err.message);
      }
    }

    // Convert map to array and compute opportunity scores
    const candidates = Array.from(candidateMap.values()).map((candidate) => {
      const scoring = calculateOpportunityScore({
        domainAuthority: candidate.domainAuthority,
        spamScore: candidate.spamScore,
        competitorOverlap: candidate.competitorDomains.length,
        source: 'competitor',
        linkType: candidate.linkType
      });

      return {
        ...candidate,
        opportunityScore: scoring.score,
        opportunityFactors: scoring.factors
      };
    });

    // Sort by opportunityScore descending
    candidates.sort((a, b) => (b.opportunityScore || 0) - (a.opportunityScore || 0));

    return candidates;
  }
}

export const competitorDiscoveryProvider = new CompetitorDiscoveryProvider();
export default competitorDiscoveryProvider;
