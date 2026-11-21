// Frontend API Service Layer with Graceful Host & Proxy Resolution
import { API_BASE } from '../config/api';

/**
 * Generic fetch wrapper with timeout and error handling
 */
async function fetchJson(endpoint, options = {}) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      credentials: 'include',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.warn(`[API] Endpoint ${endpoint} failed or timed out:`, err.message);
    throw err;
  }
}

export const apiService = {
  // Health Check
  async getHealth() {
    return fetchJson('/health');
  },

  // Dashboard Overview
  async getOverview(website = 'growthlabs.io', range = '30d') {
    return fetchJson(`/dashboard/overview?website=${encodeURIComponent(website)}&range=${encodeURIComponent(range)}`);
  },

  // Backlink Growth Series
  async getBacklinkGrowth(range = '30D') {
    return fetchJson(`/dashboard/backlink-growth?range=${encodeURIComponent(range)}`);
  },

  // Recent Backlinks
  async getRecentBacklinks(params = {}) {
    const query = new URLSearchParams(params).toString();
    return fetchJson(`/dashboard/recent-backlinks${query ? `?${query}` : ''}`);
  },

  // Recent Activities
  async getRecentActivity() {
    return fetchJson('/dashboard/recent-activity');
  },

  // Content Overview
  async getContentOverview() {
    return fetchJson('/dashboard/content-overview');
  },

  // Actionable Alerts
  async getAlerts() {
    return fetchJson('/dashboard/alerts');
  },

  // Create New Campaign
  async createCampaign(campaignData) {
    return fetchJson('/campaigns', {
      method: 'POST',
      body: JSON.stringify(campaignData)
    });
  }
};
