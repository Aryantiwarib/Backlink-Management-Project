/**
 * Moz External SEO Data Provider
 *
 * Implements direct HTTP integration with the official Moz API v2 (URL Metrics & Links).
 * Official Docs: https://moz.com/api/docs
 * Dashboard: https://moz.com/api/dashboard
 * Authentication Guide: https://moz.com/api/docs/guides/authentication
 *
 * Attribution Notice: "Domain Authority" and "Page Authority" are trademarks of Moz, Inc.
 * Commercial applications displaying Moz metrics must provide proper Moz attribution.
 */

/**
 * Normalizes a target domain by stripping protocol, www, paths, queries, and fragments.
 * @param {string} domain
 * @returns {string} clean domain (e.g. "growthlabs.io")
 */
export function normalizeDomain(domain) {
  if (!domain || typeof domain !== 'string') return '';
  return domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split('/')[0]
    .split('?')[0]
    .split('#')[0];
}

/**
 * Extracts the clean root domain or hostname from a URL.
 * @param {string} url
 * @returns {string} hostname without www
 */
export function extractDomainFromUrl(url) {
  if (!url || typeof url !== 'string') return '';
  try {
    const parsed = new URL(url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, '').toLowerCase();
  } catch (_) {
    return url.split('/')[0].replace(/^www\./, '').toLowerCase();
  }
}

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

    const cleanDomain = normalizeDomain(domain);
    if (!cleanDomain) {
      throw new Error('A valid domain is required to fetch SEO metrics.');
    }

    const endpoint = `${this.apiBase}/url_metrics`;
    const payload = {
      targets: [cleanDomain]
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
          `Moz API request timed out after ${this.timeoutMs / 1000}s while querying ${cleanDomain}.`
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
      let parsedMessage = '';
      try {
        const parsed = JSON.parse(rawText);
        parsedMessage = parsed.message || parsed.error || '';
      } catch (_) {
        parsedMessage = rawText;
      }

      const genericErr = new Error(
        `Moz API returned HTTP ${response.status}: ${parsedMessage || response.statusText}`
      );
      genericErr.code = 'PROVIDER_HTTP_ERROR';
      genericErr.status = response.status;
      throw genericErr;
    }

    const data = await response.json();
    return this.normalizeUrlMetricsResponse(cleanDomain, data);
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

    const cleanDomain = normalizeDomain(domain);
    if (!cleanDomain) {
      throw new Error('A valid domain is required to fetch backlinks.');
    }

    const endpoint = `${this.apiBase}/links`;
    const payload = {
      target: cleanDomain,
      target_scope: 'root_domain',
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
      const netError = new Error(`Network failure communicating with Moz API links endpoint: ${fetchError.message}`);
      netError.code = 'PROVIDER_NETWORK_ERROR';
      netError.status = 502;
      throw netError;
    } finally {
      clearTimeout(timeoutId);
    }

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
      let parsedMessage = '';
      try {
        const parsed = JSON.parse(rawText);
        parsedMessage = parsed.message || parsed.error || '';
      } catch (_) {
        parsedMessage = rawText;
      }

      const genericErr = new Error(
        `Moz API links request failed (HTTP ${response.status}): ${parsedMessage || response.statusText}`
      );
      genericErr.code = 'PROVIDER_HTTP_ERROR';
      genericErr.status = response.status;
      throw genericErr;
    }

    const data = await response.json();
    return this.normalizeLinksResponse(cleanDomain, data);
  }

  /**
   * Normalize Moz Links API v2 response
   * Safely maps nested Moz v2 structure into Linkora canonical schema
   */
  normalizeLinksResponse(domain, rawResponse) {
    if (!rawResponse || !Array.isArray(rawResponse.results)) {
      return [];
    }

    const cleanDomain = normalizeDomain(domain);

    return rawResponse.results
      .map((item) => {
        if (!item || typeof item !== 'object') return null;

        // 1. Resolve source and target pages from nested Moz v2 structure
        const rawSource = item.source?.page || item.source?.subdomain || item.source?.root_domain || item.source_url || '';
        const rawTarget = item.target?.page || item.target?.subdomain || item.target?.root_domain || item.target_url || cleanDomain;

        if (!rawSource) return null;

        const sourceUrl = (rawSource.startsWith('http://') || rawSource.startsWith('https://'))
          ? rawSource
          : `https://${rawSource}`;

        const targetUrl = (rawTarget.startsWith('http://') || rawTarget.startsWith('https://'))
          ? rawTarget
          : `https://${rawTarget}`;

        const sourceDomain = (item.source?.root_domain || item.source?.subdomain || extractDomainFromUrl(sourceUrl)).toLowerCase();

        // 2. Anchor text
        const anchorText = typeof item.anchor_text === 'string' ? item.anchor_text.trim() : '';

        // 3. Link type: item.nofollow ? 'nofollow' : 'dofollow'
        let linkType = 'unknown';
        if (typeof item.nofollow === 'boolean') {
          linkType = item.nofollow ? 'nofollow' : 'dofollow';
        } else if (typeof item.flag_nofollow === 'boolean') {
          linkType = item.flag_nofollow ? 'nofollow' : 'dofollow';
        }

        // 4. Source authorities
        const sourceDomainAuthority =
          typeof item.source?.domain_authority === 'number' && item.source.domain_authority >= 0
            ? Math.round(item.source.domain_authority)
            : typeof item.source_domain_authority === 'number' && item.source_domain_authority >= 0
            ? Math.round(item.source_domain_authority)
            : null;

        const sourcePageAuthority =
          typeof item.source?.page_authority === 'number' && item.source.page_authority >= 0
            ? Math.round(item.source.page_authority)
            : typeof item.source_page_authority === 'number' && item.source_page_authority >= 0
            ? Math.round(item.source_page_authority)
            : null;

        // 5. Timestamps: date_first_seen and date_last_seen
        let firstSeen = null;
        const rawFirstSeen = item.date_first_seen || item.first_seen;
        if (rawFirstSeen) {
          const d = new Date(rawFirstSeen);
          if (!isNaN(d.getTime())) firstSeen = d;
        }

        let lastSeen = null;
        const rawLastSeen = item.date_last_seen || item.last_seen;
        if (rawLastSeen) {
          const d = new Date(rawLastSeen);
          if (!isNaN(d.getTime())) lastSeen = d;
        }

        return {
          sourceUrl,
          sourceDomain,
          targetUrl,
          anchorText,
          linkType,
          sourceDomainAuthority,
          sourcePageAuthority,
          firstSeen,
          lastSeen,
          provider: this.id,
          meta: {
            flagRedirect: !!(item.redirect ?? item.flag_redirect),
            relCanonical: !!item.rel_canonical,
            sourceTitle: item.source?.title || item.source_title || '',
            spamScore: typeof item.source?.spam_score === 'number' && item.source.spam_score >= 0
              ? Math.round(item.source.spam_score)
              : null,
            dateDisappeared: item.date_disappeared || null
          }
        };
      })
      .filter((b) => b && b.sourceUrl && b.targetUrl);
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
