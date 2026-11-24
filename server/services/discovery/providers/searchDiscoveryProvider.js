import { normalizeDomain } from '../../../models/Prospect.js';
import { calculateOpportunityScore } from '../opportunityScorer.js';

export class SearchDiscoveryProvider {
  /**
   * Determine available search engine integration based on environment variables
   */
  getStatus() {
    const hasGoogle = Boolean(
      process.env.GOOGLE_SEARCH_API_KEY &&
        (process.env.GOOGLE_SEARCH_CX || process.env.GOOGLE_SEARCH_ENGINE_ID)
    );
    const hasSerper = Boolean(process.env.SERPER_API_KEY);
    const hasBing = Boolean(process.env.BING_SEARCH_API_KEY);

    let activeEngine = 'none';
    if (hasSerper) activeEngine = 'serper';
    else if (hasGoogle) activeEngine = 'google';
    else if (hasBing) activeEngine = 'bing';

    return {
      configured: activeEngine !== 'none',
      activeEngine,
      supportedEngines: [
        {
          id: 'google',
          name: 'Google Custom Search API',
          envRequired: ['GOOGLE_SEARCH_API_KEY', 'GOOGLE_SEARCH_CX'],
          configured: hasGoogle
        },
        {
          id: 'serper',
          name: 'Serper.dev Web Search API',
          envRequired: ['SERPER_API_KEY'],
          configured: hasSerper
        },
        {
          id: 'bing',
          name: 'Bing Web Search API',
          envRequired: ['BING_SEARCH_API_KEY'],
          configured: hasBing
        }
      ],
      setupInstructions:
        'To enable live keyword and niche link discovery, add either SERPER_API_KEY or GOOGLE_SEARCH_API_KEY + GOOGLE_SEARCH_CX to your server/.env file.'
    };
  }

  /**
   * Search candidate websites by topic/niche keywords using official search APIs
   *
   * @param {Object} params
   * @param {string} params.keyword - Niche keyword query (e.g. "SaaS tools", "React dev")
   * @param {string} params.userDomain - The user's active domain to exclude
   * @param {Set<string>|Array<string>} [params.excludedDomains] - Existing backlinks to exclude
   * @param {number} [params.limit=20] - Max results
   * @returns {Promise<Array<Object>>} Normalized candidate prospect objects
   */
  async discover({ keyword, userDomain = '', excludedDomains = new Set(), limit = 20 } = {}) {
    if (!keyword || !keyword.trim()) {
      throw new Error('A valid discovery keyword is required.');
    }

    const cleanKeyword = keyword.trim();
    const cleanUserDomain = normalizeDomain(userDomain);
    const excludeSet = new Set(
      Array.isArray(excludedDomains)
        ? excludedDomains.map(normalizeDomain)
        : Array.from(excludedDomains).map(normalizeDomain)
    );
    if (cleanUserDomain) excludeSet.add(cleanUserDomain);

    const status = this.getStatus();
    if (!status.configured) {
      const err = new Error(
        'Keyword discovery provider is not configured. Please add SERPER_API_KEY or GOOGLE_SEARCH_API_KEY to server/.env.'
      );
      err.code = 'DISCOVERY_PROVIDER_UNCONFIGURED';
      err.status = 503;
      err.details = status;
      throw err;
    }

    let rawResults = [];

    if (status.activeEngine === 'serper') {
      rawResults = await this.searchSerper(cleanKeyword, limit);
    } else if (status.activeEngine === 'google') {
      rawResults = await this.searchGoogle(cleanKeyword, limit);
    } else if (status.activeEngine === 'bing') {
      rawResults = await this.searchBing(cleanKeyword, limit);
    }

    // Normalize and filter search results
    const candidateMap = new Map();

    for (const item of rawResults) {
      if (!item.url) continue;

      const domain = normalizeDomain(item.domain || item.url);
      if (!domain || excludeSet.has(domain)) continue;

      if (!candidateMap.has(domain)) {
        const scoring = calculateOpportunityScore({
          domainAuthority: null, // Initial web search does not provide Moz DA without enrichment
          spamScore: null,
          competitorOverlap: 0,
          source: 'keyword',
          linkType: 'unknown'
        });

        candidateMap.set(domain, {
          prospectDomain: domain,
          prospectUrl: item.url,
          source: 'keyword',
          discoveredFrom: `Keyword: "${cleanKeyword}"`,
          discoveryKeyword: cleanKeyword,
          competitorDomains: [],
          domainAuthority: null,
          pageAuthority: null,
          spamScore: null,
          linkType: 'unknown',
          title: item.title || '',
          snippet: item.snippet || '',
          opportunityScore: scoring.score,
          opportunityFactors: scoring.factors
        });
      }
    }

    return Array.from(candidateMap.values());
  }

  /**
   * Serper.dev Google Web Search integration
   */
  async searchSerper(query, num = 20) {
    const apiKey = process.env.SERPER_API_KEY;
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: query,
        num: Math.min(Math.max(1, num), 50)
      })
    });

    if (!response.ok) {
      throw new Error(`Serper API error: HTTP ${response.status}`);
    }

    const data = await response.json();
    const organic = data.organic || [];

    return organic.map((item) => ({
      title: item.title,
      url: item.link,
      domain: normalizeDomain(item.link),
      snippet: item.snippet
    }));
  }

  /**
   * Google Custom Search JSON API integration
   */
  async searchGoogle(query, num = 10) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const cx = process.env.GOOGLE_SEARCH_CX || process.env.GOOGLE_SEARCH_ENGINE_ID;
    const url = new URL('https://www.googleapis.com/customsearch/v1');
    url.searchParams.set('key', apiKey);
    url.searchParams.set('cx', cx);
    url.searchParams.set('q', query);
    url.searchParams.set('num', String(Math.min(Math.max(1, num), 10)));

    const response = await fetch(url.toString(), { method: 'GET' });
    if (!response.ok) {
      throw new Error(`Google Custom Search API error: HTTP ${response.status}`);
    }

    const data = await response.json();
    const items = data.items || [];

    return items.map((item) => ({
      title: item.title,
      url: item.link,
      domain: normalizeDomain(item.link),
      snippet: item.snippet
    }));
  }

  /**
   * Bing Web Search API integration
   */
  async searchBing(query, count = 20) {
    const apiKey = process.env.BING_SEARCH_API_KEY;
    const url = new URL('https://api.bing.microsoft.com/v7.0/search');
    url.searchParams.set('q', query);
    url.searchParams.set('count', String(Math.min(Math.max(1, count), 50)));

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Ocp-Apim-Subscription-Key': apiKey }
    });

    if (!response.ok) {
      throw new Error(`Bing Search API error: HTTP ${response.status}`);
    }

    const data = await response.json();
    const webPages = data.webPages?.value || [];

    return webPages.map((item) => ({
      title: item.name,
      url: item.url,
      domain: normalizeDomain(item.url),
      snippet: item.snippet
    }));
  }
}

export const searchDiscoveryProvider = new SearchDiscoveryProvider();
export default searchDiscoveryProvider;
