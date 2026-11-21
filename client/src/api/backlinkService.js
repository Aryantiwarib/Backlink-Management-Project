// Backlink API Service
import { API_BASE } from '../config/api';

async function backlinkFetch(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || `Backlink API request failed with status ${response.status}`);
    error.status = response.status;
    error.code = data.code;
    error.data = data;
    throw error;
  }

  return data;
}

export const backlinkService = {
  // Retrieve saved backlinks for a website with pagination, search, filters and sorting
  async getSavedBacklinks({
    websiteId,
    domain,
    page = 1,
    limit = 10,
    search,
    linkType,
    sourceDomain,
    targetUrl,
    provider,
    status,
    sortBy,
    sortOrder
  } = {}) {
    const params = new URLSearchParams();
    if (websiteId) params.append('websiteId', websiteId);
    if (domain) params.append('domain', domain);
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    if (search && search.trim()) params.append('search', search.trim());
    if (linkType && linkType !== 'all') params.append('linkType', linkType);
    if (sourceDomain && sourceDomain.trim()) params.append('sourceDomain', sourceDomain.trim());
    if (targetUrl && targetUrl.trim()) params.append('targetUrl', targetUrl.trim());
    if (provider && provider !== 'all') params.append('provider', provider);
    if (status && status !== 'all') params.append('status', status);
    if (sortBy) params.append('sortBy', sortBy);
    if (sortOrder) params.append('sortOrder', sortOrder);

    const query = params.toString() ? `?${params.toString()}` : '';
    return backlinkFetch(`/backlinks${query}`);
  },

  // Retrieve aggregated backlink stats (totals, unique domains, dofollow ratio, avg DA)
  async getBacklinkStats({ websiteId, domain } = {}) {
    const params = new URLSearchParams();
    if (websiteId) params.append('websiteId', websiteId);
    if (domain) params.append('domain', domain);

    const query = params.toString() ? `?${params.toString()}` : '';
    return backlinkFetch(`/backlinks/stats${query}`);
  },

  // Retrieve deep backlink analysis aggregations (top referring domains, anchor texts, DA tiers)
  async getBacklinkAnalysis({ websiteId, domain } = {}) {
    const params = new URLSearchParams();
    if (websiteId) params.append('websiteId', websiteId);
    if (domain) params.append('domain', domain);

    const query = params.toString() ? `?${params.toString()}` : '';
    return backlinkFetch(`/backlinks/analysis${query}`);
  },

  // Retrieve full details of a specific backlink by ID
  async getBacklinkById(id) {
    if (!id) throw new Error('Backlink ID is required.');
    return backlinkFetch(`/backlinks/${id}`);
  },

  // Add a manual backlink
  async createBacklink(payload) {
    return backlinkFetch('/backlinks', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // Delete a backlink record
  async deleteBacklink(id) {
    return backlinkFetch(`/backlinks/${id}`, {
      method: 'DELETE'
    });
  }
};
