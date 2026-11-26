// Reports & Analytics API Service for LINKORA
import { API_BASE, getAuthHeaders } from '../config/api';

async function analyticsFetch(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: getAuthHeaders(options.headers)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || `Analytics request failed with status ${response.status}`);
    error.status = response.status;
    error.code = data.code;
    error.data = data;
    throw error;
  }

  return data;
}

function buildQuery(websiteId, options = {}) {
  const params = new URLSearchParams();
  if (websiteId) params.append('websiteId', websiteId);
  if (options.range) params.append('range', options.range);
  if (options.startDate) params.append('startDate', options.startDate);
  if (options.endDate) params.append('endDate', options.endDate);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const analyticsService = {
  // 1. Overview KPIs & Comparison
  async getOverview(websiteId, options = {}) {
    return analyticsFetch(`/analytics/overview${buildQuery(websiteId, options)}`);
  },

  // 2. Backlink Growth Analytics
  async getBacklinks(websiteId, options = {}) {
    return analyticsFetch(`/analytics/backlinks${buildQuery(websiteId, options)}`);
  },

  // 3. Campaign Performance Analytics
  async getCampaigns(websiteId, options = {}) {
    return analyticsFetch(`/analytics/campaigns${buildQuery(websiteId, options)}`);
  },

  // 4. Prospecting Analytics
  async getProspects(websiteId, options = {}) {
    return analyticsFetch(`/analytics/prospects${buildQuery(websiteId, options)}`);
  },

  // 5. Outreach Analytics
  async getOutreach(websiteId, options = {}) {
    return analyticsFetch(`/analytics/outreach${buildQuery(websiteId, options)}`);
  },

  // 6. Actionable SEO Insights
  async getInsights(websiteId, options = {}) {
    return analyticsFetch(`/analytics/insights${buildQuery(websiteId, options)}`);
  },

  // 7. Executive Report Payload
  async getReport(websiteId, options = {}) {
    return analyticsFetch(`/analytics/report${buildQuery(websiteId, options)}`);
  },

  // 8. CSV Export URL helper
  getCsvExportUrl(websiteId, options = {}) {
    return `${API_BASE}/analytics/export/csv${buildQuery(websiteId, options)}`;
  }
};
