// Dashboard API Service - Dynamic Database-driven Dashboard
import { API_BASE, getAuthHeaders } from '../config/api';

async function dashboardFetch(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: getAuthHeaders(options.headers)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || `Dashboard request failed with status ${response.status}`);
    error.status = response.status;
    error.code = data.code;
    error.data = data;
    throw error;
  }

  return data;
}

export const dashboardService = {
  // Primary unified dynamic dashboard endpoint
  async getDashboardData(websiteId) {
    const path = websiteId ? `/dashboard/${websiteId}` : '/dashboard';
    return dashboardFetch(path);
  },

  // Legacy overview
  async getOverview(websiteId) {
    const query = websiteId ? `?websiteId=${websiteId}` : '';
    return dashboardFetch(`/dashboard/overview${query}`);
  },

  // Growth chart data
  async getBacklinkGrowth(websiteId) {
    const query = websiteId ? `?websiteId=${websiteId}` : '';
    return dashboardFetch(`/dashboard/backlink-growth${query}`);
  },

  // Recent backlinks
  async getRecentBacklinks(websiteId, limit = 5) {
    const params = new URLSearchParams();
    if (websiteId) params.append('websiteId', websiteId);
    if (limit) params.append('limit', limit.toString());
    return dashboardFetch(`/dashboard/recent-backlinks?${params.toString()}`);
  },

  // Activity feed
  async getRecentActivity(websiteId) {
    const query = websiteId ? `?websiteId=${websiteId}` : '';
    return dashboardFetch(`/dashboard/recent-activity${query}`);
  },

  // Alerts
  async getAlerts(websiteId) {
    const query = websiteId ? `?websiteId=${websiteId}` : '';
    return dashboardFetch(`/dashboard/alerts${query}`);
  }
};
