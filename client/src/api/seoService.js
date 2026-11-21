// SEO Provider API Service
import { API_BASE, getAuthHeaders } from '../config/api';

async function seoFetch(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: getAuthHeaders(options.headers)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || `SEO API request failed with status ${response.status}`);
    error.status = response.status;
    error.code = data.code;
    error.data = data;
    throw error;
  }

  return data;
}

export const seoService = {
  // Check provider status and credentials configuration
  async getProviderStatus() {
    return seoFetch('/seo/provider-status');
  },

  // Fetch SEO overview for active or specified website
  async getOverview({ websiteId, domain, force = false } = {}) {
    const params = new URLSearchParams();
    if (websiteId) params.append('websiteId', websiteId);
    if (domain) params.append('domain', domain);
    if (force) params.append('force', 'true');

    const query = params.toString() ? `?${params.toString()}` : '';
    return seoFetch(`/seo/overview${query}`);
  },

  // Fetch domain metrics (domain authority, IPs, subnets)
  async getDomainMetrics({ websiteId, domain, force = false } = {}) {
    const params = new URLSearchParams();
    if (websiteId) params.append('websiteId', websiteId);
    if (domain) params.append('domain', domain);
    if (force) params.append('force', 'true');

    const query = params.toString() ? `?${params.toString()}` : '';
    return seoFetch(`/seo/domain-metrics${query}`);
  },

  // Fetch detailed backlink summary
  async getBacklinkSummary({ websiteId, domain, force = false } = {}) {
    const params = new URLSearchParams();
    if (websiteId) params.append('websiteId', websiteId);
    if (domain) params.append('domain', domain);
    if (force) params.append('force', 'true');

    const query = params.toString() ? `?${params.toString()}` : '';
    return seoFetch(`/seo/backlink-summary${query}`);
  },

  // Phase 5: Fetch latest saved SEO snapshot from MongoDB
  async getLatestSnapshot({ websiteId, domain } = {}) {
    const params = new URLSearchParams();
    if (websiteId) params.append('websiteId', websiteId);
    if (domain) params.append('domain', domain);

    const query = params.toString() ? `?${params.toString()}` : '';
    return seoFetch(`/seo/snapshots/latest${query}`);
  },

  // Phase 5: Fetch historical SEO snapshots for a website
  async getSnapshotHistory({ websiteId, domain, limit = 30, startDate, endDate } = {}) {
    const params = new URLSearchParams();
    if (websiteId) params.append('websiteId', websiteId);
    if (domain) params.append('domain', domain);
    if (limit) params.append('limit', limit.toString());
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const query = params.toString() ? `?${params.toString()}` : '';
    return seoFetch(`/seo/snapshots/history${query}`);
  },

  // Phase 5: Trigger live SEO synchronization and persist to MongoDB
  async syncSeoData({ websiteId, domain } = {}) {
    const params = new URLSearchParams();
    if (websiteId) params.append('websiteId', websiteId);
    if (domain) params.append('domain', domain);

    const query = params.toString() ? `?${params.toString()}` : '';
    return seoFetch(`/seo/sync${query}`, {
      method: 'POST'
    });
  }
};
