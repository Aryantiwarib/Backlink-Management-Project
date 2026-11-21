import { dataForSeoProvider } from './dataForSeoProvider.js';
import { mozProvider } from './mozProvider.js';
import { seoCache } from './cacheService.js';

// Cooldown map to avoid rapid double-clicking charges/rate limits (domain -> timestamp)
const requestCooldownMap = new Map();
const COOLDOWN_MS = 15000; // 15 seconds cooldown per domain for non-cached live fetches

/**
 * Determine active provider based on environment variable SEO_PROVIDER (default: 'moz')
 */
export const getActiveProvider = () => {
  const providerType = (process.env.SEO_PROVIDER || 'moz').toLowerCase().trim();
  if (providerType === 'dataforseo') {
    return dataForSeoProvider;
  }
  return mozProvider;
};

export class SeoService {
  /**
   * Resolve active provider dynamically
   */
  get provider() {
    return getActiveProvider();
  }

  /**
   * Get provider integration status
   */
  getProviderStatus() {
    const activeProvider = this.provider;
    const status = activeProvider.getStatus();

    return {
      activeProvider: activeProvider.id,
      availableProviders: ['moz', 'dataforseo'],
      ...status,
      cacheStats: seoCache.getStats(),
      cooldownSeconds: COOLDOWN_MS / 1000
    };
  }

  /**
   * Fetch backlink summary with intelligent caching and cost/quota safeguards
   * @param {string} domain - Target domain
   * @param {Object} options - { forceRefresh: boolean }
   */
  async getBacklinkSummary(domain, { forceRefresh = false } = {}) {
    const activeProvider = this.provider;
    const cacheKey = `seo:summary:${activeProvider.id}:${domain.toLowerCase()}`;

    // 1. Check in-memory cache if not forced
    if (!forceRefresh) {
      const cached = seoCache.get(cacheKey);
      if (cached) {
        return {
          ...cached,
          cached: true
        };
      }
    }

    // 2. Cooldown check: prevent rapid repeated external API calls
    const lastFetch = requestCooldownMap.get(domain);
    if (!forceRefresh && lastFetch && Date.now() - lastFetch < COOLDOWN_MS) {
      const waitSeconds = Math.ceil((COOLDOWN_MS - (Date.now() - lastFetch)) / 1000);
      const err = new Error(
        `Rate safeguard active: You requested metrics for "${domain}" recently. Please wait ${waitSeconds}s before requesting a live refresh.`
      );
      err.code = 'RATE_LIMIT_COOLDOWN';
      err.status = 429;
      throw err;
    }

    // 3. Request from external provider
    requestCooldownMap.set(domain, Date.now());
    const result = await activeProvider.fetchBacklinkSummary(domain);

    // 4. Save to in-memory cache (TTL: 1 hour)
    seoCache.set(cacheKey, result, 3600);

    return {
      ...result,
      cached: false
    };
  }

  /**
   * Get domain overview metrics
   */
  async getOverview(domain, options = {}) {
    const summary = await this.getBacklinkSummary(domain, options);
    const d = summary.data;

    return {
      success: true,
      domain,
      provider: summary.provider,
      providerId: summary.providerId,
      cached: summary.cached,
      cost: summary.cost,
      attribution: summary.attribution,
      fetchedAt: summary.fetchedAt,
      data: {
        totalBacklinks: d.totalBacklinks,
        referringDomains: d.referringDomains,
        domainAuthority: d.domainAuthority ?? d.domainRating,
        pageAuthority: d.pageAuthority,
        domainRating: d.domainAuthority ?? d.domainRating,
        rawRank: d.rawRank,
        dofollowRatio:
          d.totalBacklinks && d.dofollowBacklinks
            ? Math.round((d.dofollowBacklinks / d.totalBacklinks) * 100)
            : null,
        brokenBacklinks: d.brokenBacklinks,
        spamScore: d.spamScore
      },
      availability: {
        totalBacklinks: summary.availability.totalBacklinks,
        referringDomains: summary.availability.referringDomains,
        domainAuthority: summary.availability.domainAuthority ?? summary.availability.domainRating,
        pageAuthority: summary.availability.pageAuthority ?? false,
        domainRating: summary.availability.domainRating,
        dofollowRatio: d.totalBacklinks !== null && d.dofollowBacklinks !== null,
        brokenBacklinks: summary.availability.brokenBacklinks,
        spamScore: summary.availability.spamScore
      }
    };
  }

  /**
   * Get domain-level metrics
   */
  async getDomainMetrics(domain, options = {}) {
    const summary = await this.getBacklinkSummary(domain, options);
    const d = summary.data;

    return {
      success: true,
      domain,
      provider: summary.provider,
      providerId: summary.providerId,
      cached: summary.cached,
      attribution: summary.attribution,
      fetchedAt: summary.fetchedAt,
      data: {
        domainAuthority: d.domainAuthority ?? d.domainRating,
        pageAuthority: d.pageAuthority,
        domainRating: d.domainAuthority ?? d.domainRating,
        rawRank: d.rawRank,
        referringMainDomains: d.referringMainDomains,
        referringIps: d.referringIps,
        referringSubnets: d.referringSubnets,
        crawledPages: d.crawledPages,
        brokenPages: d.brokenPages
      },
      availability: {
        domainAuthority: summary.availability.domainAuthority ?? summary.availability.domainRating,
        pageAuthority: summary.availability.pageAuthority ?? false,
        domainRating: summary.availability.domainRating,
        rawRank: summary.availability.rawRank,
        referringMainDomains: summary.availability.referringMainDomains,
        referringIps: summary.availability.referringIps,
        referringSubnets: summary.availability.referringSubnets,
        crawledPages: summary.availability.crawledPages,
        brokenPages: summary.availability.brokenPages
      }
    };
  }

  /**
   * Fetch individual backlinks from active provider
   */
  async fetchBacklinks(domain, options = {}) {
    const activeProvider = this.provider;
    if (typeof activeProvider.fetchBacklinks === 'function') {
      return activeProvider.fetchBacklinks(domain, options);
    }
    return [];
  }
}

export const seoService = new SeoService();
