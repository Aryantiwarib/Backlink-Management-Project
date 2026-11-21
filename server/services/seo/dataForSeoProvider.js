/**
 * DataForSEO External SEO Data Provider
 *
 * Implements direct HTTP integration with the official DataForSEO Backlinks API v3.
 * Official Docs: https://docs.dataforseo.com/v3/backlinks/summary/live/
 */

export class DataForSeoProvider {
  constructor() {
    this.name = 'DataForSEO';
    this.id = 'dataforseo';
    this.apiBase = 'https://api.dataforseo.com/v3';
    this.timeoutMs = 12000; // 12 seconds timeout
  }

  /**
   * Check if credentials are configured in environment variables
   */
  isConfigured() {
    const login = process.env.DATAFORSEO_LOGIN;
    const password = process.env.DATAFORSEO_PASSWORD;
    return !!(login && login.trim() && password && password.trim());
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
      authMethod: 'HTTP Basic Auth',
      costModel: 'Pay-per-request (~$0.02 to $0.05 per Live summary call)',
      apiBase: this.apiBase,
      docsUrl: 'https://docs.dataforseo.com/v3/backlinks/summary/live/',
      supportedMetrics: [
        'totalBacklinks',
        'referringDomains',
        'domainRank',
        'domainRating',
        'referringMainDomains',
        'referringIps',
        'referringSubnets',
        'dofollowBacklinks',
        'nofollowBacklinks',
        'brokenBacklinks',
        'spamScore',
        'crawledPages'
      ],
      missingEnvVars: configured
        ? []
        : [
            !process.env.DATAFORSEO_LOGIN ? 'DATAFORSEO_LOGIN' : null,
            !process.env.DATAFORSEO_PASSWORD ? 'DATAFORSEO_PASSWORD' : null
          ].filter(Boolean)
    };
  }

  /**
   * Generate Basic Auth header
   */
  getAuthHeader() {
    const login = process.env.DATAFORSEO_LOGIN?.trim();
    const password = process.env.DATAFORSEO_PASSWORD?.trim();
    if (!login || !password) {
      throw new Error(
        'DataForSEO credentials missing. Please set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD in server/.env.'
      );
    }
    const token = Buffer.from(`${login}:${password}`).toString('base64');
    return `Basic ${token}`;
  }

  /**
   * Fetch live backlink and domain summary from DataForSEO
   * @param {string} domain - Normalized target domain (e.g. "example.com")
   * @returns {Promise<Object>} Normalized SEO metrics
   */
  async fetchBacklinkSummary(domain) {
    if (!this.isConfigured()) {
      const err = new Error(
        'SEO Data Provider (DataForSEO) is not configured. Please add DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD to server/.env.'
      );
      err.code = 'PROVIDER_UNCONFIGURED';
      err.status = 503;
      throw err;
    }

    const endpoint = `${this.apiBase}/backlinks/summary/live`;
    const payload = [
      {
        target: domain,
        internal_list_limit: 10,
        include_subdomains: true
      }
    ];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    let response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: this.getAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        const timeoutError = new Error(
          `DataForSEO request timed out after ${this.timeoutMs / 1000}s while querying ${domain}.`
        );
        timeoutError.code = 'PROVIDER_TIMEOUT';
        timeoutError.status = 504;
        throw timeoutError;
      }
      const netError = new Error(`Network failure communicating with DataForSEO: ${fetchError.message}`);
      netError.code = 'PROVIDER_NETWORK_ERROR';
      netError.status = 502;
      throw netError;
    } finally {
      clearTimeout(timeoutId);
    }

    // Handle HTTP-level errors
    if (!response.ok) {
      if (response.status === 401) {
        const authErr = new Error(
          'DataForSEO authentication failed. Please verify DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD in server/.env.'
        );
        authErr.code = 'PROVIDER_AUTH_FAILED';
        authErr.status = 401;
        throw authErr;
      }

      if (response.status === 402) {
        const paymentErr = new Error(
          'DataForSEO account has insufficient balance/credits to complete this request.'
        );
        paymentErr.code = 'PROVIDER_INSUFFICIENT_FUNDS';
        paymentErr.status = 402;
        throw paymentErr;
      }

      if (response.status === 429) {
        const rateErr = new Error(
          'DataForSEO rate limit exceeded. Please wait a moment before sending another request.'
        );
        rateErr.code = 'PROVIDER_RATE_LIMIT';
        rateErr.status = 429;
        throw rateErr;
      }

      const rawText = await response.text().catch(() => '');
      const genericErr = new Error(
        `DataForSEO returned HTTP ${response.status}: ${rawText || response.statusText}`
      );
      genericErr.code = 'PROVIDER_HTTP_ERROR';
      genericErr.status = response.status;
      throw genericErr;
    }

    const data = await response.json();
    return this.normalizeBacklinkSummaryResponse(domain, data);
  }

  /**
   * Normalize DataForSEO raw response into our canonical Linkora schema
   */
  normalizeBacklinkSummaryResponse(domain, rawResponse) {
    // DataForSEO API status check
    if (rawResponse.status_code && rawResponse.status_code !== 20000) {
      const err = new Error(
        `DataForSEO error: ${rawResponse.status_message || 'Unrecognized error from provider'}`
      );
      err.code = 'PROVIDER_API_ERROR';
      err.status = 400;
      err.details = rawResponse;
      throw err;
    }

    const task = rawResponse.tasks?.[0];
    if (!task) {
      throw new Error('DataForSEO returned an empty task payload.');
    }

    if (task.status_code && task.status_code !== 20000) {
      const err = new Error(`DataForSEO task failed: ${task.status_message || 'Task error'}`);
      err.code = 'PROVIDER_TASK_ERROR';
      err.status = 400;
      throw err;
    }

    const result = task.result?.[0];
    const summary = result?.items?.[0] || {};

    const rawRank = typeof summary.rank === 'number' ? summary.rank : null;
    // DataForSEO rank is on a 0-1000 scale; compute a 0-100 normalized domain rating
    const domainRating = rawRank !== null ? Math.round(rawRank / 10) : null;

    const attributes = summary.referring_links_attributes || {};

    const metrics = {
      totalBacklinks: typeof summary.backlinks === 'number' ? summary.backlinks : null,
      referringDomains: typeof summary.referring_domains === 'number' ? summary.referring_domains : null,
      domainRating: domainRating,
      rawRank: rawRank,
      referringMainDomains: typeof summary.referring_main_domains === 'number' ? summary.referring_main_domains : null,
      referringIps: typeof summary.referring_ips === 'number' ? summary.referring_ips : null,
      referringSubnets: typeof summary.referring_subnets === 'number' ? summary.referring_subnets : null,
      dofollowBacklinks: typeof attributes.dofollow === 'number' ? attributes.dofollow : null,
      nofollowBacklinks: typeof attributes.nofollow === 'number' ? attributes.nofollow : null,
      brokenBacklinks: typeof summary.broken_backlinks === 'number' ? summary.broken_backlinks : null,
      brokenPages: typeof summary.broken_pages === 'number' ? summary.broken_pages : null,
      spamScore: typeof summary.backlinks_spam_score === 'number' ? summary.backlinks_spam_score : null,
      crawledPages: typeof summary.crawled_pages === 'number' ? summary.crawled_pages : null,
      newBacklinks: null, // Specific new/lost time-series requires historical API calls (Phase 5)
      lostBacklinks: null
    };

    const availability = {
      totalBacklinks: metrics.totalBacklinks !== null,
      referringDomains: metrics.referringDomains !== null,
      domainRating: metrics.domainRating !== null,
      rawRank: metrics.rawRank !== null,
      referringMainDomains: metrics.referringMainDomains !== null,
      referringIps: metrics.referringIps !== null,
      referringSubnets: metrics.referringSubnets !== null,
      dofollowBacklinks: metrics.dofollowBacklinks !== null,
      nofollowBacklinks: metrics.nofollowBacklinks !== null,
      brokenBacklinks: metrics.brokenBacklinks !== null,
      brokenPages: metrics.brokenPages !== null,
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
      cost: task.cost || rawResponse.cost || null,
      data: metrics,
      availability,
      fetchedAt: new Date().toISOString()
    };
  }

  /**
   * Fetch individual backlinks from DataForSEO v3 Backlinks endpoint
   * POST https://api.dataforseo.com/v3/backlinks/backlinks/live
   */
  async fetchBacklinks(domain, { limit = 25 } = {}) {
    if (!this.isConfigured()) {
      return [];
    }

    const endpoint = `${this.apiBase}/backlinks/backlinks/live`;
    const payload = [
      {
        target: domain,
        limit: Math.min(Math.max(1, limit), 50),
        mode: 'as_is'
      }
    ];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.getAuthHeader()
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      if (!response.ok) return [];

      const raw = await response.json();
      const items = raw.tasks?.[0]?.result?.[0]?.items || [];

      return items.map((item) => ({
        sourceUrl: item.url_from || '',
        targetUrl: item.url_to || `https://${domain}`,
        anchorText: item.anchor || '',
        linkType: item.dofollow ? 'dofollow' : 'nofollow',
        sourceDomainAuthority: typeof item.rank === 'number' ? Math.round(item.rank / 10) : null,
        sourcePageAuthority: typeof item.page_from_rank === 'number' ? Math.round(item.page_from_rank / 10) : null,
        firstSeen: item.first_seen ? new Date(item.first_seen) : null,
        lastSeen: item.last_seen ? new Date(item.last_seen) : null,
        provider: this.id,
        meta: {
          isBroken: !!item.is_broken,
          sourceTitle: item.page_from_title || ''
        }
      })).filter((b) => b.sourceUrl && b.targetUrl);
    } catch (err) {
      console.warn('[DataForSeoProvider] fetchBacklinks error:', err.message);
      return [];
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const dataForSeoProvider = new DataForSeoProvider();
