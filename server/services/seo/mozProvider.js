/**
 * Moz External SEO Data Provider
 *
 * Implements direct HTTP integration with the official Moz API v2 (URL Metrics).
 * Official Docs: https://moz.com/api/docs
 * Dashboard: https://moz.com/api/dashboard
 * Authentication Guide: https://moz.com/api/docs/guides/authentication
 *
 * Attribution Notice: "Domain Authority" and "Page Authority" are trademarks of Moz, Inc.
 * Commercial applications displaying Moz metrics must provide proper Moz attribution.
 */

export class MozProvider {
  constructor() {
    this.name = 'Moz API';
    this.id = 'moz';
    this.apiBase = 'https://lsapi.seomoz.com/v2';
    this.timeoutMs = 12000; // 12 seconds timeout
  }

  /**
   * Check if credentials are configured in environment variables
   */
  isConfigured() {
    const token = process.env.MOZ_API_TOKEN;
    return !!(token && token.trim());
  }

  /**
   * Get provider configuration status and metadata
   */
  getStatus() {
    const configured = this.isConfigured();
    return {
      provider: this.name,
      id: this.id,
      configured,
      authMethod: 'Moz API Token (x-moz-token header)',
      costModel: 'Free Community Tier (~50-2,500 rows/mo, 1 req / 10s rate limit)',
      apiBase: this.apiBase,
      docsUrl: 'https://moz.com/api/docs',
      supportedMetrics: [
        'totalBacklinks',
        'referringDomains',
        'domainAuthority',
        'pageAuthority',
        'spamScore'
      ],
      unsupportedMetrics: [
        'dofollowBacklinks',
        'nofollowBacklinks',
        'brokenBacklinks',
        'referringIps',
        'referringSubnets',
        'newBacklinks',
        'lostBacklinks'
      ],
      missingEnvVars: configured ? [] : ['MOZ_API_TOKEN'],
      attribution: 'Powered by Moz (Domain Authority and Page Authority are trademarks of Moz, Inc.)'
    };
  }

  /**
   * Generate request headers for Moz API v2
   */
  getHeaders() {
    const token = process.env.MOZ_API_TOKEN?.trim();
    if (!token) {
      throw new Error(
        'Moz API token missing. Please set MOZ_API_TOKEN in server/.env.'
      );
    }

    const headers = {
      'Content-Type': 'application/json'
    };

    // Support both modern x-moz-token and legacy AccessID:SecretKey Basic Auth
    if (token.includes(':')) {
      const basicToken = Buffer.from(token).toString('base64');
      headers['Authorization'] = `Basic ${basicToken}`;
    } else {
      headers['x-moz-token'] = token;
    }

    return headers;
  }

  /**
   * Fetch live backlink and domain summary from Moz URL Metrics endpoint
   * @param {string} domain - Target domain (e.g. "example.com")
   * @returns {Promise<Object>} Normalized SEO metrics
   */
  async fetchBacklinkSummary(domain) {
    if (!this.isConfigured()) {
      const err = new Error(
        'SEO Data Provider (Moz) is not configured. Please add MOZ_API_TOKEN to server/.env.'
      );
      err.code = 'PROVIDER_UNCONFIGURED';
      err.status = 503;
      err.setup = {
        provider: 'Moz API',
        requiredEnvVars: ['MOZ_API_TOKEN', 'SEO_PROVIDER'],
        signupUrl: 'https://moz.com/api/dashboard',
        docsUrl: 'https://moz.com/api/docs'
      };
      throw err;
    }

    const endpoint = `${this.apiBase}/url_metrics`;
    const payload = {
      targets: [domain]
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    let response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
        signal: controller.signal
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        const timeoutError = new Error(
          `Moz API request timed out after ${this.timeoutMs / 1000}s while querying ${domain}.`
        );
        timeoutError.code = 'PROVIDER_TIMEOUT';
        timeoutError.status = 504;
        throw timeoutError;
      }
      const netError = new Error(`Network failure communicating with Moz API: ${fetchError.message}`);
      netError.code = 'PROVIDER_NETWORK_ERROR';
      netError.status = 502;
      throw netError;
    } finally {
      clearTimeout(timeoutId);
    }

    // Handle HTTP error codes
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        const authErr = new Error(
          'Moz API authentication failed. Please verify MOZ_API_TOKEN in server/.env.'
        );
        authErr.code = 'PROVIDER_AUTH_FAILED';
        authErr.status = response.status;
        throw authErr;
      }

      if (response.status === 429) {
        const rateErr = new Error(
          'Moz API rate limit or monthly quota exceeded (Free tier allows 1 request per 10s). Please wait before trying again.'
        );
        rateErr.code = 'PROVIDER_RATE_LIMIT';
        rateErr.status = 429;
        throw rateErr;
      }

      const rawText = await response.text().catch(() => '');
      const genericErr = new Error(
        `Moz API returned HTTP ${response.status}: ${rawText || response.statusText}`
      );
      genericErr.code = 'PROVIDER_HTTP_ERROR';
      genericErr.status = response.status;
      throw genericErr;
    }

    const data = await response.json();
    return this.normalizeUrlMetricsResponse(domain, data);
  }

  /**
   * Fetch individual backlink rows from Moz Links v2 endpoint
   * POST https://lsapi.seomoz.com/v2/links
   * @param {string} domain - Target domain
   * @param {Object} options - { limit: number }
   * @returns {Promise<Array<Object>>} Normalized backlink records
   */
  async fetchBacklinks(domain, { limit = 25 } = {}) {
    if (!this.isConfigured()) {
      const err = new Error(
        'SEO Data Provider (Moz) is not configured. Please add MOZ_API_TOKEN to server/.env.'
      );
      err.code = 'PROVIDER_UNCONFIGURED';
      err.status = 503;
      throw err;
    }

    const endpoint = `${this.apiBase}/links`;
    const payload = {
      target: domain,
      target_scope: 'domain',
      sort: 'source_page_authority',
      limit: Math.min(Math.max(1, limit), 50)
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    let response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
        signal: controller.signal
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        const timeoutError = new Error(`Moz API links request timed out after ${this.timeoutMs / 1000}s.`);
        timeoutError.code = 'PROVIDER_TIMEOUT';
        timeoutError.status = 504;
        throw timeoutError;
      }
      throw fetchError;
    } finally {
      clearTimeout(timeoutId);
    }

    // Handle tier permissions gracefully: If account does not have /v2/links endpoint rights
    if (response.status === 403 || response.status === 401 || response.status === 404) {
      console.warn(`[MozProvider] Moz /v2/links returned HTTP ${response.status}. Free tier may restrict row-level links.`);
      return [];
    }

    if (!response.ok) {
      if (response.status === 429) {
        const rateErr = new Error('Moz API rate limit reached.');
        rateErr.code = 'PROVIDER_RATE_LIMIT';
        rateErr.status = 429;
        throw rateErr;
      }
      return [];
    }

    const data = await response.json();
    return this.normalizeLinksResponse(domain, data);
  }

  /**
   * Normalize Moz Links API v2 response
   */
  normalizeLinksResponse(domain, rawResponse) {
    if (!rawResponse || !Array.isArray(rawResponse.results)) {
      return [];
    }

    return rawResponse.results
      .map((item) => {
        const sourceUrl = item.source_url || '';
        const targetUrl = item.target_url || `https://${domain}`;
        const anchorText = typeof item.anchor_text === 'string' ? item.anchor_text.trim() : '';
        const linkType = item.flag_nofollow ? 'nofollow' : 'dofollow';
        const sourceDomainAuthority = typeof item.source_domain_authority === 'number'
          ? Math.round(item.source_domain_authority)
          : null;
        const sourcePageAuthority = typeof item.source_page_authority === 'number'
          ? Math.round(item.source_page_authority)
          : null;
        const firstSeen = item.first_seen ? new Date(item.first_seen) : null;
        const lastSeen = item.last_seen ? new Date(item.last_seen) : null;

        return {
          sourceUrl,
          targetUrl,
          anchorText,
          linkType,
          sourceDomainAuthority,
          sourcePageAuthority,
          firstSeen,
          lastSeen,
          provider: this.id,
          meta: {
            flagRedirect: !!item.flag_redirect,
            sourceTitle: item.source_title || ''
          }
        };
      })
      .filter((b) => b.sourceUrl && b.targetUrl);
  }

  /**
   * Normalize Moz API v2 response into our canonical Linkora schema
   */
  normalizeUrlMetricsResponse(domain, rawResponse) {
    const result = rawResponse.results?.[0];
    if (!result) {
      throw new Error(`Moz API returned no metric results for target "${domain}".`);
    }

    // Domain Authority (DA) & Page Authority (PA) are genuine 0-100 scores from Moz
    const domainAuthority = typeof result.domain_authority === 'number'
      ? Math.round(result.domain_authority)
      : null;

    const pageAuthority = typeof result.page_authority === 'number'
      ? Math.round(result.page_authority)
      : null;

    // Total backlinks: external_pages_to_root_domain or pages_to_root_domain or links
    const totalBacklinks = typeof result.external_pages_to_root_domain === 'number'
      ? result.external_pages_to_root_domain
      : typeof result.pages_to_root_domain === 'number'
      ? result.pages_to_root_domain
      : typeof result.links === 'number'
      ? result.links
      : null;

    // Referring domains: root_domains_to_root_domain or linking_domains
    const referringDomains = typeof result.root_domains_to_root_domain === 'number'
      ? result.root_domains_to_root_domain
      : typeof result.linking_domains === 'number'
      ? result.linking_domains
      : null;

    const spamScore = typeof result.spam_score === 'number'
      ? Math.round(result.spam_score)
      : null;

    const metrics = {
      totalBacklinks,
      referringDomains,
      domainRating: domainAuthority, // Kept for generic schema compatibility
      domainAuthority: domainAuthority, // Genuine Moz DA (0-100)
      pageAuthority: pageAuthority,     // Genuine Moz PA (0-100)
      rawRank: null,                   // Specific to DataForSEO (not applicable in Moz)
      referringMainDomains: referringDomains,
      referringIps: null,              // Not provided by Moz URL Metrics Free tier
      referringSubnets: null,          // Not provided by Moz URL Metrics Free tier
      dofollowBacklinks: null,         // Link breakdown requires paid Link Explorer endpoint
      nofollowBacklinks: null,
      brokenBacklinks: null,           // Not supported by URL Metrics endpoint
      brokenPages: null,
      spamScore,
      crawledPages: typeof result.pages_to_page === 'number' ? result.pages_to_page : null,
      newBacklinks: null,              // Requires time-series link history (Phase 5)
      lostBacklinks: null
    };

    const availability = {
      totalBacklinks: metrics.totalBacklinks !== null,
      referringDomains: metrics.referringDomains !== null,
      domainRating: metrics.domainAuthority !== null,
      domainAuthority: metrics.domainAuthority !== null,
      pageAuthority: metrics.pageAuthority !== null,
      rawRank: false,
      referringMainDomains: metrics.referringMainDomains !== null,
      referringIps: false,
      referringSubnets: false,
      dofollowBacklinks: false,
      nofollowBacklinks: false,
      brokenBacklinks: false,
      brokenPages: false,
      spamScore: metrics.spamScore !== null,
      crawledPages: metrics.crawledPages !== null,
      newBacklinks: false,
      lostBacklinks: false
    };

    return {
      success: true,
      domain,
      provider: this.name,
      providerId: this.id,
      cost: '0.00 (Moz Free Tier)',
      data: metrics,
      availability,
      attribution: 'Data provided by Moz Link Explorer API',
      fetchedAt: new Date().toISOString()
    };
  }
}

export const mozProvider = new MozProvider();
